import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import NAME_FIELD from '@salesforce/schema/Product__c.Name';

export default class ProductRegistrationWidget extends LightningElement {
    @api recordId;
    @api baseUrl = 'http://localhost:4200';

    _productName;
    _lastSent;
    _debugEnabled = true;
    _log(...args) {
        if (this._debugEnabled) {
            // eslint-disable-next-line no-console
            console.log(
                '[ProductRegistrationWidget]',
                JSON.stringify(args, null, 2)
            );
        }
    }

    get computedSrc() {
        const url = new URL(this.baseUrl);
        url.pathname = '/register';
        if (this.recordId) {
            url.searchParams.set('productId', this.recordId);
        }
        return url.toString();
    }

    @wire(getRecord, { recordId: '$recordId', fields: [NAME_FIELD] })
    wiredRecord({ data }) {
        if (data) {
            this._productName = getFieldValue(data, NAME_FIELD);
            this._log('wiredRecord', {
                recordId: this.recordId,
                productName: this._productName
            });
            this._pushData();
        }
    }

    renderedCallback() {
        // Ensure data is pushed after child renders
        this._pushData();
    }

    _pushData() {
        const wc = this.template.querySelector('c-widget-container');
        if (!wc) return;
        const payload = {
            productId: this.recordId || '',
            productName: this._productName || ''
        };
        const last = this._lastSent || {};
        if (
            last.productId === payload.productId &&
            last.productName === payload.productName
        ) {
            return;
        }
        this._lastSent = payload;
        wc.updateData(payload);
        this._log('updateData', payload);
    }
}
