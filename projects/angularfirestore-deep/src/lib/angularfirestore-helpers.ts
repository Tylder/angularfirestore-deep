/** Helper method to get reference from path, the path can be either to a Document or Collection */
import {
  Action,
  AngularFirestore,
  AngularFirestoreCollection,
  AngularFirestoreDocument,
  DocumentData,
  DocumentReference
} from '@angular/fire/firestore';
import {CollectionReference, DocumentSnapshot} from '@angular/fire/firestore/interfaces';
import {FirestoreItem} from './models/firestoreItem';
import {map, take} from 'rxjs/operators';
import firebase from 'firebase';
import {Observable} from 'rxjs';

/** Helper method to get reference from path, the path can be either to a Document or Collection */
export function getRefFromPath(path: string, ngFirestore: AngularFirestore): DocumentReference | CollectionReference {
  const pathSegmentAmount: number = path.split('/').length;
  if (pathSegmentAmount % 2 === 0) { // even number means doc
    return ngFirestore.doc(path).ref;
  } else { // odd meaning collection
    return ngFirestore.collection(path).ref;
  }
}

/** If given the path to a Document it returns the parent AngularFirestoreCollection,
 * if given a path to a collection it just turns it into a AngularFirestoreCollection
 */
export function getCollectionFsFromPath<A extends FirestoreItem>(path: string,
                                                                 ngFirestore: AngularFirestore): AngularFirestoreCollection<A> {
  const collectionPathSegments = path.split('/');
  const pathSegmentAmount: number = path.split('/').length;

  if (pathSegmentAmount % 2 === 0) { // even number means doc
    collectionPathSegments.pop(); // delete last
    return ngFirestore.collection(collectionPathSegments.join('/'));
  }
  else {
    return ngFirestore.collection(path);
  }
}

/**
 * Get AngularFirestoreDocument from path
 *
 * @param path the path to the AngularFirestoreDocument
 * @param ngFirestore the AngularFirestore object
 */
export function getDocFsFromPath(path: string, ngFirestore: AngularFirestore): AngularFirestoreDocument {
  return ngFirestore.doc(path);
}

/**
 * Returns the next higher level doc from either a collection or a doc path
 *
 * @param path the path to the AngularFirestoreDocument
 * @param ngFirestore the AngularFirestore object
 */
export function getParentDocFsFromPath<A extends FirestoreItem>(path: string, ngFirestore: AngularFirestore): AngularFirestoreDocument<A> {

  let pathSegments: string[] =  path.split('/');
  const pathSegmentAmount: number = pathSegments.length;

  if (pathSegmentAmount % 2 === 0) { // even number means doc, so we need to remove doc and the collection to get the parent doc
    pathSegments = pathSegments.slice(0, pathSegments.length - 2);
    return ngFirestore.doc(pathSegments.join('/'));
  }
  else { // odd, so its a colletion
    pathSegments = pathSegments.slice(0, pathSegments.length - 1);
    return ngFirestore.doc(pathSegments.join('/'));
  }
}

/**
 * Simple check if Document exists, returns true if Document exist
 *
 * @param docFs AngularFirestoreDocument to check if exist
 */
export function isDocExist$(docFs: AngularFirestoreDocument<DocumentData>): Observable<boolean> {
  return docFs.snapshotChanges().pipe(
    take(1),
    map((action: Action<DocumentSnapshot<DocumentData>>) => {
      return action.payload.exists;
    })
  );
}

/**
 * Get the AngularFirestoreDocument object for a firestore DocumentReference
 *
 * AngularFirestore and Firestore uses different references for Documents and Collections.
 *
 * @param ref Firestore DocumentReference to Document
 * @param ngFirestore the AngularFirestore object
 */
export function getDocFsFromRef(ref: DocumentReference, ngFirestore: AngularFirestore): AngularFirestoreDocument {
  return ngFirestore.doc(ref.path);
}

/**
 * Add createdDate to the object, if createdDate already exists then we do not overwrite it
 *
 * @param data data where the createdData will be added
 */
export function addCreatedDate<A>(data: A): A {
  if ('createdDate' in data) {
    return data;
  }

  const createdDate = new Date();
  return {...data, createdDate};
}

/**
 * Add modifiedDate to the object
 *
 * @param data data where the modifiedDate will be added
 */
export function addModifiedDate<A>(data: A): A {
  const modifiedDate = new Date();
  return {...data, modifiedDate};
}

/**
 * Add createdBy to the object
 *
 * @param createdBy profile, user or any type of data
 */
export function addCreatedBy<A>(data: A, createdBy: any): A {
  return {...data, createdBy};
}

/**
 * Firestore saves time as timestamps and javascript uses Date objects.
 * This functions helps convert the createdDate and modifiedDate from timestamp
 * to Date()
 *
 * @param data data that contains 'createdDate' and/or 'modifiedDate'
 */
export function convertTimestampToDate<A extends FirestoreItem>(data: A): A {
  if (data.hasOwnProperty('createdDate')) {
    data.createdDate = data.createdDate as firebase.firestore.Timestamp;
    data.createdDate = data.createdDate.toDate();
  }
  if (data.hasOwnProperty('modifiedDate')) {
    data.modifiedDate = data.modifiedDate as firebase.firestore.Timestamp;
    data.modifiedDate = data.modifiedDate.toDate();
  }

  return data;
}
