import { Injectable } from '@angular/core';
import {AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument} from '@angular/fire/firestore';
import {RestaurantItem, ReviewItem} from '../models/restaurant';
// import {AngularFirestoreDeep, SubCollectionQuery, SubCollectionWriter} from 'angularfirestore-deep';
import {Observable} from 'rxjs';
import {map, switchMap, take, tap} from 'rxjs/operators';
import {SubCollectionWriter} from '../../../../angularfirestore-deep/src/lib/sub-collection-writer';
import {SubCollectionQuery} from '../../../../angularfirestore-deep/src/lib/sub-collection-query';
import {AngularFirestoreDeep} from '../../../../angularfirestore-deep/src/lib/angular-firestore-deep';


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
  // add reviews sub Collection to restaurant object
  {
    name: 'reviews',
    queryFn: ref => ref.orderBy('score')
  },
  { // add dishes sub Collection to restaurant object
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
    const docFs: AngularFirestoreDocument<RestaurantItem> = this.restaurantCollectionFs.doc(restaurantId);
    return this.ngFirestoreDeep.listenForDocDeep$<RestaurantItem>(docFs, restaurantSubCollectionQueries);
  }

  // doesn't get the reviews and dishes
  listenForRestaurants$(): Observable<RestaurantItem[]> {
    return this.ngFirestoreDeep.listenForCollection$<RestaurantItem>(this.restaurantCollectionFs);
  }

  /* ADD */

  /**
   * Add the restaurant to the restaurantCollectionF.
   *
   * Since a docId is given as restaurant.name the document Id will not be random so that we cannot add 2 restaurants with the same name.
   */
  addRestaurant$(restaurant: RestaurantItem): Observable<RestaurantItem> {
    return this.ngFirestoreDeep
      .addDeep$<RestaurantItem>(restaurant, this.restaurantCollectionFs, restaurantSubCollectionWriters, true, restaurant.name);
  }

  /* DELETE */

  /**
   * Deletes the restaurant document and all documents found in the sub collection specified in restaurantSubCollectionQueries
   * @param restaurantId - unique id
   */
  deleteRestaurantById$(restaurantId: string): Observable<RestaurantItem> {
    const docFs: AngularFirestoreDocument<RestaurantItem> = this.restaurantCollectionFs.doc(restaurantId);
    return this.ngFirestoreDeep.deleteDeep$(docFs, restaurantSubCollectionQueries);
  }

  /**
   * Delete all restaurants and all documents in sub collections as described by the restaurantSubCollectionQueries.
   *
   * 1. Listens to all restaurants in collection.
   * 2. Since we only want to get the restaurants once and not continuously listen for updates we do a take(1)
   * 3. Map the list of restaurants to a list of AngularFirestoreDocuments.
   *    This is why we add this data to the FirestoreItem when we listen for a document.
   *    It makes any future operations on a document so much faster and cheaper since we already have its path and reference saved.
   * 4. switchMap to deleteMultipleDeep -> works the same as deleteMultipleDeep except we can give it a list of AngularFirestoreDocuments
   *    and it deletes them all asynchronously.
   */
  deleteAllRestaurants$(): Observable<any> {
    return this.listenForRestaurants$().pipe(
      take(1),
      map((restaurants: RestaurantItem[]) => restaurants.map(rest => rest.docFs)),
      tap(val => console.log(val)),
      switchMap((docsFs: AngularFirestoreDocument[]) => this.ngFirestoreDeep.deleteMultipleDeep$(docsFs, restaurantSubCollectionQueries)),
    );
  }

  /* EDIT/UPDATE */
  editRestaurantById$(restaurantId: string, data: object): Observable<any> {
    const docFs: AngularFirestoreDocument<RestaurantItem> = this.restaurantCollectionFs.doc(restaurantId);
    return this.ngFirestoreDeep.updateDeep$(data, docFs, restaurantSubCollectionWriters);
  }

  changeIdOfRestaurant$(restaurant: RestaurantItem, newId: string): Observable<RestaurantItem> {

    return this.ngFirestoreDeep.changeDocId$(restaurant.docFs,
                                             restaurantSubCollectionQueries,
                                             restaurantSubCollectionWriters,
                                             newId);
  }

  /**
   * Adds review and updates the averageReviewScore on restaurant
   */
  addReview$(restaurant: RestaurantItem, review: ReviewItem): Observable<ReviewItem> {
    const reviewCollectionFs: AngularFirestoreCollection<ReviewItem> =
      this.restaurantCollectionFs.doc(restaurant.id).collection('reviews');

    return this.ngFirestoreDeep.add$(review, reviewCollectionFs).pipe(
      switchMap(() => {
        // calculate new average score
        const scoreSum: number = restaurant.reviews
          .map(rev => rev.score)
          .reduce((sum, score) => sum += score) + review.score;
        let averageReviewScore: number = scoreSum / (restaurant.reviews.length + 1);
        averageReviewScore = parseFloat(averageReviewScore.toFixed(1)); // round to 1 decimal

        return this.ngFirestoreDeep.update$({averageReviewScore}, restaurant.docFs); // update averageReviewScore
      })
    );
  }

}
