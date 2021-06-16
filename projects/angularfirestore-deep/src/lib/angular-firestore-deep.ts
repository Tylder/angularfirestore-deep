import {combineLatest, from, Observable, of} from 'rxjs';
import {
  Action,
  AngularFirestore,
  AngularFirestoreCollection,
  AngularFirestoreDocument,
  DocumentChangeAction,
  DocumentChangeType,
  DocumentReference,
  DocumentSnapshotExists
} from '@angular/fire/firestore';
import {catchError, filter, map, mergeMap, switchMap, take, tap} from 'rxjs/operators';
import {moveItemInArray, transferArrayItem} from '@angular/cdk/drag-drop';

import firebase from 'firebase';
import {FirestoreItem, FirestoreItemFullWithIndex} from './models/firestoreItem';
import {SubCollectionQuery} from './sub-collection-query';
import {SubCollectionWriter} from './sub-collection-writer';

import {addCreatedDate, addModifiedDate, convertTimestampToDate, getRefFromPath} from './angularfirestore-helpers';
import WriteBatch = firebase.firestore.WriteBatch;
import FirestoreError = firebase.firestore.FirestoreError;
import DocumentData = firebase.firestore.DocumentData;


/** Used as a wrapper for adding a document, either doc or path must be specified, helps when adding multiple */
export interface AddDocumentWrapper<A> {
  /** The data to be added */
  data: A;

  /** AngularFirestoreDocument of the Document */
  docFs?: AngularFirestoreDocument;

  /** The path to the Document */
  path?: string;
}


/**
 * Action to be taken by listener if the document does not exist.
 */
export enum DocNotExistAction {
  /** returns a null object */
  RETURN_NULL,

  /** return all the extras such as ref, path and so on but no data, kinda just ignores that the doc isn't there */
  RETURN_ALL_BUT_DATA,

  /** do not return at all until it does exist */
  FILTER,

  /** return doc not found error 'doc_not_found' */
  THROW_DOC_NOT_FOUND,
}


/** Used internally */
interface CurrentDocSubCollectionSplit {
  /** contains the document that is considered the current */
  currentDoc: FirestoreItem;
  /** sub collections of current document */
  subCollections: {[index: string]: any};
}


/**
 * Main Class.
 *
 *
 *
 */
export class AngularFirestoreDeep {

  /**
   * Constructor for AngularFirestoreWrapper
   *
   * @param ngFirestore The AngularFirestore injected from an Angular Class
   * @param defaultDocId The default name of any Document when no name is given
   */
  constructor(private ngFirestore: AngularFirestore,
              private defaultDocId: string = 'data') {}

  /* ----------  LISTEN -------------- */

  /**
   * Same as AngularFirestoreDocument.snapshotChanges but it adds the properties in FirebaseDbItem
   * and also allows for to choose action to take when document does not exist
   *
   * Important to understand this is will trigger for every change/update on the document we are listening to.
   *
   * @param docFs AngularFirestoreDocument that will be listend to
   * @param actionIfNotExist Action to take if document does not exist
   */
  public listenForDoc$<A extends FirestoreItem>(docFs: AngularFirestoreDocument<FirestoreItem>,
                                                actionIfNotExist: DocNotExistAction = DocNotExistAction.RETURN_ALL_BUT_DATA):
    Observable<A> {
    /**
     * Returns an observable that will emit whenever the ref changes in any way.
     * Also adds the id and ref to the object.
     */
    const res$ = docFs.snapshotChanges().pipe(
      // mergeMap((action) => {
      //   if (!action.payload.exists) { return throwError('Document Does not exists'); }
      //   else { return of(action); }
      // }),

      tap((action: Action<DocumentSnapshotExists<A>>) => {
        if (!action.payload.exists && actionIfNotExist === DocNotExistAction.THROW_DOC_NOT_FOUND) {
          throw new Error('doc_not_found');
        }
      }),

      filter((action: Action<DocumentSnapshotExists<A>>) => {
        return !(!action.payload.exists && actionIfNotExist === DocNotExistAction.FILTER);
      }),
      map((action: Action<DocumentSnapshotExists<A>>) => {

        if (action.payload.exists || actionIfNotExist === DocNotExistAction.RETURN_ALL_BUT_DATA) {
          const data = action.payload.data() as A;
          // const payload: DocumentSnapshotExists<DocumentData> = action.payload as DocumentSnapshotExists<DocumentData>;
          // @ts-ignore
          const id = action.payload.id;
          // @ts-ignore
          const docRef = action.payload.ref;
          const path = docRef.path;
          const _docFs = this.ngFirestore.doc(path);
          const isExists: boolean = action.payload.exists;

          // const afDocRef = this.fireStore.doc<A>(docRef.path) as AngularFirestoreDocument;  // TODO make sure this also copies the query
          return { ...data, id, path, ref: docRef, docFs: _docFs, isExists };
        } else if (actionIfNotExist === DocNotExistAction.RETURN_NULL) { /* doc doesn't exist */
          return null;
        }
      }),
      map((data) => {
        if (data != null) {
          return convertTimestampToDate(data);
        } else {
          return data;
        }
      }),

    ) as Observable<A>;

    return this.handleRes$<A>(res$, 'listenForDoc$', {docFs});
  }

