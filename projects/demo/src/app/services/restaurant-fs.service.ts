import { Injectable } from '@angular/core';
import {AngularFirestore} from '@angular/fire/firestore';
import {RestaurantItem} from '../models/restaurant';
import {AngularFirestoreDeep, SubCollectionQuery, SubCollectionWriter} from 'angularfirestore-deep';
import {Observable} from 'rxjs';


const restaurantSubCollectionWriters: SubCollectionWriter[] = [
  { name: 'reviews' }, // make reviews a sub collection
  {
    name: 'dishes',  // make dishes a sub collection
    subCollectionWriters: [ // sub collection inside a sub collection
      { name: 'images' } // make images a sub collection inside dishes
    ]
  },
];

const restaurantSubCollectionQueries: SubCollectionQuery[] = [
  // add reviews sub Collection to resturant object
  {
    name: 'reviews',
    queryFn: ref => ref.orderBy('score')
  },
  { // add dishes sub Collection to resturant object
    name: 'dishes',
    subCollectionQueries: [
      { name: 'images' } // add images sub Collection to dish object
    ]
  },
];


@Injectable({
  providedIn: 'root'
})
export class RestaurantFsService {

  ngFirestoreDeep: AngularFirestoreDeep;  //  AngularFirestoreDeep variable
  restaurantCollectionFs = this.ngFireStore.collection('restaurants'); // AngularFirestoreCollectionRef to restaurants

  constructor(private ngFireStore: AngularFirestore) {
    this.ngFirestoreDeep = new AngularFirestoreDeep(ngFireStore);  //  initialize AngularFireStoreDeep with AngularFirestore
  }

  /* LISTEN */
  listenForRestaurantById$(restaurantId: string): Observable<RestaurantItem> {
    const docFs = this.restaurantCollectionFs.doc(restaurantId);
    return this.ngFirestoreDeep.listenForDocDeep$<RestaurantItem>(docFs, restaurantSubCollectionQueries);
  }

  // doesn't get the reviews and dishes
  listenForRestaurants$(): Observable<RestaurantItem[]> {
    return this.ngFirestoreDeep.listenForCollection$<RestaurantItem>(this.restaurantCollectionFs);
  }

  /* ADD */
  addRestaurant$(restaurant: RestaurantItem): Observable<RestaurantItem> {
    return this.ngFirestoreDeep.addDeep$<RestaurantItem>(restaurant, this.restaurantCollectionFs, restaurantSubCollectionWriters);
  }

  /* DELETE */

  /**
   * Deletes the restaurant document and all documents found in the sub collection specified in restaurantSubCollectionQueries
   * @param restaurantId - unique id
   */
  deleteRestaurantById$(restaurantId: string): Observable<RestaurantItem> {
    const docFs = this.restaurantCollectionFs.doc(restaurantId);
    return this.ngFirestoreDeep.deleteDeep$(docFs, restaurantSubCollectionQueries);
  }

  /* EDIT/UPDATE */
  editRestaurantById$(restaurantId: string, data: object): Observable<any> {
    const docFs = this.restaurantCollectionFs.doc(restaurantId);
    return this.ngFirestoreDeep.updateDeep$(data, docFs, restaurantSubCollectionWriters);
  }



}
