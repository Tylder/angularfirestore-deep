import {Component, HostListener} from '@angular/core';
import {RestaurantFsService} from './services/restaurant-fs.service';
import {RestaurantItem} from './models/restaurant';
import {mockRestaurantItems} from './mock/restaurantMockItems';
import {ReplaySubject, BehaviorSubject, of} from 'rxjs';
import {filter, map, switchMap, take, tap} from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {


  restaurants$: ReplaySubject<RestaurantItem[]> = new ReplaySubject<RestaurantItem[]>(1);

  // BehaviorSubject where the selected restaurant taken from firestore is kept, uses listenDeep to
  selectedRestaurantFull$: ReplaySubject<RestaurantItem> = new ReplaySubject<RestaurantItem>(undefined);

  // selected restaurant from firestore..does not contain reviews and dishes
  selectedRestaurant$: ReplaySubject<RestaurantItem> = new ReplaySubject<RestaurantItem>(undefined);

  mockRestaurants: RestaurantItem[] = mockRestaurantItems;  // list of mock restaurants
  selectedMockRestaurant: RestaurantItem;

  constructor(private restaurantFsService: RestaurantFsService) {
    /* listen for restaurants and keep them in this.restaurants$ */
    this.restaurantFsService.listenForRestaurants$().pipe(
      tap(restaurants => console.log(restaurants)),
    ).subscribe((restaurants: RestaurantItem[]) => this.restaurants$.next(restaurants));

    /* listen for selectedRestaurant$ and update selectedRestaurantFull$ if changed */
    this.selectedRestaurant$.pipe(
      switchMap((restaurant: RestaurantItem) => {
        if (restaurant != null) {
          return this.restaurantFsService.listenForRestaurantById$(restaurant.id);
        }
        else {
          return of(null);
        }
      }),
    ).subscribe((restaurantFull: RestaurantItem) => this.selectedRestaurantFull$.next(restaurantFull));

    /* set selectedRestaurant$ to null if not in firestore, meaning it has been deleted or had its id changed */
    this.restaurants$.pipe(
      map((restaurants: RestaurantItem[]) => restaurants.map(rest => rest.id)),
      switchMap((restaurantIds: string[]) => {
        return this.selectedRestaurantFull$.pipe(
          take(1),
          filter(selectedRestaurant => selectedRestaurant != null),
          map((selectedRestaurant: RestaurantItem) => selectedRestaurant.id),
          tap(selectedRestaurantId => {
            if (restaurantIds.findIndex(id => id === selectedRestaurantId) === -1) { // selected restaurant id not in restaurants
              this.selectedRestaurant$.next(null);
            }
          })
        );
      }),
    ).subscribe();
  }

  addRestaurant(restaurant: RestaurantItem): void {
    this.restaurantFsService.addRestaurant$(restaurant).subscribe();
  }

  deleteRestaurant(restaurant: RestaurantItem): void {
    this.restaurantFsService.deleteRestaurantById$(restaurant.id).pipe(
      // // everything after this is just checking if the deleted restaurant was the selectedRestaurant
      // switchMap(() => this.selectedRestaurant$),
      // take(1),
      // tap((selectedRestaurant: RestaurantItem) => {
      //   if (selectedRestaurant != null && restaurant.id === selectedRestaurant.id) {
      //     this.selectedRestaurant$.next(null); // the selected restaurant was deleted so null the selectedRestaurant
      //   }
      // })
    ).subscribe();

  }

  deleteAllRestaurants(): void {
    this.restaurantFsService.deleteAllRestaurants$().subscribe();
  }

  selectMockRestaurant(restaurant: RestaurantItem): void {
    this.selectedMockRestaurant = restaurant;
  }

  selectRestaurant(restaurant: RestaurantItem): void {
    this.selectedRestaurant$.next(restaurant);
  }

  /**
   * Just a method to show an example of changeDocId$
   */
  changeIdOfRestaurantToRandom(restaurant: RestaurantItem): void {
    const randomId = Math.random().toString(36).substr(10, 15);
    this.restaurantFsService.changeIdOfRestaurant$(restaurant, randomId).subscribe();
  }

}
