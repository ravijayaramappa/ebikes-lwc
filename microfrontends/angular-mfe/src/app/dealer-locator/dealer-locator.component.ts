import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
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
        <div style="flex:1; min-height: 400px;">
          <div id="dealerMap" style="height: 100%; border-radius: 8px;"></div>
        </div>
      </div>
    </div>
  `
})
export class DealerLocatorComponent {
  query = '';
  mapLabel = '';
  map!: L.Map;
  filteredDealers: any[] = [];
  dealers = [
    { name: 'City Bikes', city: 'San Francisco', state: 'CA', address: '123 Main St, San Francisco, CA 94101' },
    { name: 'Trail Masters', city: 'Denver', state: 'CO', address: '1437 Bannock St, Denver 80202' },
    { name: 'Mountain Gear', city: 'Boulder', state: 'CO', address: "1777 BroadwayBoulder, CO 80302" }
  ];
  ngAfterViewInit() {
    // Fix Leaflet icon paths - delete the default _getIconUrl method
    // and set explicit paths to our assets
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'assets/marker-icon-2x.png',
      iconUrl: 'assets/marker-icon.png',
      shadowUrl: 'assets/marker-shadow.png'
    });
    
    this.initMap();
    this.filteredDealers = this.dealers;
  }

  initMap() {
    this.map = L.map('dealerMap', {
      center: [39.5, -98.35], // Center of USA
      zoom: 4
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);
  }

  async search() {
    const q = this.query.trim().toLowerCase();
    this.filteredDealers = q
      ? this.dealers.filter(
          (d) =>
            d.name.toLowerCase().includes(q) ||
            d.city.toLowerCase().includes(q) ||
            d.state.toLowerCase().includes(q)
        )
      : this.dealers;

    this.mapLabel = this.query ? this.query.toUpperCase() : '';
    await this.updateMapMarkers();
  }

  clear() {
    this.query = '';
    this.filteredDealers = this.dealers;
    this.mapLabel = '';
    this.updateMapMarkers();
  }

  async updateMapMarkers() {
    // Remove existing markers
    this.map.eachLayer((layer: any) => {
      if ((layer as any).options && (layer as any).options.attribution === undefined) {
        this.map.removeLayer(layer);
      }
    });

    // Geocode addresses (mock via free API)
    for (const d of this.filteredDealers) {
      const coords = await this.geocodeAddress(d.address);
      if (coords) {
        L.marker(coords)
          .addTo(this.map)
          .bindPopup(`<b>${d.name}</b><br>${d.address}`);
      }
    }

    if (this.filteredDealers.length > 0) {
      const first = await this.geocodeAddress(this.filteredDealers[0].address);
      if (first) this.map.setView(first, 12);
    }
  }

  async geocodeAddress(address: string): Promise<[number, number] | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data?.length) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    } catch {
      console.warn('Geocode failed for', address);
    }
    return null;
  }
}


