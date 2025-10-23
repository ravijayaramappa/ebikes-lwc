/**
 * Chat Bridge - EventTarget-based iframe ↔ host communication
 * Provides secure, structured interface for widget development
 * Auto-handles theme synchronization and error telemetry
 *
 * Singleton instance exported as ChatBridge
 */
export class ChatBridgeClass extends EventTarget {
  connected: boolean = false;
  parentOrigin: string | null = null;
  currentTheme: Record<string, any> = {};
  currentData: Record<string, any> = {};

  constructor() {
    super();
    this.init();
  }

  init() {
    window.addEventListener('message', this.handleHostMessage.bind(this));
    this.setupErrorCapture();
    this.signalReady();
    // eslint-disable-next-line no-console
    console.log('[ChatBridge] Initialized and ready for communication');
  }

  handleHostMessage(event: MessageEvent<any>) {
    if (!event.data || typeof event.data.type !== 'string') return;
    const { type, data } = event.data;
    switch (type) {
      case 'chat-message-theme':
        this.handleThemeUpdate(data);
        break;
      case 'chat-message-data':
        this.handleDataUpdate(data);
        break;
      case 'chat-message-ready':
        this.handleConnectionReady();
        break;
      default:
        break;
    }
  }

  handleThemeUpdate(themeData: any) {
    this.currentTheme = { ...themeData };
    this.applyThemeToDocument(themeData);
    this.dispatchEvent(new CustomEvent('theme', { detail: themeData }));
  }

  handleDataUpdate(payload: any) {
    this.currentData = { ...payload };
    this.dispatchEvent(new CustomEvent('data', { detail: payload }));
  }

  handleConnectionReady() {
    this.connected = true;
    this.dispatchEvent(new CustomEvent('connected', { detail: { bridge: this } }));
  }

  applyThemeToDocument(themeData: Record<string, any>) {
    const documentElement = document.documentElement as HTMLElement;
    requestAnimationFrame(() => {
      Object.entries(themeData).forEach(([property, value]) => {
        if (property.startsWith('--')) {
          documentElement.style.setProperty(property, String(value));
        }
      });
    });
  }

  setupErrorCapture() {
    window.addEventListener('error', (event: ErrorEvent) => {
      this.reportError({
        type: 'javascript-error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: (event as any).error?.stack,
        timestamp: Date.now()
      });
    });

    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      this.reportError({
        type: 'unhandled-rejection',
        reason: (event.reason as any)?.toString?.() || 'Unknown rejection',
        stack: (event.reason as any)?.stack,
        timestamp: Date.now()
      });
    });
  }

  reportError(errorData: any) {
    this.sendToHost('bridge-error', errorData);
    // eslint-disable-next-line no-console
    console.error('[ChatBridge] Error reported:', errorData);
  }

  signalReady() {
    this.sendToHost('bridge-ready', {
      bridge: 'ChatBridge',
      version: '1.0.0',
      timestamp: Date.now()
    });
    this.setupResizeObserver();
  }

  setupResizeObserver() {
    const startObserver = () => {
      if (typeof (window as any).ResizeObserver === 'undefined') {
        // eslint-disable-next-line no-console
        console.warn('[ChatBridge] ResizeObserver not available in this environment');
        return;
      }

      let scheduled = false;
      let lastHeight = -1;

      const observer = new (window as any).ResizeObserver((entries: any[]) => {
        if (!entries || entries.length === 0) return;
        const entry = entries[0];
        let measuredHeight = 0;
        if (entry.borderBoxSize) {
          if (Array.isArray(entry.borderBoxSize)) {
            measuredHeight = entry.borderBoxSize[0]?.blockSize || 0;
          } else {
            measuredHeight = entry.borderBoxSize.blockSize || 0;
          }
        } else if (entry.contentRect && typeof entry.contentRect.height === 'number') {
          measuredHeight = entry.contentRect.height;
        } else if (entry.target && typeof entry.target.getBoundingClientRect === 'function') {
          measuredHeight = entry.target.getBoundingClientRect().height;
        }
        const heightPx = Math.max(0, Math.ceil(Number(measuredHeight)));
        if (!Number.isFinite(heightPx)) return;
        if (heightPx === lastHeight) return;
        lastHeight = heightPx;
        if (!scheduled) {
          scheduled = true;
          requestAnimationFrame(() => {
            scheduled = false;
            this.sendToHost('bridge-event', { eventType: 'resize', detail: { height: heightPx } });
          });
        }
      });

      observer.observe(document.body, { box: 'border-box' } as any);
      this.sendToHost('bridge-event', {
        eventType: 'widget-ready',
        detail: { bridge: 'ChatBridge', version: '1.0.0', timestamp: Date.now() }
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startObserver as any, { once: true } as any);
    } else {
      startObserver();
    }
  }

  sendToHost(type: string, data: any) {
    try {
      const message = { type, data, source: 'chat-bridge' };
      // eslint-disable-next-line no-console
      console.log('[ChatBridge] Sending message to host:', message);
      window.parent.postMessage(message, '*');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[ChatBridge] Failed to send message to host:', error);
    }
  }

  // Override dispatchEvent to mirror to host (except internal types)
  dispatchEvent(event: Event): boolean {
    const result = super.dispatchEvent(event);
    const type = event.type;
    if (type !== 'theme' && type !== 'data' && type !== 'connected' && type !== 'resize') {
      this.sendToHost('bridge-event', {
        eventType: type,
        detail: (event as CustomEvent).detail,
        timestamp: Date.now()
      });
    }
    return result;
  }

  getTheme() {
    return { ...this.currentTheme };
  }

  getData() {
    return { ...this.currentData };
  }

  isConnected() {
    return this.connected;
  }

  send(eventType: string, detail: any = null) {
    this.dispatchEvent(new CustomEvent(eventType, { detail }));
  }

  requestExpansion(options: Record<string, any> = {}) {
    this.send('expand', { reason: 'user-request', ...options });
  }
}

const bridge = new ChatBridgeClass();
export { bridge as ChatBridge };
export default bridge;


