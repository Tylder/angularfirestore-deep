import {Component, Input, OnInit} from '@angular/core';
import {RestaurantItem, ReviewItem} from '../../models/restaurant';
import {RestaurantFsService} from '../../services/restaurant-fs.service';

@Component({
  selector: 'app-restaurant',
  templateUrl: './restaurant.component.html',
  styleUrls: ['./restaurant.component.scss']
})
export class RestaurantComponent {

  @Input() restaurant: RestaurantItem;

  constructor(private restaurantFsService: RestaurantFsService) {}

  addRandomReview(): void {
    const review: ReviewItem = {
      score: Math.floor(Math.random() * 10) + 1, // random integer 1 - 10;
      text: 'random review',
      userName: 'anon'
    };

    this.restaurantFsService.addReview$(this.restaurant, review).subscribe();
  }



}
