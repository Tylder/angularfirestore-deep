/** Helper method to get reference from path, the path can be either to a Document or Collection */
import {Action, AngularFirestoreDocument, DocumentData, DocumentReference} from '@angular/fire/firestore';
import {CollectionReference, DocumentSnapshot} from '@angular/fire/firestore/interfaces';
import {FirestoreItem} from './models/firestoreItem';
import {AngularFirestoreCollection} from '@angular/fire/firestore/collection/collection';
import {map, take} from 'rxjs/operators';
import {Observable} from 'rxjs/dist/types';
import firebase from 'firebase';

/** Helper method to get reference from path, the path can be either to a Document or Collection */
export function getRefFromPath(path: string): DocumentReference | CollectionReference {
  const pathSegmentAmount: number = path.split('/').length;
  if (pathSegmentAmount % 2 === 0) { // even number means doc
    return this.ngFirestore.doc(path).ref;
  } else { // odd meaning collection
    return this.ngFirestore.collection(path).ref;
  }
}

/** If given the path to a Document it returns the parent AngularFirestoreCollection,
 * if given a path to a collection it just turns it into a AngularFirestoreCollection
 */
export function getCollectionFsFromPath<A extends FirestoreItem>(path: string): AngularFirestoreCollection<A> {
  const collectionPathSegments = path.split('/');
  const pathSegmentAmount: number = path.split('/').length;

  if (pathSegmentAmount % 2 === 0) { // even number means doc
    collectionPathSegments.pop(); // delete last
    return this.ngFirestore.collection(collectionPathSegments.join('/'));
  }
  else {
    return this.ngFirestore.collection(path);
  }
}

/** Get AngularFirestoreDocument from path */
export function getDocFsFromPath(path: string): AngularFirestoreDocument {
  return this.ngFirestore.doc(path);
}

/** Returns the next higher level doc from either a collection or a doc path */
export function getParentDocFsFromPath<A extends FirestoreItem>(path: string): AngularFirestoreDocument<A> {

  let pathSegments: string[] =  path.split('/');
  const pathSegmentAmount: number = pathSegments.length;

  if (pathSegmentAmount % 2 === 0) { // even number means doc, so we need to remove doc and the collection to get the parent doc
    pathSegments = pathSegments.slice(0, pathSegments.length - 2);
    return this.ngFirestore.doc(pathSegments.join('/'));
  }
  else { // odd, so its a colletion
    pathSegments = pathSegments.slice(0, pathSegments.length - 1);
    return this.ngFirestore.doc(pathSegments.join('/'));
  }
}

/** Simple check if Document exists, returns true if Document exist */
export function isDocExist$(docFs: AngularFirestoreDocument<DocumentData>): Observable<boolean> {
  return docFs.snapshotChanges().pipe(
    take(1),
    map((action: Action<DocumentSnapshot<DocumentData>>) => {
      return action.payload.exists;
    })
  );
}

/** Get the AngularFirestoreDocument object for a firestore DocumentReference */
export function getDocFsFromRef(ref: DocumentReference): AngularFirestoreDocument {
  return this.ngFirestore.doc(ref.path);
}

/** Add createdDate to the object */
export function addCreatedDate<A>(data: A): A {
  const createdDate = new Date();
  return {...data, createdDate};
}

/** Add modifiedDate to the object */
export function addModifiedDate<A>(data: A): A {
  const modifiedDate = new Date();
  return {...data, modifiedDate};
}

/** Add createdBy to the object
 * @param createdBy profile, user or any type of data
 */
export function addCreatedBy<A>(data: A, createdBy: any): A {
  return {...data, createdBy};
}

/**
 *
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
