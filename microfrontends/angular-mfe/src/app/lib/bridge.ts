/**
 * Bridge - EventTarget-based iframe ↔ host communication
 * Provides secure, structured interface for widget development
 * Auto-handles theme synchronization and error telemetry
 *
 * Singleton instance exported as Bridge
 */

class BridgeClass extends EventTarget {
  #connected: boolean = false;
  #currentTheme: Record<string, any> = {};
  #currentData: Record<string, any> = {};

  constructor() {
    super();
    window.addEventListener('message', (e: MessageEvent<any>) => this.#handleHostMessage(e));
    this.#setupErrorCapture();
    this.#sendToHost('bridge-ready');
    this.#setupResizeObserver();
    // eslint-disable-next-line no-console
    console.log('[Bridge] Initialized and ready for communication');
  }

  #handleHostMessage(event: MessageEvent<any>) {
    if (typeof event.data !== 'string' || !event.data.startsWith('BRIDGE-JSON:')) {
      return;
    }
    let type: string;
    let data: any;
    try {
      const json = JSON.parse(event.data.slice(12));
      type = json.type;
      data = json.data;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[Bridge] Failed to parse message:', error);
      return;
    }
    // eslint-disable-next-line no-console
    console.log('[Bridge] host->widget', type, data);
    switch (type) {
      case 'salesforce-theme':
        this.#handleThemeUpdate(data);
        break;
      case 'salesforce-data':
        this.#handleDataUpdate(data);
        break;
      case 'bridge-ready':
        this.#handleConnectionReady();
        break;
    }
  }

  #handleThemeUpdate(themeData: any) {
    this.#currentTheme = { ...themeData };
    this.#applyThemeToDocument(themeData);
    // use super to escape the override
    super.dispatchEvent(new CustomEvent('theme', { detail: themeData }));
  }

  #handleDataUpdate(payload: any) {
    this.#currentData = { ...payload };
    // use super to escape the override
    super.dispatchEvent(new CustomEvent('data', { detail: payload }));
  }

  #handleConnectionReady() {
    this.#connected = true;
    // use super to escape the override
    super.dispatchEvent(new CustomEvent('connected'));
  }

  #applyThemeToDocument(themeData: Record<string, any>) {
    const documentElement = document.documentElement as HTMLElement;
    requestAnimationFrame(() => {
      Object.entries(themeData).forEach(([property, value]) => {
        if (property.startsWith('--')) {
          documentElement.style.setProperty(property, String(value));
        }
      });
    });
  }

  #setupErrorCapture() {
    // this allows salesforce to collect telemetry about errors in your app
    window.addEventListener('error', (event: ErrorEvent) => {
      this.#sendToHost('bridge-error', {
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
      this.#sendToHost('bridge-error', {
        type: 'unhandled-rejection',
        reason: (event.reason as any)?.toString?.() || 'Unknown rejection',
        stack: (event.reason as any)?.stack,
        timestamp: Date.now()
      });
    });
  }

  #setupResizeObserver() {
    const startObserver = () => {
      if (typeof (window as any).ResizeObserver === 'undefined') {
        // eslint-disable-next-line no-console
        console.warn('[Bridge] ResizeObserver not available in this environment');
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
            this.#sendToHost('bridge-event', { eventType: 'resize', detail: { height: heightPx } });
          });
        }
      });

      observer.observe(document.body, { box: 'border-box' } as any);
      this.#sendToHost('bridge-event', {
        eventType: 'widget-ready',
        detail: { bridge: 'Bridge', version: '1.0.0', timestamp: Date.now() }
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startObserver as any, { once: true } as any);
    } else {
      startObserver();
    }
  }

  #sendToHost(type: string, data?: any) {
    try {
      const message = { type, data, source: 'bridge' };
      // eslint-disable-next-line no-console
      console.log('[Bridge] Sending message to host:', message);
      window.parent.postMessage(message, '*');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[Bridge] Failed to send message to host:', error);
    }
  }

  // Override dispatchEvent to forward custom events to the host via post message
  dispatchEvent(event: Event): boolean {
    const result = super.dispatchEvent(event);
    this.#sendToHost('custom-event', {
      eventType: event.type,
      detail: (event as CustomEvent).detail
    });
    return result;
  }

  getTheme() {
    return { ...this.#currentTheme };
  }

  getData() {
    return { ...this.#currentData };
  }

  isConnected() {
    return this.#connected;
  }
}

const bridge = new BridgeClass();

export default bridge;
