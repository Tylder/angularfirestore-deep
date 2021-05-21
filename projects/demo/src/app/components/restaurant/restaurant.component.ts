import {Component, Input, OnInit} from '@angular/core';
import {RestaurantItem} from '../../models/restaurant';

@Component({
  selector: 'app-restaurant',
  templateUrl: './restaurant.component.html',
  styleUrls: ['./restaurant.component.scss']
})
export class RestaurantComponent implements OnInit {

  @Input() restaurant: RestaurantItem;

  constructor() { }

  ngOnInit(): void {
  }

}
