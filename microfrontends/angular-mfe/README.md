# Angular Microfrontend (Standalone)

This is a self-contained Angular app demonstrating two independent microfrontends that can be embedded later via WidgetContainer, but are fully functional on their own domain:

- Register (form with unsaved-changes protection)
- Dealer Locator (presentational)

Run locally on http://localhost:4200.

## Prerequisites

- Node 18+

## Install and run

```bash
cd microfrontends/angular-mfe
npm install
npm start
# open:
#   http://localhost:4200/register
#   http://localhost:4200/dealer-locator
```

### Routes

- `/register`: Warranty/Registration form with validation and a CanDeactivate guard to prevent accidental data loss.
- `/dealer-locator`: Read-only dealer listing loaded from local assets.

### Notes

- This app is independent of Salesforce. No LMS/Apex/Canvas.
- Later, when embedded via WidgetContainer, only lifecycle hooks (e.g., unload/dirty) are needed.

## Install and run with https

```bash
cd microfrontends/angular-mfe
npm install
npm run mkcert
npm start
# open:
#   https://dvag-demo-local.com:4200/auth.html
```

### Routes

- `/auth.html`: This demonstrates how to obtain and use a Frontdoor URL. Redirects to the home page after a successful authentication.
