import { LightningElement, api } from 'lwc';

export default class ProductRegistrationWidget extends LightningElement {
    @api recordId;
    @api baseUrl = 'http://localhost:4200';

    get computedSrc() {
        const url = new URL(this.baseUrl);
        url.pathname = '/register';
        if (this.recordId) {
            url.searchParams.set('productId', this.recordId);
        }
        return url.toString();
    }
}
