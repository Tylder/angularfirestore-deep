import {RestaurantItem} from '../models/restaurant';

/**
 * Mock Items used for demo
 *
 * The demo still uses firestore to store the data however.
 */

export const mockRestaurantItems: RestaurantItem[] = [
  {
    name: 'Tonys Pizzeria and Italian Food',
    category: 'italian',
    averageReviewScore: 6.5,
    address: {
      zipCode: '12345',
      city: 'example city',
      line1: '12 example rd'
    },
    dishes: [
      {
        name: 'Margherita Pizza',
        images: [
          {url: 'example.jpg'},
          {url: 'example2.jpg'}
        ]
      },
      {
        name: 'Pasta alla Carbonara',
        images: [
          {url: 'example.jpg'},
          {url: 'example2.jpg'}
        ]
      }
    ],
    reviews: [
      {
        score: 5,
        text: 'decent food',
        userName: 'anon123'
      },
      {
        score: 8,
        text: 'good food',
        userName: 'foodlover33'
      },
    ]
  },

  {
    name: 'Salads And Stuff',
    category: 'salads',
    averageReviewScore: 7.0,
    address: {
      zipCode: '45431',
      city: 'example city',
      line1: '13 example rd'
    },
    dishes: [
      {
        name: 'Caesar salad',
        images: [
          {url: 'example.jpg'},
          {url: 'example2.jpg'}
        ]
      },
      {
        name: 'Chicken Salad',
        images: [
          {url: 'example.jpg'},
          {url: 'example2.jpg'}
        ]
      }
    ],
    reviews: [
      {
        score: 5,
        text: 'Ok',
        userName: 'anon123'
      },
      {
        score: 9,
        text: 'great',
        userName: 'foodlover33'
      },
    ]
  },

];