  /**
   * Same as AngularFirestoreCollection.snapshotChanges but it adds the properties in FirebaseDbItem.
   *
   * Important to understand this is will trigger for every change/update on any of the documents we are listening to.
   * That means that if any document we are listening to is changed the entire object will be triggered containing the updated data.
   *
   *
   *    Example usage.
   *
   *    ngFirestoreDeep: AngularFirestoreDeep;  //  AngularFirestoreDeep variable
   *    restaurantCollectionFs = this.ngFireStore.collection('restaurants'); // AngularFirestoreCollectionRef to restaurants
   *
   *    constructor(private ngFireStore: AngularFirestore) {
   *        this.ngFirestoreDeep = new AngularFirestoreDeep(ngFireStore);  //  initialize AngularFireStoreDeep with AngularFirestore
   *    }
   *
   *    listenForRestaurants$(): Observable<RestaurantItem[]> {
   *        return this.ngFirestoreDeep.listenForCollection$<RestaurantItem>(this.restaurantCollectionFs);
   *    }
   *
   *    If you do not wish to listen for changes and only care about getting the values once
   *
   *    getRestaurants$(): Observable<RestaurantItem[]> {
   *        return this.ngFirestoreDeep.listenForCollection$<RestaurantItem>(this.restaurantCollectionFs).pipe(
   *          take(1)
   *        );
   *    }
   *
   *
   * @param collectionFs the AngularFirestoreCollection which will be listened to
   * @param documentChangeTypes list of DocumentChangeType that will be listened to, if null listen to all
   */
  public listenForCollection$<A extends FirestoreItem>(collectionFs: AngularFirestoreCollection<FirestoreItem>,
                                                       documentChangeTypes?: DocumentChangeType[]): Observable<A[]> {
    /**
     * Returns an observable that will emit whenever the ref changes in any way.
     * Also adds the id and ref to the object.
     */

    if (documentChangeTypes === undefined || documentChangeTypes === null || documentChangeTypes.length <= 0) { documentChangeTypes = ['added', 'removed', 'modified']; }

    const res$ = collectionFs.snapshotChanges().pipe(

      map((actions: DocumentChangeAction<FirestoreItem>[]) => actions.filter(a => {
        return documentChangeTypes.includes(a.type);
      })),
      map((actions: DocumentChangeAction<FirestoreItem>[]) => actions.map(a => {
        const data = a.payload.doc.data() as A;

        const id = a.payload.doc.id;
        const docRef = a.payload.doc.ref;
        const path = docRef.path;
        const _docFs = this.ngFirestore.doc(path);
        // const afDocRef = this.fireStore.doc<A>(docRef.path) as AngularFirestoreDocument; // TODO make sure this also copies the query
        return { ...data, id, path, ref: docRef, docFs: _docFs };

      })),
      map((datas: A[]) => datas.map(data => {
        return convertTimestampToDate(data);
      }))
    ) as Observable<A[]>;

    return this.handleRes$<A[]>(res$, 'listenForCollection$', {collectionFs, listenToTypes: documentChangeTypes});
  }


  /**
   *
   * Allows for listening to documents and collections n deep up to the firestore max of 100 levels.
   *
   * Triggers for any change in any document that is listened to.
   *
   *
   * E.x:
   *      const subCollectionQueries: SubCollectionQuery[] = [
   *         { name: 'data' },
   *         { name: 'secure' },
   *         { name: 'variants' },
   *         { name: 'images',
   *           queryFn: ref => ref.orderBy('index'),
   *           collectionWithNames: [
   *             { name: 'secure'}
   *           ]
   *         },
   *     ];
   *
   *     this.listenForDocAndSubCollections<Product>(docFs, collections)
   *
   * Wrapper for listenForDocDeepRecursiveHelper$ so that we can cast the return to the correct type
   * All logic is in listenForDocDeepRecursiveHelper$.
   *
   * @param docFs - a docFs with potential queryFn
   * @param subCollectionQueries - see example
   */
  public listenForDocDeep$<A extends FirestoreItem>(docFs: AngularFirestoreDocument,
                                                    subCollectionQueries: SubCollectionQuery[] = []): Observable<A> {

    const res$ = this.listenForDocDeepRecursiveHelper$(docFs, subCollectionQueries).pipe(
      map(data => data as A)
    );

    return this.handleRes$(res$, 'listenForDocDeep$', {docFs, subCollectionQueries}, null, 'Failed To read doc');
  }

  /**
   * DO NOT CALL THIS METHOD, meant to be used solely by listenForDocAndSubCollections$
   */
  protected listenForDocDeepRecursiveHelper$<A extends FirestoreItem>(
    docFs: AngularFirestoreDocument,
    subCollectionQueries: SubCollectionQuery[] = [],
    actionIfNotExist: DocNotExistAction = DocNotExistAction.RETURN_NULL): Observable<FirestoreItem> {

    /* Listen for the docFs*/
    return this.listenForDoc$(docFs, actionIfNotExist).pipe(
      //
      // catchError(err => {
      //   if (err === 'Document Does not exists') { return of(null); } /* if a doc is deleted we just skip it */
      //   else { throw err; }
      // }),

      filter(doc => doc !== null),

      mergeMap((item: FirestoreItem) => {

        if (item === null) { return of(item); }
        if (subCollectionQueries.length <= 0) { return of(item); }

        const collectionListeners: Array<Observable<any>> = [];

        /* Iterate over each sub collection we have given and create collection listeners*/
        subCollectionQueries.forEach(subCollectionQuery => {

          // console.log(subCollectionQuery);

          const collectionFs = docFs.collection(subCollectionQuery.name, subCollectionQuery.queryFn);
          // const collectionFs = this.firestore.docFs(item.path).subCollectionQuery(subCollectionQuery.name, subCollectionQuery.queryFn);

          const collectionListener = this.listenForCollection$(collectionFs, null).pipe(
            // tap(d => console.log(d)),
            // filter(docs => docs.length > 0), // skip empty collections or if the subCollectionQuery doesnt exist
            /* Uncomment to see data on each update */
            // tap(d => console.log(d)),

            /* Listen For and Add any Potential Sub Docs*/
            mergeMap((docs: FirestoreItem[]) => {
              if (!subCollectionQuery.subCollectionQueries) { return of(docs); }

              const docListeners: Array<Observable<any>> = [];

              docs.forEach(d => {
                const subDocFs = this.ngFirestore.doc(d.path);
                const subDocAndCollections$ = this.listenForDocDeepRecursiveHelper$(subDocFs,
                  subCollectionQuery.subCollectionQueries).pipe(
                  // tap(subDoc => console.log(subDoc)),
                  // filter(subDoc => subDoc !== null),
                  map((subDoc: FirestoreItem) => {
                    return {...d, ...subDoc } as FirestoreItem;
                  }),
                  // tap(val => console.log(val))
                );
                docListeners.push(subDocAndCollections$);
              });

              // console.log(docListeners);

              if (docListeners.length <= 0) { return of([]); } /* subCollectionQuery is empty or doesnt exist */

              return combineLatest(docListeners).pipe(
                // tap(val => console.log(val))
              );
            }), /* End of Listening for sub docs */
            // tap(val => console.log(val)),

            /* If docs.length === 1 and the id is defaultDocId or the given docId it means we are in a sub subCollectionQuery
            and we only care about the data. So we remove the array and just make it one object with the
            subCollectionQuery name as key and docs[0] as value */
            map((docs: FirestoreItem[]) => {
              const docId = subCollectionQuery.docId !== undefined ? subCollectionQuery.docId : this.defaultDocId;

              if (docs.length === 1 && docs[0].id === docId) { return {[subCollectionQuery.name]: docs[0]}; }
              else { return {[subCollectionQuery.name]: docs}; }
            }),
            // tap(d => console.log(d)),
          );

          collectionListeners.push(collectionListener);
        });

        /* Finally return the combined collection listeners*/
        return combineLatest(collectionListeners).pipe(
          map((datas: Array<any>) => {
            const datasMap = {};

            datas.forEach((collection) => {

              for (const [key, value] of Object.entries(collection)) {
                datasMap[key] = value;
              }
            });
            return datasMap;
          }),

          map((data: DocumentData) => {
            return {...item, ...data};
          }),
          // tap(data => console.log(data)),
        );
      })
    );
  }


