import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CanComponentDeactivate } from '../guards/unsaved.guard';
import ChatBridge from '../lib/bridge';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card" *ngIf="!submitted; else confirmation">
      <h2>Product Registration</h2>
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
export class RegisterComponent implements CanComponentDeactivate {
  model: any = {};
  private savedSnapshot: string = JSON.stringify(this.model);
  submitted = false;

  hasUnsavedChanges(): boolean {
    return JSON.stringify(this.model) !== this.savedSnapshot;
  }

  submit() {
    this.savedSnapshot = JSON.stringify(this.model);
    this.submitted = true;
    try { ChatBridge.send('dirty', { dirty: false }); } catch {}
  }

  reset() {
    this.model = {};
    try { ChatBridge.send('dirty', { dirty: false }); } catch {}
  }

  onChange() {
    const dirty = this.hasUnsavedChanges();
    try { ChatBridge.send('dirty', { dirty }); } catch {}
  }
}


