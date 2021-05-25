# Edit Name

#### For a working demo checkout: [Demo](../../../demo), or [Code](https://github.com/Tylder/angularfirestore-deep)

#### Method Documentation

- [changeDocId$](../../classes/AngularFirestoreDeep.html#changeDocId$)

Firestore does not provide a method for changing the Id of a document.
The only way is to copy the document and all its child documents and then create a new document with all the child documents.
Once this is done the old document is deleted.

 