  /**
   * Listens for collections inside collections with the same name to an unlimited depth and returns all of it as an array.
   */
  public listenForCollectionRecursively$<A extends FirestoreItem>(path: string,
                                                                  collectionKey: string,
                                                                  orderKey?: string): Observable<any> {
    let ref;

    if (orderKey != null) {
      ref = this.ngFirestore.collection(path, r => r.orderBy(orderKey));
    } else {
      ref = this.ngFirestore.collection(path);
    }

    return this.listenForCollection$<A>(ref, null).pipe(
      mergeMap((items: A[]) => {

        if (items.length <= 0) { return of([]); } // TODO  perhaps make this throw an error so that we can skip it

        // if (items.length <= 0) { throwError('No more '); }

        const nextLevelObs: Array<Observable<A>> = [];

        for (const item of items) {


          const nextLevelPath = this.ngFirestore.doc(item.path).collection(collectionKey).ref.path;  // one level deeper

          const nextLevelItems$ = this.listenForCollectionRecursively$(nextLevelPath, collectionKey, orderKey).pipe(
            map((nextLevelItems: A[]) => {
              if (nextLevelItems.length > 0) { return {...item, [collectionKey]: nextLevelItems } as A; }
              else {  return {...item} as A; }  // dont include an empty array
            }),
          );
          nextLevelObs.push(nextLevelItems$);
        }

        return combineLatest(nextLevelObs).pipe(
          tap(val => console.log(val))
        );
      }),

    );
  }

  /* ----------  ADD -------------- */

  /**
   * A replacement/extension to the AngularFirestoreCollection.add.
   * Does the same as AngularFirestoreCollection.add but can also add createdDate and modifiedDate and returns
   * the data with the added properties in FirebaseDbItem
   *
   * Used internally
   *
   * @param data the data to be added to the document, cannot contain types firestore won't allow
   * @param collectionFs the AngularFirestoreCollection where the document should be added
   * @param isAddDates if true adds modifiedDate and createdDate to the data
   * @param id if given the added document will be given this id, otherwise a random unique id will be used.
   */
  protected addSimple$<A extends DocumentData>(data: A, collectionFs: AngularFirestoreCollection, isAddDates: boolean = true, id?: string):
    Observable<A> {

    return of(null).pipe(
      mergeMap(() => {
        let res$: Observable<any>;

        if (isAddDates) {
          data = addCreatedDate(data);
          data = addModifiedDate(data);
        }

        if (id !== undefined) { res$ = from(collectionFs.doc(id).set(data)); }
        else { res$ = from(collectionFs.add(data)); }

        res$ = res$.pipe(
          // tap(() => this.snackBar.open('Success', 'Added', {duration: 1000})),
          // tap(ref => console.log(ref)),
          // tap(() => console.log(data)),
          map((ref: DocumentReference) => {
            if (id === undefined) {
              return {...data, id: ref.id, path: ref.path, ref, docFs: this.ngFirestore.doc(ref.path) };
            } else {
              const path = collectionFs.ref.path + '/' + id;
              return {...data, id, path, docFs: this.ngFirestore.doc(path) };
            }
          }),
        );

        return this.handleRes$(res$, 'add$', {data, collectionFs, id}, 'Document Added Successfully', 'Document failed to add').pipe(
          take(1) /* No need to unsub */
        );
      })
    );
  }

