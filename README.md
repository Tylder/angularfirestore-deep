# AngularFirestore-Deep

Work with complex and deep objects while retaining all the great benefits from Firebase Firestore.

<strong><pre>npm install --save @angularfirestore-deep</pre></strong>

Firestore splits its data up into collections and documents which is what allows it to be scalable and fast.

The issues that this can cause is that the best way to store your data might not be the best way to work with and display that data.

It can also be more difficult to figure out how to store your data in a way that is not only cheap in terms of reads but also cheap in terms of performance/speed.

AngularFireStore-Deep is meant to help developers solve these issues.

### Documentation and Examples
[Documentation]()





It is as simple as:

```html
<div (longClick)="onLongClick($event)></div>
```

## Demo

[Demo](https://tylder.github.io/ngx-long-click/)

or 

`npm run start` to run a local demo

## Using the library

Import the library in any Angular application by running:

```bash
$ npm install ngx-long-click --save
```

and then from your Angular `AppModule`:

```typescript
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';

// Import the library module
import {NgxLongClickModule} from 'ngx-long-click';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,

    // Specify NgxLongClickModule library as an import
    NgxLongClickModule
  ],
  providers: [],
  bootstrap: [ AppComponent ]
})
export class AppModule { }
```

Once your library is imported, you can use its `longClick` directive in your Angular application:

```html
<div (longClick)="onLongClick($event)"></div>
```

`clickDelayMs` specifies the time in milliseconds the element need to be pressed before the event is fired 

```html
<div (longClick)="onLongClick($event)" clickDelayMs="1000">Press for 1 sec</div>
```

## License

MIT © [Daniel Lofgren](mailto:lofgrendaniel@hotmail.com)
