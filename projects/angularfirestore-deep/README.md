# AngularFirestore-Deep

Simplify the work with complex and deep objects while retaining all the great benefits from Firebase Firestore.

```bash
ng add @angular/fire

npm install --save @angularfirestore-deep
```

Firestore splits its data up into collections and documents which is what allows it to be scalable and fast.

The issues that this can cause is that the best way to store your data might not be the best way to work with and display that data.

It can also be more difficult to figure out how to store your data in a way that is not only cheap in terms of reads but also cheap in terms of performance/speed.

AngularFireStore-Deep is meant to help developers solve these issues.

### Documentation and Examples
[Documentation](https://angularfirestore-deep.web.app/docs/)
[Github](https://github.com/Tylder/angularfirestore-deep/tree/master/projects/angularfirestore-deep) 


### Demo
You can find a simple demo in projects/demo.

It can be run locally if you provide your own firebaseConfig in the environment file or you can find a running demo here: 


## Using the library

Use the library in any Angular application:

```ts
  ngFirestoreDeep: AngularFirestoreDeep;  //  AngularFirestoreDeep variable

  constructor(private ngFireStore: AngularFirestore) {
    this.ngFirestoreDeep = new AngularFirestoreDeep(ngFireStore);  //  initialize AngularFireStoreDeep with AngularFirestore
  }
```

## License

MIT © [Daniel Lofgren](mailto:lofgrendaniel@hotmail.com)
