import { Routes } from '@angular/router';
import { DealerLocatorComponent } from './dealer-locator/dealer-locator.component';
import { RegisterComponent } from './register/register.component';
import { UnsavedGuard } from './guards/unsaved.guard';
import { HomeComponent } from './home/home.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: HomeComponent },
  { path: 'dealer-locator', component: DealerLocatorComponent },
  { path: 'register', component: RegisterComponent, canDeactivate: [UnsavedGuard] },
  { path: '**', redirectTo: 'dealer-locator' }
];


