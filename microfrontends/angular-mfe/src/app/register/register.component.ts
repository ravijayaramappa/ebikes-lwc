import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CanComponentDeactivate } from '../guards/unsaved.guard';
import '../lib/chat-bridge';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="card">
      <h2>Product Registration</h2>
      <form (ngSubmit)="submit()">
        <label for="name">Full Name</label>
        <input id="name" name="name" [(ngModel)]="model.name" required />

        <label for="email">Email</label>
        <input id="email" name="email" type="email" [(ngModel)]="model.email" required />

        <label for="serial">Bike Serial Number</label>
        <input id="serial" name="serial" [(ngModel)]="model.serial" required />

        <label for="purchaseDate">Purchase Date</label>
        <input id="purchaseDate" name="purchaseDate" type="date" [(ngModel)]="model.purchaseDate" />

        <label for="notes">Notes</label>
        <textarea id="notes" name="notes" rows="4" [(ngModel)]="model.notes"></textarea>

        <div class="actions" style="margin-top: 16px;">
          <button class="primary" type="submit">Submit</button>
          <button class="secondary" type="button" (click)="reset()">Cancel</button>
        </div>
      </form>
    </div>
  `
})
export class RegisterComponent implements CanComponentDeactivate {
  model: any = {};
  private savedSnapshot: string = JSON.stringify(this.model);

  hasUnsavedChanges(): boolean {
    return JSON.stringify(this.model) !== this.savedSnapshot;
  }

  submit() {
    this.savedSnapshot = JSON.stringify(this.model);
    alert('Registration submitted!');
  }

  reset() {
    this.model = {};
  }
}


