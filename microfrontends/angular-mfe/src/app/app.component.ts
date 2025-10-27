import { Component } from '@angular/core';
import { Router, NavigationEnd, RouterLink, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  template: `
    <div class="statusbar" *ngIf="showNav">
      <a routerLink="/">Home</a>
      <a routerLink="/dealer-locator">Dealer Locator</a>
      <a routerLink="/register">Register</a>
    </div>
    <div class="container">
      <router-outlet></router-outlet>
    </div>
  `
})
export class AppComponent {
  isEmbedded = false;
  isMfeRoute = false;
  showNav = true;

  constructor(private router: Router) {
    try {
      this.isEmbedded = window.self !== window.top;
    } catch {
      this.isEmbedded = true;
    }

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        const url = e.urlAfterRedirects || e.url;
        this.isMfeRoute = url.startsWith('/register') || url.startsWith('/dealer-locator');
        this.showNav = !(this.isEmbedded || this.isMfeRoute);
      });
  }
}


