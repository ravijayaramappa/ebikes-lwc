import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RegisterComponent } from '../register/register.component';
import { DealerLocatorComponent } from '../dealer-locator/dealer-locator.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RegisterComponent, DealerLocatorComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="card">
      <h2>Welcome to the Angular Microfrontend</h2>
      <p>
        This home page will host Lightning Out 2.0 content from the E‑Bikes
        Salesforce org. The section below is a placeholder container where the
        LWC will be mounted.
      </p>
      <div id="lo2-root" style="min-height: 240px; border: 2px dashed #d1d5db; border-radius: 8px; display:flex; align-items:center; justify-content:center;">
        <lightning-out-application components="c-product-card" id="loApp"></lightning-out-application>
        <c-product-card id="loComp"></c-product-card>
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
export class HomeComponent {
    ngOnInit() {
        const loApp = document.getElementById("loApp") as any;
        const loComp = document.getElementById("loComp") as any;
        if (loApp && loComp) {
            loApp.orgUrl = "https://dvagworkshopdemoorg-dev-ed.sfdctest.test1.lightning.pc-rnd.force.com";
            loComp.recordId = "a03SM00000AR4MuYAL";
        }
    }
}
