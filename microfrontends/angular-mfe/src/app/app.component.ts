import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <div class="statusbar">
      <a routerLink="/">Home</a>
      <a routerLink="/dealer-locator">Dealer Locator</a>
      <a routerLink="/register">Register</a>
    </div>
    <div class="container">
      <router-outlet></router-outlet>
    </div>
  `
})
export class AppComponent {}


