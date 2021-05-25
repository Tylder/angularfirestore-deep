import {Observable} from 'rxjs';
import {AngularFirestoreDocument, DocumentData, DocumentReference} from '@angular/fire/firestore';
import firebase from 'firebase/app';
import Timestamp = firebase.firestore.Timestamp;

/**
 * The base object of all firestore documents, containing additional data for
 * easy and efficient document edits.
 *
 * All properties are optional so that we can we can implement this without adding the values.
 * The properties are added when getting the document from firestore.
 */
export interface FirestoreBaseItem extends DocumentData {
  /** The id of the Firestore document */
  id?: string;
  /** The path to the firestore document */
  path?: string;
  /** The firestore document reference */
  ref?: DocumentReference;
  /** The AngularFirestoreDocument, used as a document reference by AngularFirestore */
  docFs?: AngularFirestoreDocument;
  /** allows for simple and clear checks if the document exists.
   * Only applies when DocNotExistAction.RETURN_ALL_BUT_DATA is used when listening for documents
   * @link DocNotExistAction
   */
  isExists?: boolean;
}

/**
 * It is recommended that this interface is implemented by any data model that is saved on firestore.
 */
export interface FirestoreItem extends FirestoreBaseItem {
  /** the Date when the document was created or last modified */
  modifiedDate?: Date | Timestamp;
  /** The Date when the document was created */
  createdDate?: Date | Timestamp;
}


/**
 * id, path and modifiedDate are required and is therefore guaranteed to exist
 */
export interface DbItemFull extends FirestoreItem {  // attrs are required
  /** The id of the Firestore document */
  id: string;
  /** The path to the firestore document */
  path: string;
  /** the Date when the document was created or last modified */
  modifiedDate: Date | Timestamp;
}

/**
 * Used for documents that require indexing
 */
export interface FirestoreItemWithIndex extends FirestoreItem {
  /** the index of document */
  index: number;
}

/**
 * Same as FirestoreItemWithIndex but also guaranteed to contain id, path and modifiedDate
 */
export interface FirestoreItemFullWithIndex extends DbItemFull {
  /** the index of document */
  index: number;
}

/**
 * Used to save the storagePath of items in Firebase Storage
 */
export interface StorageItem extends FirestoreItem {
  /** the Firebase storage path */
  storagePath: string;
}

/**
 * Firestore data for image stored on Firebase Storage
 */
export interface ImageItem extends StorageItem  {
  /** The title of the image */
  title: string;
  /** Filename including extension */
  fileName: string;
  /** Firebase storage url */
  url: string;
  /** Firebase storage url to use for thumbnails */
  thumbUrl: string;
  /** the <img alt=""> */
  alt?: string;
  /** Firebase storage url that is available to be listened to immediately */
  url$?: Observable<string>;
  /** Firebase storage url that is available to be listened to immediately to use for thumbnails */
  thumbUrl$?: Observable<string>;
}
