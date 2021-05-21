import { Component } from '@angular/core';
import {RestaurantFsService} from './services/restaurant-fs.service';
import {RestaurantItem} from './models/restaurant';
import {mockRestaurantItems} from './mock/restaurantMockItems';
import {ReplaySubject, BehaviorSubject, of} from 'rxjs';
import {filter, switchMap, take, tap} from 'rxjs/operators';

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
    this.restaurantFsService.listenForRestaurants$()
      .subscribe((restaurants: RestaurantItem[]) => this.restaurants$.next(restaurants));

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
  }

  addRestaurant(restaurant: RestaurantItem): void {
    this.restaurantFsService.addRestaurant$(restaurant).subscribe();
  }

  deleteRestaurant(restaurant: RestaurantItem): void {
    this.restaurantFsService.deleteRestaurantById$(restaurant.id).subscribe();
  }

  selectMockRestaurant(restaurant: RestaurantItem): void {
    this.selectedMockRestaurant = restaurant;
  }

  selectRestaurant(restaurant: RestaurantItem): void {
    this.selectedRestaurant$.next(restaurant);
  }
}
