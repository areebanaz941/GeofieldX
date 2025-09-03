// Defensive utilities to reduce noisy interference from aggressive browser extensions

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
  if ((event as PromiseRejectionEvent).reason && (event as PromiseRejectionEvent).reason.message && (event as PromiseRejectionEvent).reason.message.includes('Cannot destructure property')) {
    console.warn('[Extension Interference] Destructuring error caught:', (event as PromiseRejectionEvent).reason.message);
    event.preventDefault();
  }
});

// Global error handler for JavaScript errors
window.addEventListener('error', function(event) {
  const msg = (event as ErrorEvent).message;
  if (msg && msg.includes('Cannot destructure property')) {
    console.warn('[Extension Interference] JavaScript error caught:', msg);
    event.preventDefault();
  }
});

// Specific protection against knowee-ai extension
(function() {
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        try {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement & { className?: { toString(): string } };
            const classNameStr = element.className?.toString() || '';
            const elementId = element.id || '';

            if (
              element.tagName === 'SCRIPT' ||
              classNameStr.includes('knowee') ||
              elementId.includes('knowee') ||
              (element.getAttribute && element.getAttribute('data-extension') === 'knowee-ai')
            ) {
              console.warn('[Extension] knowee-ai script injection detected:', element);
              try {
                (element.style as any).isolation = 'isolate';
                element.setAttribute('data-isolated', 'true');
              } catch (e) {
                console.warn('[Extension] Could not isolate knowee-ai element:', e);
              }
            }
          }
        } catch (error) {
          console.warn('[Extension] Error processing DOM mutation:', error);
        }
      });
    });
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  // Store original methods before extension can override them
  ;(window as any).__originalFetch = window.fetch;
  ;(window as any).__originalXMLHttpRequest = window.XMLHttpRequest;
})();

// Defensive wrapper for console methods to prevent extension interference
(function() {
  const originalConsole = { ...console } as Console;

  ;(['log', 'warn', 'error', 'info'] as const).forEach(method => {
    const original = (originalConsole as any)[method].bind(originalConsole);
    (console as any)[method] = function(...args: any[]) {
      try {
        const stack = new Error().stack || '';
        if (stack.includes('extension://') || stack.includes('chrome-extension://') || stack.includes('knowee-ai')) {
          if (!args[0]?.includes?.('FloatTool') &&
              !args[0]?.includes?.('选区为空') &&
              !args[0]?.includes?.('messageSubscribe')) {
            original('[Extension]', ...args);
          }
        } else {
          original(...args);
        }
      } catch {
        original(...args);
      }
    } as any;
  });
})();

// Enhanced protection for critical global functions
(function() {
  const protectedGlobals: Array<keyof Window> = ['fetch', 'XMLHttpRequest', 'Promise', 'addEventListener', 'removeEventListener'];

  protectedGlobals.forEach((globalName) => {
    const original = (window as any)[globalName];
    if (original) {
      (window as any)[`__original${String(globalName)}`] = original;
      try {
        Object.defineProperty(window, globalName, {
          value: original,
          writable: false,
          configurable: false,
        });
      } catch (e) {
        console.warn(`[Extension] Could not protect global: ${String(globalName)}` , e);
      }
    }
  });
})();

// Prevent extension from interfering with DOM ready state
(function() {
  let isAppReady = false;
  const originalReady = document.readyState;

  setTimeout(() => {
    isAppReady = true;
  }, 100);

  try {
    Object.defineProperty(document, 'readyState', {
      get: function() {
        return isAppReady ? 'complete' : originalReady;
      },
      configurable: false
    });
  } catch {
    // no-op
  }
})();

