import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RegisterComponent } from '../register/register.component';
import { DealerLocatorComponent } from '../dealer-locator/dealer-locator.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RegisterComponent, DealerLocatorComponent],
  template: `
    <div class="card">
      <h2>Welcome to the Angular Microfrontend</h2>
      <p>
        This home page will host Lightning Out 2.0 content from the E‑Bikes
        Salesforce org. The section below is a placeholder container where the
        LWC will be mounted.
      </p>
      <div id="lo2-root" style="min-height: 240px; border: 2px dashed #d1d5db; border-radius: 8px; display:flex; align-items:center; justify-content:center;">
        <span>Lightning Out 2.0 placeholder</span>
      </div>
    </div>

    <div class="card" style="margin-top:16px;">
      <h3>Embedeable Dealer Locator (native Angular component)</h3>
      <app-dealer-locator></app-dealer-locator>
    </div>

    <div class="card" style="margin-top:16px;">
      <h3>Embedeable Product Registration (native Angular component)</h3>
      <app-register></app-register>
    </div>
  `
})
export class HomeComponent {}