  /**
   * Add document to firestore and split it up into sub collection.
   *
   * @param data the data to be saved
   * @param collectionFs AngularFirestoreCollection reference to where on firestore the item should be saved
   * @param subCollectionWriters see documentation for SubCollectionWriter for more details on how these are used
   * @param isAddDates if true 'createdDate' and 'modifiedDate' is added to the data
   * @param docId If a docId is given it will use that specific id when saving the doc, if no docId is given a ranom id will be used.
   */
  public addDeep$<A extends FirestoreItem>(data: A,
                                           collectionFs: AngularFirestoreCollection,
                                           subCollectionWriters: SubCollectionWriter[] = [],
                                           isAddDates: boolean = true,
                                           docId?: string): Observable<A> {

    const split = this.splitDataIntoCurrentDocAndSubCollections(data, subCollectionWriters);
    const currentDoc = split.currentDoc;
    const subCollections = split.subCollections;

    // console.log(currentDoc, subCollections);

    // console.log(Object.entries(subCollections).keys(), Object.entries(subCollections).values());

    const res$ = this.addSimple$<A>(currentDoc as A, collectionFs, isAddDates, docId).pipe(
      // tap(val => console.log(val)),

      /* Add Sub/sub collections*/
      mergeMap((currentData: A) => {

        const subWriters: Array<Observable<any>> = [];

        for (const [subCollectionKey, subCollectionValue] of Object.entries(subCollections)) {
          let subSubCollectionWriters: SubCollectionWriter[]; // undefined in no subCollectionWriters
          let subDocId: string;

          if (subCollectionWriters) {
            subSubCollectionWriters = subCollectionWriters.find(subColl => subColl.name === subCollectionKey).subCollectionWriters;
            subDocId = subCollectionWriters.find(subColl => subColl.name === subCollectionKey).docId;
          }

          const subCollectionFs = this.ngFirestore.doc(currentData.path).collection(subCollectionKey);

          /* Handle array and object differently
          * For example if array and no docId is given it means we should save each entry as a separate doc.
          * If a docId is given should save it using that docId under a single doc.
          * If not an array it will always be saved as a single doc, using this.defaultDocId as the default docId if none is given */
          if (Array.isArray(subCollectionValue)) {
            if (subDocId !== undefined) { /* not undefined so save it as a single doc under that docId */

              /* the pipe only matters for the return subCollectionValue not for writing the data */
              const subWriter = this.addDeep$(subCollectionValue as FirestoreItem,
                                              subCollectionFs, subSubCollectionWriters, isAddDates, subDocId).pipe(
                map(item => {
                  // return {[key]: item};
                  return {key: subCollectionKey, value: item}; /* key and subCollectionValue as separate k,v properties */
                })
              );
              subWriters.push(subWriter);

            } else { /* docId is undefined so we save each object in the array separate */
              subCollectionValue.forEach((arrayValue: FirestoreItem) => {

                /* the pipe only matters for the return subCollectionValue not for writing the data */
                const subWriter = this.addDeep$(arrayValue, subCollectionFs, subSubCollectionWriters, isAddDates).pipe(
                  map(item => {
                    // return {[key]: [item]};
                    /* key and subCollectionValue as separate k,v properties -- subCollectionValue in an array */
                    return {key: subCollectionKey, value: [item]};
                  })
                );

                subWriters.push(subWriter);
              });
            }
          } else { /* Not an array so a single Object*/
            subDocId = subDocId !== undefined ? subDocId : this.defaultDocId;

            /* the pipe only matters for the return subCollectionValue not for writing the data */
            const subWriter = this.addDeep$(subCollectionValue, subCollectionFs, subSubCollectionWriters, isAddDates, subDocId).pipe(
              map(item => {
                // return {[key]: item};
                return {key: subCollectionKey, value: item}; /* key and subCollectionValue as separate k,v properties */
              })
            );

            subWriters.push(subWriter);
          }
        } /* end of iteration */

        if (subWriters.length > 0) { /* if subWriters.length > 0 it means we need to handle the subwriters */

          /* the pipe only matters for the return value not for writing the data */
          return combineLatest(subWriters).pipe(
            // tap(sub => console.log(sub)),

            // TODO super duper ugly way of joining the data together but I cannot think of a better way..also it doesnt really matter.
            // TODO The ugliness only relates to how the return object looks after we add, it has no effect on how the object is saved on
            // TODO firestore.

            map((docDatas: Array<Map<string, []>>) => { /* List of sub docs*/
              const groupedData = {};

              docDatas.forEach((doc: {[index: string]: any}) => { /* iterate over each doc */

                const key = doc.key;
                const value = doc.value;

                /* if groupedData has the key already it means that the several docs have the same key..so an array */
                if (groupedData.hasOwnProperty(key) && Array.isArray(groupedData[key])) {
                  /* groupedData[key] must be an array since it already exist..add this doc.value to the array */
                  (groupedData[key] as Array<any>).push(value[0]);
                } else {
                  groupedData[key] = value;
                }
              });

              return groupedData as object;
            }),

            // tap(groupedData => console.log(groupedData)),

            map((groupedData: A) => {
              return {...currentData, ...groupedData } as A;
            }),
            // tap(d => console.log(d)),
          );
        } else {
          return of(currentData);
        }
      })
    );

    return this.handleRes$(res$, 'addDeep$', {data, collectionFs, subCollectionWriters, docId}, 'Document Added Successfully', 'Document failed to add').pipe(
      // tap(d => console.log(d)),
      take(1) /* just to make sure it only emits once */
    );
  }


  /* ----------  EDIT -------------- */

  /**
   * clean FirestoreBaseItem properties from the data.
   * Usually done if you wish to save the data to firestore, since some FirestoreBaseItem properties are of non allowed types.
   *
   * Goes through each level and removes DbItemExtras
   * In case you wish to save the data
   *
   * @param data data to be cleaned
   * @param subCollectionWriters if the document has child documents the SubCollectionWriters are needed to locate them
   */
  public cleanExtrasFromData<A extends FirestoreItem>(data: A, subCollectionWriters: SubCollectionWriter[] = []): A {

    // const dataToBeCleaned = cloneDeep(data); /* clone data so we dont modify the original */
    // const dataToBeCleaned = data;
    return this.removeDataExtrasRecursiveHelper(data, subCollectionWriters) as A;
  }

  /**
   * Recursive method to clean FirestoreBaseItem properties from the dbItem
   *
   * @param dbItem the data to be cleaned
   * @param subCollectionWriters list of SubCollectionWriters to handle sub collections
   */
  protected removeDataExtrasRecursiveHelper<A extends FirestoreItem>(dbItem: A, subCollectionWriters: SubCollectionWriter[] = []): A {

    // const extraPropertyNames: string[] = Object.getOwnPropertyNames(new DbItemExtras());
    const extraPropertyNames: string[] = ['id', 'path', 'ref', 'docFs', 'isExists'];

    /* Current level delete */
    for (const extraPropertyName of extraPropertyNames) {
      delete dbItem[extraPropertyName];
    }

    subCollectionWriters.forEach(col => {
      if (Array.isArray(dbItem[col.name])) { /* property is array so will contain multiple docs */

        const docs: FirestoreItem[] = dbItem[col.name];
        docs.forEach((d, i) => {

          if (col.subCollectionWriters) {
            this.removeDataExtrasRecursiveHelper(d, col.subCollectionWriters);
          } else {
            /*  */
            for (const extraPropertyName of extraPropertyNames) {
              delete dbItem[col.name][i][extraPropertyName];
            }
          }
        });

      } else { /* not an array so a single doc*/

        if (col.subCollectionWriters) {
          this.removeDataExtrasRecursiveHelper(dbItem[col.name], col.subCollectionWriters);
        } else {
          for (const extraPropertyName of extraPropertyNames) {
            delete dbItem[col.name][extraPropertyName];
          }
        }

      }
    });

    return dbItem;

  }

