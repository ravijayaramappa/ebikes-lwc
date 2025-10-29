import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CanComponentDeactivate } from '../guards/unsaved.guard';
import bridge from '../lib/bridge';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card" *ngIf="!submitted; else confirmation">
      <h2>Product Registration<span *ngIf="productName"> — {{ productName }}</span></h2>
      <form (ngSubmit)="submit()">
        <label for="name">Full Name</label>
        <input id="name" name="name" [(ngModel)]="model.name" (ngModelChange)="onChange()" required />

        <label for="email">Email</label>
        <input id="email" name="email" type="email" [(ngModel)]="model.email" (ngModelChange)="onChange()" required />

        <label for="serial">Bike Serial Number</label>
        <input id="serial" name="serial" [(ngModel)]="model.serial" (ngModelChange)="onChange()" required />

        <label for="purchaseDate">Purchase Date</label>
        <input id="purchaseDate" name="purchaseDate" type="date" [(ngModel)]="model.purchaseDate" (ngModelChange)="onChange()" />

        <label for="notes">Notes</label>
        <textarea id="notes" name="notes" rows="4" [(ngModel)]="model.notes" (ngModelChange)="onChange()"></textarea>

        <div class="actions" style="margin-top: 16px;">
          <button class="primary" type="submit">Submit</button>
          <button class="secondary" type="button" (click)="reset()">Cancel</button>
        </div>
      </form>
    </div>
    <ng-template #confirmation>
      <div class="card">
        <h2>Registration submitted</h2>
        <p>Thank you{{ model?.name ? ', ' + model.name : '' }}. We have received your registration.</p>
      </div>
    </ng-template>
  `
})
export class RegisterComponent implements CanComponentDeactivate, OnDestroy, OnInit {
  model: any = {};
  private savedSnapshot: string = JSON.stringify(this.model);
  submitted = false;
  private beforeUnloadHandler?: (e: BeforeUnloadEvent) => void;
  productName = '';
  private dataHandler?: (e: any) => void;

  ngOnInit(): void {
    try {
      const data = bridge.getData?.() || {};
      this.applyIncomingData(data);
      this.dataHandler = (e: any) => this.applyIncomingData(e?.detail || {});
      (bridge as any).addEventListener?.('data', this.dataHandler);
    } catch {}
  }

  hasUnsavedChanges(): boolean {
    return JSON.stringify(this.model) !== this.savedSnapshot;
  }

  submit() {
    this.savedSnapshot = JSON.stringify(this.model);
    this.submitted = true;
    bridge.isConnected() && bridge.dispatchEvent(new CustomEvent('dirty', { detail: { dirty: false } }));
    this.toggleBeforeUnload(false);
  }

  reset() {
    this.model = {};
    bridge.isConnected() && bridge.dispatchEvent(new CustomEvent('dirty', { detail: { dirty: false } }));
    this.savedSnapshot = JSON.stringify(this.model);
    this.toggleBeforeUnload(false);
  }

  onChange() {
    const dirty = this.hasUnsavedChanges();
    bridge.isConnected() && bridge.dispatchEvent(new CustomEvent('dirty', { detail: { dirty } }));
    this.toggleBeforeUnload(dirty);
  }

  ngOnDestroy(): void {
    this.toggleBeforeUnload(false);
    try {
      if (this.dataHandler) {
        (bridge as any).removeEventListener?.('data', this.dataHandler);
      }
    } catch {}
  }

  private toggleBeforeUnload(enable: boolean) {
    if (enable) {
      if (!this.beforeUnloadHandler) {
        this.beforeUnloadHandler = (e: BeforeUnloadEvent) => {
          e.preventDefault();
          e.returnValue = '';
          return '' as any;
        };
        window.addEventListener('beforeunload', this.beforeUnloadHandler);
      }
    } else if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = undefined;
    }
  }

  private applyIncomingData(payload: any) {
    if (payload && typeof payload === 'object') {
      if (payload.productName && payload.productName !== this.productName) {
        this.productName = payload.productName;
      }
    }
  }
}


