import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
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
  `
})
export class HomeComponent {}


