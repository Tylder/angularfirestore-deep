import {Observable} from 'rxjs';
import {AngularFirestoreDocument, DocumentData, DocumentReference} from '@angular/fire/firestore';
import firebase from 'firebase/app';
import Timestamp = firebase.firestore.Timestamp;


/* These are never to be stored on the db, they are just added when we listen to the doc */
export interface FirebaseDbItem extends DocumentData {
  id?: string;
  path?: string;
  ref?: DocumentReference;
  docFs?: AngularFirestoreDocument;
}

export interface FirestoreItem extends FirebaseDbItem {
  modifiedDate?: Date | Timestamp;
  createdDate?: Date | Timestamp;
}

export interface DbItemFull extends FirestoreItem {  // attrs are required
  id: string;
  path: string;
  modifiedDate: Date | Timestamp;
}

export interface FirestoreItemWithIndex extends FirestoreItem {
  index: number;
}

export interface FirestoreItemFullWithIndex extends DbItemFull {
  index: number;
}

export interface StorageItem extends FirestoreItem {
  storagePath: string;
}

export interface ImageItem extends StorageItem  {
  title: string;
  fileName: string;
  url: string;
  thumbUrl: string;

  alt?: string;

  url$?: Observable<string>;
  thumbUrl$?: Observable<string>;
}