  /**
   * Firestore doesn't allow you do change the name or move a doc directly so you will have to create a new doc under the new name
   * and then delete the old doc.
   * returns the new doc once the delete is done.
   *
   * @param docFs AngularFirestoreDocument to have its id changed
   * @param newId the new id
   * @param subCollectionQueries if the document has child documents the subCollectionQueries are needed to locate them
   * @param subCollectionWriters if the document has child documents the SubCollectionWriters are needed to add them back
   */
  public changeDocId$<A extends FirestoreItem>(docFs: AngularFirestoreDocument,
                                               newId: string,
                                               subCollectionQueries: SubCollectionQuery[] = [],
                                               subCollectionWriters: SubCollectionWriter[] = []): Observable<any> {

    const collectionFs: AngularFirestoreCollection = this.ngFirestore.collection(docFs.ref.parent);

    const res$ = this.listenForDocDeep$(docFs, subCollectionQueries).pipe(
      take(1),
      map((oldData: A) => this.cleanExtrasFromData(oldData, subCollectionWriters)),
      mergeMap((oldData: A) => {
        return this.addDeep$(oldData, collectionFs, subCollectionWriters, false, newId).pipe( /* add the data under id*/
          mergeMap(newData => { /* delete the old doc */
            return this.deleteDeep$(docFs, subCollectionQueries).pipe(
              map(() => newData) /* keep the new data */
            );
          }),
        );
      }),
      catchError(err => {
        console.log('Failed to Change Doc Id: ' + err);
        throw err;
      })
    );

    return this.handleRes$(res$,
      'changeDocName$',
      {docFs, subCollectionQueries, subCollectionWriters, newName: newId},
      'Failed to Change Doc Name'
    );
  }

  /**
   * Update document and child documents
   *
   * Be careful when updating a document of any kind since we allow partial data there cannot be any type checking prior to update
   * so its possible to introduce spelling mistakes on attributes and so forth
   *
   * @param data the data that is to be added or updated { [field: string]: any }
   * @param docFs AngularFirestoreDocument to be updated
   * @param subCollectionWriters if the data contains properties that should be placed in child collections and documents specify that here
   * @param isAddModifiedDate if true the modifiedDate property is added/updated on the affected documents
   */
  public updateDeep$<A extends DocumentData>(data: A,
                                             docFs: AngularFirestoreDocument,
                                             subCollectionWriters: SubCollectionWriter[] = [],
                                             isAddModifiedDate: boolean = true): Observable<any> {

    if (subCollectionWriters == null || subCollectionWriters.length === 0) {
      return this.updateSimple$(data, docFs, isAddModifiedDate); // no subCollectionWriters so just do a simple update
    }

    const batch = this.updateDeepToBatchHelper(data, docFs, subCollectionWriters, isAddModifiedDate);

    const res$ = this.batchCommit$(batch);

    return this.handleRes$(res$, 'updateDeep$', {data, docFs, subCollectionWriters}, 'Updated', 'Failed to Update Document').pipe(
      take(1) /* no need to unsub */
    );
  }

  /**
   * DO NOT CALL THIS METHOD, used by update deep
   */
  protected updateDeepToBatchHelper<A>(data: A,
                                       docFs: AngularFirestoreDocument,
                                       subCollectionWriters: SubCollectionWriter[] = [],
                                       isAddModifiedDate: boolean = true,
                                       batch?: WriteBatch): WriteBatch {

    if (batch === undefined) { batch = this.ngFirestore.firestore.batch(); }

    if (isAddModifiedDate) {
      data = addModifiedDate(data);
    }

    const split = this.splitDataIntoCurrentDocAndSubCollections(data, subCollectionWriters);
    const currentDoc = split.currentDoc;
    const subCollections = split.subCollections;

    // console.log(currentDoc, subCollections);
    batch.update(docFs.ref, currentDoc);

    for (const [subCollectionKey, subDocUpdateValue] of Object.entries(subCollections)) {

      let subSubCollectionWriters: SubCollectionWriter[]; // undefined in no subCollectionWriters
      let subDocId: string;

      if (subCollectionWriters) {
        subSubCollectionWriters = subCollectionWriters.find(subColl => subColl.name === subCollectionKey).subCollectionWriters;
        subDocId = subCollectionWriters.find(subColl => subColl.name === subCollectionKey).docId;
      }

      subDocId = subDocId !== undefined ? subDocId : this.defaultDocId; /* Set default if none given */

      const subDocFs = docFs.collection(subCollectionKey).doc(subDocId);

      batch = this.updateDeepToBatchHelper(subDocUpdateValue, subDocFs, subSubCollectionWriters, isAddModifiedDate, batch);
    }

    return batch;
  }

  /**
   * Used internally for updates that doesn't affect child documents
   */
  protected updateSimple$<A>(data: A, docFs: AngularFirestoreDocument, isAddModifiedDate: boolean = true): Observable<boolean> {
    /**
     * transforms the promise to an observable
     */
    return of(null).pipe(
      mergeMap(() => {
        let res$: Observable<any>;

        if (isAddModifiedDate) {
          data = addModifiedDate(data);
        }

        res$ = from(docFs.update(data));

        return this.handleRes$(res$, 'update$', {data, docFs}, 'Updated', 'Failed to Update Document').pipe(
          // take(1) /* no need to unsub */
        );
      }),
      take(1) /* just to make sure it only emits once */
    );
  }

