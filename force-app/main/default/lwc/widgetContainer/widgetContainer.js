import { LightningElement, api } from 'lwc';

const BASE_TOKENS = ['allow-scripts', 'allow-pointer-lock'];
const OPTIONAL_TOKENS = ['allow-downloads', 'allow-forms', 'allow-modals'];
const BLOCKED_TOKENS = [
    'allow-same-origin',
    'allow-top-navigation',
    'allow-popups'
];

const STATES = {
    LOADING: 'state-loading',
    LOADED: 'state-loaded'
};

export default class WidgetContainer extends LightningElement {
    _iframe;
    _container;

    _currentState = STATES.LOADING;
    _hasExplicitResize = false;
    _readinessTimeout;
    _isFullscreen = false;

    _lastThemeData = {};
    _lastPayloadData = {};

    _src;
    _srcdoc;
    _sandbox;
    _view = 'compact';

    connectedCallback() {
        this._setupMessageListener();
    }

    renderedCallback() {
        if (!this._container) {
            this._container = this.template.querySelector('.container');
            this._iframe = this.template.querySelector('iframe.frame');
            this._applySandbox();
            this._updateIframeSrc();
            this._sendInitialTheme();
        }
    }

    disconnectedCallback() {
        window.removeEventListener('message', this._handleMessage);
        if (this._readinessTimeout) {
            clearTimeout(this._readinessTimeout);
            this._readinessTimeout = null;
        }
    }

    @api
    get src() {
        return this._src;
    }
    set src(v) {
        this._src = v || null;
        this._updateIframeSrc();
    }

    @api
    get srcdoc() {
        return this._srcdoc;
    }
    set srcdoc(v) {
        this._srcdoc = v || null;
        this._updateIframeSrc();
    }

    @api
    get sandbox() {
        return this._sandbox;
    }
    set sandbox(v) {
        this._sandbox = v || null;
        this._applySandbox();
    }

    @api
    get view() {
        return this._view;
    }
    set view(v) {
        this._view = v === 'full' ? 'full' : 'compact';
    }

    get _isFullView() {
        return this._view === 'full';
    }

    _setState(newState) {
        this._currentState = newState;
        if (newState === STATES.LOADED) {
            this._sendInitialData();
        }
    }

    _setupMessageListener() {
        window.addEventListener('message', this._handleMessage);
    }

    _handleMessage = (event) => {
        const sourceWin = this._iframe?.contentWindow;
        if (event.source !== sourceWin) {
            return;
        }
        const payload = event.data || {};
        const { type, data } = payload;
        if (type === 'bridge-event') {
            const { eventType, detail } = data || {};
            if (eventType === 'resize') {
                this._hasExplicitResize = true;
                this._handleResize(detail);
            } else if (eventType === 'dirty') {
                this._handleDirty(detail);
            } else if (eventType === 'widget-ready') {
                this._handleWidgetReady(detail);
            } else if (eventType === 'fullscreen-request') {
                this._handleFullscreenRequest(detail);
            } else {
                this.dispatchEvent(
                    new CustomEvent(eventType, { detail, bubbles: true })
                );
            }
        } else if (type === 'bridge-ready') {
            this._handleBridgeReady(data);
        } else if (type === 'bridge-error') {
            this._handleBridgeError(data);
        }
    };

    _handleResize({ height }) {
        const evt = new CustomEvent('resize', {
            detail: { height },
            cancelable: true
        });
        this.dispatchEvent(evt);
        if (
            !evt.defaultPrevented &&
            !this._isFullscreen &&
            typeof height === 'number' &&
            Number.isFinite(height)
        ) {
            if (this._iframe) this._iframe.style.height = height + 'px';
        }
    }

    _handleWidgetReady() {
        if (this._readinessTimeout) {
            clearTimeout(this._readinessTimeout);
            this._readinessTimeout = null;
        }
        this.dispatchEvent(new CustomEvent('widget-ready', { bubbles: true }));
    }

    _handleDirty(detail) {
        const isDirty = Boolean(detail && detail.dirty);
        this._toggleBeforeUnload(isDirty);
        this.dispatchEvent(
            new CustomEvent('widget-dirty', {
                detail: { dirty: isDirty },
                bubbles: true
            })
        );
    }

    _handleFullscreenRequest() {
        if (!this._isFullscreen) {
            this._enterFullscreen();
        }
    }

    _enterFullscreen() {
        this._isFullscreen = true;
        this._view = 'full';
        if (this._iframe) this._iframe.style.height = '100%';
        this.updateData({ view: 'full' });
        this.dispatchEvent(
            new CustomEvent('fullscreen-entered', {
                detail: { element: this },
                bubbles: true
            })
        );
    }

    _exitFullscreen = () => {
        this._isFullscreen = false;
        this._view = 'compact';
        if (this._iframe) this._iframe.style.height = '';
        this.updateData({ view: 'compact' });
        this.dispatchEvent(
            new CustomEvent('fullscreen-exited', {
                detail: { element: this },
                bubbles: true
            })
        );
    };

    _handleBridgeReady() {
        this._setState(STATES.LOADED);
    }

