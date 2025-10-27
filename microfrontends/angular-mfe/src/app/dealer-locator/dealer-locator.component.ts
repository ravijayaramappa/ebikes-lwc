import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import '../lib/bridge';

@Component({
  selector: 'app-dealer-locator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card">
      <h2>Dealer Locator</h2>
      <p>Find a dealer near you.</p>
      <div style="display:flex; gap:16px;">
        <div style="flex:1;">
          <input placeholder="Enter city or zip" style="width:100%;" [(ngModel)]="query" (keyup.enter)="search()" />
          <div class="actions" style="margin: 8px 0;">
            <button class="primary" (click)="search()">Search</button>
            <button class="secondary" (click)="clear()">Clear</button>
          </div>
          <ul>
            <li *ngFor="let d of filteredDealers">{{d.name}} — {{d.city}}, {{d.state}}</li>
          </ul>
        </div>
        <div style="flex:1; min-height: 240px; background:#eef2f7; display:flex; align-items:center; justify-content:center; border-radius:8px;">
          <span *ngIf="!mapLabel">Map placeholder</span>
          <span *ngIf="mapLabel">Showing results near {{mapLabel}}</span>
        </div>
      </div>
    </div>
  `
})
export class DealerLocatorComponent {
  query = '';
  mapLabel = '';
  dealers = [
    { name: 'City Bikes', city: 'San Francisco', state: 'CA' },
    { name: 'Trail Masters', city: 'Denver', state: 'CO' },
    { name: 'Mountain Gear', city: 'Boulder', state: 'CO' }
  ];
  filteredDealers = this.dealers;

  search() {
    const q = (this.query || '').trim().toLowerCase();
    if (!q) {
      this.filteredDealers = this.dealers;
      this.mapLabel = '';
      return;
    }
    this.filteredDealers = this.dealers.filter((d) =>
      d.name.toLowerCase().includes(q) || d.city.toLowerCase().includes(q) || d.state.toLowerCase().includes(q)
    );
    this.mapLabel = this.query.toUpperCase();
  }

  clear() {
    this.query = '';
    this.filteredDealers = this.dealers;
    this.mapLabel = '';
  }
}