  /**
   * Update the firestore document by path
   * Convenience method in case we do not have direct access to the AngularFirestoreDocument reference
   *
   * @param data the data that is to be added or updated { [field: string]: any }
   * @param path A string representing the path of the referenced document (relative to the root of the database).
   * @param subCollectionWriters if the data contains properties that should be placed in child collections and documents specify that here
   * @param isAddModifiedDate if true the modifiedDate property is added/updated on the affected documents
   */
  public updateDeepByPath$<A>(data: A,
                              path: string,
                              subCollectionWriters: SubCollectionWriter[] = [],
                              isAddModifiedDate: boolean = true): Observable<any> {
    const doc = this.ngFirestore.doc(path);
    return this.updateDeep$(data, doc, subCollectionWriters, isAddModifiedDate);
  }



  /**
   * Update/ add data to the firestore documents
   *
   * @param docsFs list of AngularFirestoreDocument to be have their data updated
   * @param data data to add/update
   * @param isAddModifiedDate if true the modifiedDate is added/updated
   */
  public updateMultiple$<A>(docsFs: AngularFirestoreDocument[], data: A, isAddModifiedDate: boolean = true): Observable<any> {
    const batch = this.ngFirestore.firestore.batch();

    if (isAddModifiedDate) {
      data = addModifiedDate(data);
    }

    docsFs.forEach((doc) => {
      batch.update(doc.ref, data);
    });

    return this.batchCommit$(batch);
  }

  /**
   * Update the firestore documents by paths
   *
   * @param path list of paths of documents to be have their data updated
   * @param data data to add/update
   * @param isAddModifiedDate if true the modifiedDate is added/updated
   */
  public updateMultipleByPaths$<A>(paths: string[], data: A, isAddModifiedDate: boolean = true): Observable<any> {
    const docsFs: AngularFirestoreDocument[] = [];

    paths.forEach(path => {
      docsFs.push(this.ngFirestore.doc(path));
    });

    return this.updateMultiple$<A>(docsFs, data, isAddModifiedDate);
  }

  /* Move Item in Array */

  public moveItemInArray$<A extends FirestoreItemFullWithIndex>(array: A[], fromIndex: number, toIndex: number): Observable<any> {
    // console.log(fromIndex, toIndex);

    if (fromIndex == null || toIndex == null || fromIndex === toIndex || array.length <= 0) { // we didnt really move anything
      return of(null);
    }

    const batch = this.getBatchFromMoveItemInIndexedDocs(array as FirestoreItemFullWithIndex[], fromIndex, toIndex);

    return this.batchCommit$(batch);
  }

  public getBatchFromMoveItemInIndexedDocs<A extends FirestoreItemFullWithIndex>(array: Array<A>,
                                                                                 fromIndex: number,
                                                                                 toIndex: number,
                                                                                 useCopy = false): firebase.firestore.WriteBatch {
    /**
     * Moved item within the same list so we need to update the index of all items in the list;
     * Use a copy if you dont wish to update the given array, for example when you watch to just listen for the change of the db..
     * The reason to not do this is because it takes some time for the db to update and it looks better if the list updates immediately.
     */

    const lowestIndex = Math.min(fromIndex, toIndex);
    const batch = this.ngFirestore.firestore.batch();

    if (fromIndex == null || toIndex == null || fromIndex === toIndex) { // we didnt really move anything
      return batch;
    }

    let usedArray: Array<A>;

    if (useCopy) {
      usedArray = Object.assign([], array);
    } else {
      usedArray = array;
    }

    // console.log(usedArray, array);

    moveItemInArray(usedArray, fromIndex, toIndex);

    const listSliceToUpdate: A[] = usedArray.slice(lowestIndex);

    let i = lowestIndex;
    for (const item of listSliceToUpdate) {
      const ref = getRefFromPath(item.path, this.ngFirestore) as DocumentReference;
      batch.update(ref, {index: i});
      i++;
    }

    return batch;
  }

  protected getBatchFromTransferItemInIndexedDocs<A extends FirestoreItemFullWithIndex>(
    previousArray: A[],
    currentArray: A[],
    previousIndex: number,
    currentIndex: number,
    additionalDataUpdateOnMovedItem?: {[key: string]: any},
    useCopy = false): firebase.firestore.WriteBatch {

    /**
     * Used mainly for drag and drop scenarios where we drag an item from one array to another and the the docs have an index attribute.
     */

    const batch = this.ngFirestore.firestore.batch();

    let usedPreviousArray: Array<A>;
    let usedCurrentArray: Array<A>;
    if (useCopy) {
      usedPreviousArray = Object.assign([], previousArray);
      usedCurrentArray = Object.assign([], currentArray);
    } else {
      usedPreviousArray = previousArray;
      usedCurrentArray = currentArray;
    }

    transferArrayItem(usedPreviousArray, usedCurrentArray, previousIndex, currentIndex);

    if (additionalDataUpdateOnMovedItem !== undefined) {
      const movedItem = currentArray[currentIndex];
      const movedPartRef = getRefFromPath(movedItem.path, this.ngFirestore) as DocumentReference;
      batch.update(movedPartRef, additionalDataUpdateOnMovedItem);
    }

    const currentArraySliceToUpdate: A[] = usedCurrentArray.slice(currentIndex);
    let i = currentIndex;
    for (const item of currentArraySliceToUpdate) {
      const ref = getRefFromPath(item.path, this.ngFirestore) as DocumentReference;
      batch.update(ref, {index: i});
      i++;
    }

    const prevArraySliceToUpdate: A[] = usedPreviousArray.slice(previousIndex);
    i = previousIndex;
    for (const item of prevArraySliceToUpdate) {
      const ref = getRefFromPath(item.path, this.ngFirestore) as DocumentReference;
      batch.update(ref, {index: i});
      i++;
    }

    return batch;
  }

