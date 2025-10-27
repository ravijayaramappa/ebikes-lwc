import { LightningElement, api } from 'lwc';

export default class DealerLocatorWidget extends LightningElement {
    @api baseUrl = 'http://localhost:4200';

    get computedSrc() {
        const url = new URL(this.baseUrl);
        url.pathname = '/dealer-locator';
        return url.toString();
    }
}
