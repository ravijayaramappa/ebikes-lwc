import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import '../lib/chat-bridge';

@Component({
  selector: 'app-dealer-locator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card">
      <h2>Dealer Locator</h2>
      <p>Find a dealer near you.</p>
      <div style="display:flex; gap:16px;">
        <div style="flex:1;">
          <input placeholder="Enter city or zip" style="width:100%;" />
          <ul>
            <li *ngFor="let d of dealers">{{d.name}} — {{d.city}}, {{d.state}}</li>
          </ul>
        </div>
        <div style="flex:1; min-height: 240px; background:#eef2f7; display:flex; align-items:center; justify-content:center; border-radius:8px;">
          <span>Map placeholder</span>
        </div>
      </div>
    </div>
  `
})
export class DealerLocatorComponent {
  dealers = [
    { name: 'City Bikes', city: 'San Francisco', state: 'CA' },
    { name: 'Trail Masters', city: 'Denver', state: 'CO' },
    { name: 'Mountain Gear', city: 'Boulder', state: 'CO' }
  ];
}