  public getBatchFromDeleteItemInIndexedDocs<A extends FirestoreItemFullWithIndex>(array: A[]): firebase.firestore.WriteBatch {

    /**
     * Run this on collections with a fixed order using an index: number attribute;
     * This will update that index with the index in the collectionData, so it should be sorted by index first.
     * Basically needs to be run after a delete
     */

    const batch = this.ngFirestore.firestore.batch();

    array.forEach((item, index) => {
      if (item.index !== index) {
        const ref = getRefFromPath(item.path, this.ngFirestore) as DocumentReference;
        batch.update(ref, {index});
      }
    });

    return batch;
  }

  protected updateIndexAfterDeleteInIndexedDocs<A extends FirestoreItemFullWithIndex>(array: A[]): Observable<any> {
    const batch = this.getBatchFromDeleteItemInIndexedDocs(array);
    return this.batchCommit$(batch);
  }

  /* ----------  DELETE -------------- */

  /**
   * Delete document
   * Used internally
   *
   * @param docFs AngularFirestoreDocument that is to be deleted
   */
  protected deleteSimple$(docFs: AngularFirestoreDocument): Observable<any> {

    return of(null).pipe(
      mergeMap(() => {
        let res$: Observable<any>;
        res$ = from(docFs.delete());

        return this.handleRes$(res$, 'deleteSimple$', {docFs}, 'Deleted', 'Failed to Delete Document').pipe(
          take(1) /* no need to unsub*/
        );
      }),
      take(1)
    );
  }

  /**
   * Delete Document and child documents
   *
   * @param docFs AngularFirestoreDocument that is to be deleted
   * @param subCollectionQueries if the document has child documents the subCollectionQueries are needed to locate them
   */
  public deleteDeep$(docFs: AngularFirestoreDocument, subCollectionQueries: SubCollectionQuery[] = []): Observable<any> {

    if (subCollectionQueries == null || subCollectionQueries.length === 0) {
      return this.deleteSimple$(docFs);
    }

    // console.log('deleteDeep');
    const res$ = this.getFirestoreDocumentsDeep$(docFs, subCollectionQueries).pipe(
      switchMap((docList: AngularFirestoreDocument<DocumentData>[]) => this.deleteMultiple$(docList)),
      catchError((err) => { // TODO super ugly and I dont know why this error is thrown..still works
        if (err === 'Document Does not exists') { return of(null); }
        else { throw err; }
      }),
      take(1)
    );

    return this.handleRes$(res$, 'deleteDeep$', {docFs, subCollectionQueries}, 'Deleted', 'Failed to Delete');
  }

  /**
   * Delete Documents
   *
   * @param docsFs - A list of AngularFireDocument that are to be deleted
   */
  public deleteMultiple$(docsFs: AngularFirestoreDocument[]): Observable<any> {
    const batch = this.ngFirestore.firestore.batch();

    docsFs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    const res$ = this.batchCommit$(batch);

    return this.handleRes$(res$, 'deleteMultiple$', docsFs.map(doc => doc.ref.path), 'Deleted', 'Failed to Delete Multiple');
  }

  public deleteMultipleByPaths$(paths: string[]): Observable<any> {
    const docsFs: AngularFirestoreDocument[] = [];

    paths.forEach(path => {
      docsFs.push(this.ngFirestore.doc(path));
    });

    return this.deleteMultiple$(docsFs);
  }

  /**
   * Delete Documents and child documents
   *
   * @param docsFs - A list of AngularFireDocument that are to be deleted
   * @param subCollectionQueries if the document has child documents the subCollectionQueries are needed to locate them
   */
  public deleteMultipleDeep$(docsFs: AngularFirestoreDocument[], subCollectionQueries: SubCollectionQuery[] = []): Observable<any> {

    if (subCollectionQueries == null || subCollectionQueries.length === 0) {
      return this.deleteMultiple$(docsFs);
    }

    const mainDocLists$: Array<Observable<any>> = [];

    docsFs.forEach(doc => {
      const docList$ = this.getFirestoreDocumentsDeep$(doc, subCollectionQueries);
      mainDocLists$.push(docList$);
    });

    return combineLatest(mainDocLists$).pipe(
      // tap(lists => console.log(lists)),
      map((lists: [any]) => {
        let mainDocFsList: AngularFirestoreDocument[] = [];
        lists.forEach(list => {
          mainDocFsList = mainDocFsList.concat(list);
        });
        return mainDocFsList;
      }),
      // tap(lists => console.log(lists)),
      switchMap((docFsList: AngularFirestoreDocument[]) => this.deleteMultiple$(docFsList)),
      catchError((err) => { // TODO super ugly and I dont know why this error is thrown..still works
        if (err === 'Document Does not exists') { return of(null); }
        else { throw err; }
      })
    );
  }


  /**
   * Delete firestore document by path
   * Convenience method in case we do not have direct access to the AngularFirestoreDocument reference
   *
   * @param path A string representing the path of the referenced document (relative to the root of the database).
   * @param subCollectionQueries if the document has child documents the subCollectionQueries are needed to locate them
   */
  public deleteDocByPath$(path: string, subCollectionQueries: SubCollectionQuery[] = []): Observable<any> {
    const doc = this.ngFirestore.doc(path);
    return this.deleteDeep$(doc, subCollectionQueries);
  }

  /**
   * Delete document by FirestoreItem
   *
   * Convenience method that works the same as deleteDeep$ but takes a FirestoreItem to be deleted
   *
   * @param item FirestoreItem to be deleted
   * @param subCollectionQueries if the document has child documents the subCollectionQueries are needed to locate them
   */
  public deleteDeepByItem$(item: FirestoreItem, subCollectionQueries: SubCollectionQuery[] = []): Observable<any> {

    // console.log('deleteDeepByItem$');

    const docsFs = this.getAngularFirestoreDocumentsFromDbItem(item, subCollectionQueries);

    const res$ = this.deleteMultiple$(docsFs).pipe(
      catchError((err) => { // TODO super ugly and I dont know why this error is thrown..still works
        if (err === 'Document Does not exists') { return of(null); }
        else { throw err; }
      }),
      take(1)
    );

    return this.handleRes$(res$,
      'deleteDeepByItem$',
      {item, subCollectionQueries},
      'Deleted',
      'Failed to Delete'
    );
  }

