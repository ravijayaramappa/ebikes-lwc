import { LightningElement, api } from 'lwc';
import {
    getFocusedTabInfo,
    setTabUnsavedChanges
} from 'lightning/platformWorkspaceApi';

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

    // Debug logging helper for POC
    _debugEnabled = true;
    _log(...args) {
        if (this._debugEnabled) {
            // eslint-disable-next-line no-console
            console.log('[WidgetContainer]', JSON.stringify(args, null, 2));
        }
    }

    // Workspace API tracking for SPA unsaved-changes (console apps only)
    _wsSupported = false;
    _wsTabId;
    _wsInitialized = false;
    _wsDirty = false;

    connectedCallback() {
        this._setupMessageListener();
        this._log('connectedCallback');
    }

    renderedCallback() {
        if (!this._container) {
            this._container = this.template.querySelector('.container');
            this._iframe = this.template.querySelector('iframe.frame');
            this._applySandbox();
            this._updateIframeSrc();
            this._sendInitialTheme();
            this._log('renderedCallback: iframe ready');
        }
    }

    disconnectedCallback() {
        window.removeEventListener('message', this._handleMessage);
        if (this._readinessTimeout) {
            clearTimeout(this._readinessTimeout);
            this._readinessTimeout = null;
        }
        // Best-effort cleanup of workspace unsaved state
        if (this._wsDirty) {
            this._setWorkspaceUnsaved(false);
        }
        this._log('disconnectedCallback');
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
        this._log('receive', type, data);
        if (type === 'bridge-event') {
            const { eventType, detail } = data || {};
            this._log('bridge-event', eventType, detail);
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
            this._log('applied resize', height);
        }
    }

    _handleWidgetReady() {
        if (this._readinessTimeout) {
            clearTimeout(this._readinessTimeout);
            this._readinessTimeout = null;
        }
        this.dispatchEvent(new CustomEvent('widget-ready', { bubbles: true }));
        this._log('widget-ready');
    }

    _handleDirty(detail) {
        const isDirty = Boolean(detail && detail.dirty);
        this._toggleBeforeUnload(isDirty);
        this._setWorkspaceUnsaved(isDirty);
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

    async _ensureWorkspace() {
        if (this._wsInitialized) return;
        this._wsInitialized = true;
        try {
            const info = await getFocusedTabInfo();
            if (info && info.tabId) {
                this._wsSupported = true;
                this._wsTabId = info.tabId;
            }
        } catch {
            this._wsSupported = false;
        }
    }

    async _setWorkspaceUnsaved(hasUnsaved) {
        if (this._wsDirty === hasUnsaved) return;
        this._wsDirty = hasUnsaved;
        await this._ensureWorkspace();
        if (!this._wsSupported || !this._wsTabId) return;
        try {
            await setTabUnsavedChanges({
                tabId: this._wsTabId,
                hasUnsavedChanges: hasUnsaved
            });
        } catch {
            // ignore errors silently
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
        this._log('enter fullscreen');
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
        this._log('exit fullscreen');
    };

    _handleBridgeReady() {
        this._setState(STATES.LOADED);
        this._log('bridge-ready');
    }

    _handleBridgeError(errorData) {
        this.dispatchEvent(
            new CustomEvent('widget-bridge-error', { detail: errorData })
        );
        this._log('bridge-error', errorData);
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
        this._log('sandbox', tokens);
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
        this._log(
            'updateIframeSrc',
            this._src ? 'src' : this._srcdoc ? 'srcdoc' : 'blank'
        );
    }

    _handleIframeLoad = () => {
        this.dispatchEvent(
            new CustomEvent('iframe-loaded', {
                detail: { element: this },
                bubbles: true
            })
        );
        this._log('iframe-loaded');
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
                this._log('widget-readiness-warning');
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
            const msgType = `salesforce-${type}`;
            win.postMessage(
                'BRIDGE-JSON:' + JSON.stringify({ type: msgType, data }),
                '*'
            );
            this._log('postMessage', msgType, data);
        } catch (e) {
            this._log('postMessage error', e.message);
        }
    }

    _collectDataAttributes() {
        // LWC exposes attributes via this.template.host.attributes
        const host = this.template.host;
        const out = {};
        for (let i = 0; i < host.attributes.length; i++) {
            const a = host.attributes[i];
            if (a.name.startsWith('data-')) {
                const raw = a.name.replace(/^data-/, '');
                // convert kebab-case to camelCase to match expected keys like productName
                const camel = raw.replace(/-([a-z])/g, (m, c) =>
                    c.toUpperCase()
                );
                out[camel] = a.value;
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