    _handleBridgeError(errorData) {
        this.dispatchEvent(
            new CustomEvent('widget-bridge-error', { detail: errorData })
        );
    }

    _handleContainerClick() {
        // placeholder
    }

    _applySandbox() {
        const frameEls = [this._iframe].filter(Boolean);
        const tokens = this._computeSandboxTokens();
        frameEls.forEach((f) => {
            f.sandbox = tokens;
        });
    }

    _computeSandboxTokens() {
        const tokens = [...BASE_TOKENS];
        if (this._sandbox) {
            const requested = String(this._sandbox)
                .split(/\s+/)
                .filter(Boolean);
            requested.forEach((t) => {
                if (OPTIONAL_TOKENS.includes(t) && !tokens.includes(t))
                    tokens.push(t);
                if (BLOCKED_TOKENS.includes(t)) {
                    this.dispatchEvent(
                        new CustomEvent('security-violation', {
                            detail: {
                                type: 'blocked-sandbox-token',
                                token: t,
                                element: this
                            }
                        })
                    );
                }
            });
        }
        return tokens.join(' ');
    }

    _updateIframeSrc() {
        const frame = this._iframe;
        if (!frame) return;
        // reset tracking
        this._hasExplicitResize = false;
        this._currentState = STATES.LOADING;
        // clear existing
        frame.removeAttribute('src');
        frame.removeAttribute('srcdoc');
        if (this._src) {
            frame.setAttribute('src', this._src);
        } else if (this._srcdoc) {
            try {
                frame.setAttribute('srcdoc', this._srcdoc);
            } catch {
                frame.setAttribute('src', 'about:blank');
            }
        }
        // load events
        frame.onload = this._handleIframeLoad;
        frame.onerror = this._handleIframeError;
    }

    _handleIframeLoad = () => {
        this.dispatchEvent(
            new CustomEvent('iframe-loaded', {
                detail: { element: this },
                bubbles: true
            })
        );
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this._readinessTimeout = setTimeout(() => {
            if (this._currentState !== STATES.LOADED) {
                this.dispatchEvent(
                    new CustomEvent('widget-readiness-warning', {
                        detail: {
                            element: this,
                            message:
                                'Widget may not be using ChatBridge for readiness signaling'
                        },
                        bubbles: true
                    })
                );
            }
        }, 3000);
    };

    _handleIframeError = (error) => {
        this.dispatchEvent(
            new CustomEvent('widget-error', {
                detail: { error, element: this }
            })
        );
    };

    _postToIframe(type, data) {
        const frame = this._iframe;
        const win = frame && frame.contentWindow;
        if (!win) return;
        try {
            win.postMessage({ type: `chat-message-${type}`, data }, '*');
        } catch {
            // swallow
        }
    }

    _collectDataAttributes() {
        // LWC exposes attributes via this.template.host.attributes
        const host = this.template.host;
        const out = {};
        for (let i = 0; i < host.attributes.length; i++) {
            const a = host.attributes[i];
            if (a.name.startsWith('data-')) {
                out[a.name.replace(/^data-/, '')] = a.value;
            }
        }
        return out;
    }

    _sendInitialTheme() {
        // Send computed CSS custom properties once mounted
        const computed = getComputedStyle(this.template.host);
        const theme = {};
        for (let i = 0; i < computed.length; i++) {
            const name = computed[i];
            if (name.startsWith('--')) {
                const val = computed.getPropertyValue(name).trim();
                if (val) theme[name] = val;
            }
        }
        this._lastThemeData = theme;
        this._postToIframe('theme', theme);
    }

    _sendInitialData() {
        this._postToIframe('theme', this._lastThemeData);
        const payload = this._collectDataAttributes();
        if (JSON.stringify(payload) !== JSON.stringify(this._lastPayloadData)) {
            this._lastPayloadData = payload;
            this._postToIframe('data', payload);
        }
    }

    _toggleBeforeUnload(enable) {
        if (enable) {
            if (!this._beforeUnloadHandler) {
                this._beforeUnloadHandler = (e) => {
                    e.preventDefault();
                    // Chrome requires returnValue to be set
                    // eslint-disable-next-line no-param-reassign
                    e.returnValue = '';
                    return '';
                };
                window.addEventListener(
                    'beforeunload',
                    this._beforeUnloadHandler
                );
            }
        } else if (this._beforeUnloadHandler) {
            window.removeEventListener(
                'beforeunload',
                this._beforeUnloadHandler
            );
            this._beforeUnloadHandler = null;
        }
    }

    @api
    updateData(newData) {
        if (!newData || typeof newData !== 'object') return;
        Object.entries(newData).forEach(([key, value]) => {
            const dataAttr = `data-${String(key).replace(/[A-Z]/g, '-$&').toLowerCase()}`;
            this.template.host.setAttribute(dataAttr, String(value));
        });
        const payload = this._collectDataAttributes();
        this._lastPayloadData = payload;
        this._postToIframe('data', payload);
    }

    @api
    refreshTheme() {
        this._sendInitialTheme();
    }

    get _frameClass() {
        return this._isFullView ? 'frame frameFull' : 'frame';
    }
}