  /* ----------  OTHER -------------- */

  /**
   * Returns an Observable containing a list of AngularFirestoreDocument found under the given docFs using the SubCollectionQuery[]
   * Mainly used to delete a docFs and its sub docs
   * @param docFs: AngularFirestoreDocument
   * @param subCollectionQueries: SubCollectionQuery[]
   */
  protected getFirestoreDocumentsDeep$<A extends FirestoreItem>(docFs: AngularFirestoreDocument,
                                                                subCollectionQueries: SubCollectionQuery[] = []):
    Observable<AngularFirestoreDocument<A>[]> {

    return this.listenForDocDeep$(docFs, subCollectionQueries).pipe(
      take(1),
      map(item => this.getPathsFromDbItemDeepRecursiveHelper(item, subCollectionQueries)),
      // tap(pathList => console.log(pathList)),
      map((pathList: string[]) => {
        const docFsList: AngularFirestoreDocument<A>[] = [];
        pathList.forEach(path => docFsList.push(this.ngFirestore.doc<A>(path)));
        return docFsList;
      }),
      // tap(item => console.log(item)),
    );
  }

  /**
   * Used by deleteDeepByItem$ to get all the AngularFirestoreDocuments to be deleted
   * including child documents using SubCollectionQueries
   *
   * Internal use
   * @param dbItem FirestoreItem from where we get the AngularFirestoreDocuments
   * @param subCollectionQueries if the dbItem has child documents the subCollectionQueries are needed to locate them
   */
  protected getAngularFirestoreDocumentsFromDbItem<A extends FirestoreItem>(
    dbItem: FirestoreItem,
    subCollectionQueries: SubCollectionQuery[] = []): AngularFirestoreDocument[] {

    const pathList = this.getPathsFromDbItemDeepRecursiveHelper(dbItem, subCollectionQueries);

    const docFsList: AngularFirestoreDocument[] = [];
    pathList.forEach(path => docFsList.push(this.ngFirestore.doc(path)));
    return docFsList;
  }

  /**
   * DO NOT CALL THIS METHOD, its meant as a support method for getDocs$
   */
  protected getPathsFromDbItemDeepRecursiveHelper<A extends FirestoreItem>(dbItem: FirestoreItem,
                                                                           subCollectionQueries: SubCollectionQuery[] = []): string[] {

    if (subCollectionQueries == null || subCollectionQueries.length === 0) {
      return [dbItem.path];
    }
    let pathList: string[] = [];
    pathList.push(dbItem.path);

    subCollectionQueries.forEach(col => {
      if (Array.isArray(dbItem[col.name])) { /* property is array so will contain multiple docs */

        const docs: FirestoreItem[] = dbItem[col.name];
        docs.forEach(d => {

          if (col.subCollectionQueries) {
            pathList = pathList.concat(this.getPathsFromDbItemDeepRecursiveHelper(d, col.subCollectionQueries));
          } else {
            pathList.push(d.path);
          }
        });

      } else { /* not an array so a single doc*/

        if (col.subCollectionQueries) {
          pathList = pathList.concat(this.getPathsFromDbItemDeepRecursiveHelper(dbItem, col.subCollectionQueries));
        } else {
          const item = (dbItem[col.name] as FirestoreItem);
          if (item != null && 'path' in item) {
            pathList.push(item.path);
          }
          // const path = (dbItem[col.name] as FirestoreItem).path;
        }

      }
    });

    // console.log(pathList);

    return pathList;
  }

  /**
   * DO  NOT  CALL THIS METHOD, used in addDeep and updateDeep to split the data into currentDoc and subCollections
   * Onyl goes one sub level deep;
   */
  protected splitDataIntoCurrentDocAndSubCollections<A extends FirestoreItem>(
    data: A,
    subCollectionWriters: SubCollectionWriter[] = []): CurrentDocSubCollectionSplit {

    /* Split data into current doc and sub collections */
    let currentDoc: { [index: string]: any; } = {};
    const subCollections: { [index: string]: any; }  = {};

    /* Check if the key is in subcollections, if not place it in currentDoc, else subCollections*/
    for (const [key, value] of Object.entries(data)) {
      // console.log(key, value);
      if (subCollectionWriters) {
        const subCollectionWriter: SubCollectionWriter = subCollectionWriters.find(subColl => subColl.name === key);

        if (subCollectionWriter) {
          subCollections[key] = value;
        } else {
          currentDoc[key] = value;
        }
      }
      else {
        currentDoc = data;
      }
    }

    return {
      currentDoc,
      subCollections
    } as CurrentDocSubCollectionSplit;
  }



  /**
   * Turn a batch into an Observable instead of Promise.
   *
   * For some reason angularfire returns a promise on batch.commit() instead of an observable like for
   * everything else.
   *
   * This method turns it into an observable
   */
  protected batchCommit$(batch: firebase.firestore.WriteBatch): Observable<any> {
    return of(null).pipe(
      mergeMap(() => {
        let res$: Observable<any>;
        res$ = from(batch.commit());

        return this.handleRes$(res$, 'batchCommit', {batch}, 'Updated',
                  'Failed to Update Documents').pipe(
          // take(1) /* no need to unsub*/
        );
      }),
      take(1)
    );
  }


  /**
   *
   * TODO make this user defined via callback
   *
   */
  protected handleRes$<A>(result$: Observable<A>, name: string, data: {[key: string]: any}, successMessage?: string, errorMessage?: string):
    Observable<A> {
    return result$.pipe(
      // tap(val => console.log(val)),
      tap(() => {
        // if (successMessage != null) { (this.snackBar.open('Success', successMessage, {duration: 1000})); }
      }),
      // map(() => true),
      catchError((err: FirestoreError) => {
        console.error(name, data, err);
        // if (errorMessage != null) { this.snackBar.open('Error', errorMessage + '-' +  err.code, {duration: 1000}); }
        throw err;
      }),

    );
  }
}
