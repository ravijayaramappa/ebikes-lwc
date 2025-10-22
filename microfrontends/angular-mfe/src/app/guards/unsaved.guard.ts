import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { Observable } from 'rxjs';

export interface CanComponentDeactivate {
  hasUnsavedChanges: () => boolean;
}

@Injectable({ providedIn: 'root' })
export class UnsavedGuard implements CanDeactivate<CanComponentDeactivate> {
  canDeactivate(
    component: CanComponentDeactivate
  ): Observable<boolean> | Promise<boolean> | boolean {
    if (!component?.hasUnsavedChanges) {
      return true;
    }
    const dirty = component.hasUnsavedChanges();
    if (!dirty) return true;
    return confirm('You have unsaved changes. Are you sure you want to leave?');
  }
}


