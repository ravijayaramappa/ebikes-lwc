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
        <lightning-out-application app-id="1UsD1000000000BKAQ" components="c-similar-products" id="loApp"></lightning-out-application>
        <c-similar-products id="loComp" style="height:302px" record-id="a03D10000058zeiIAA"></c-similar-products>
        <c-similar-products id="loComp2" style="height:302px" record-id="a03D10000058zelIAA"></c-similar-products>
      </div>
    </div>

    <div *ngIf="showRegister" class="card" style="margin-top:16px;">
      <h3>Product Registration</h3>
      <app-register [productNameInput]="selectedProductName" [productIdInput]="selectedProductId"></app-register>
    </div>

    <div class="card" style="margin-top:16px;">
      <h3>Dealer Locator</h3>
      <app-dealer-locator></app-dealer-locator>
    </div>
  `
})
export class HomeComponent {
    selectedProductId: string = '';
    selectedProductName: string = '';
    showRegister = false;

    ngOnInit() {
        let params = new URLSearchParams(document.location.search);
        const frontdoorUrl = params.get('frontdoor-url');

        const loApp = document.getElementById("loApp") as any;

        if (frontdoorUrl) {
            // Perform authentication
            loApp.frontdoorUrl = frontdoorUrl;
        } else {
            // Assume authentication
            loApp.orgUrl = "https://dvagworkshopdemoorg-dev-ed.sfdctest.lightning.force.com";
        }

        const loComp = document.getElementById("loComp") as any;
        loComp.addEventListener('viewproduct', (event: any) => this.onLoProduct(event));
        const loComp2 = document.getElementById("loComp2") as any;
        loComp2.addEventListener('viewproduct', (event: any) => this.onLoProduct(event));
    }

    onLoProduct(event: any) {
        // Expect detail: { productId, productName? }
        const d = event?.detail || {};
        this.selectedProductId = d.productId || '';
        this.selectedProductName = d.productName || this.selectedProductName;
        this.showRegister = !!this.selectedProductId;
    }

    closeRegister() {
        this.showRegister = false;
    }
}
