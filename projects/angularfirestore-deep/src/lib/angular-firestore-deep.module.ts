import { NgModule } from '@angular/core';
import { AngularFirestoreModule} from '@angular/fire/firestore';
import {DragDropModule} from '@angular/cdk/drag-drop';

/** AngularfirestoreWrapperModule */
@NgModule({
  declarations: [],
  imports: [
    DragDropModule,
    AngularFirestoreModule,
  ],
  exports: []
})
export class AngularFirestoreDeepModule { }
