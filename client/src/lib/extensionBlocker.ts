// Extension blocking utilities for knowee-ai and other interfering extensions

export class ExtensionBlocker {
  private static instance: ExtensionBlocker;
  private observers: MutationObserver[] = [];
  private blockedScripts: Set<string> = new Set();
  private isActive = false;

  static getInstance(): ExtensionBlocker {
    if (!ExtensionBlocker.instance) {
      ExtensionBlocker.instance = new ExtensionBlocker();
    }
    return ExtensionBlocker.instance;
  }

  activate(): void {
    if (this.isActive) return;
    this.isActive = true;

    console.log('[ExtensionBlocker] Activating protection against script injection');

    // Block script injection
    this.blockScriptInjection();
    
    // Monitor DOM changes
    this.monitorDOMChanges();
    
    // Protect critical APIs
    this.protectAPIs();
    
    // Handle knowee-ai specific interference
    this.handleKnoweeAI();
  }

  deactivate(): void {
    this.isActive = false;
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    console.log('[ExtensionBlocker] Deactivated');
  }

  private blockScriptInjection(): void {
    // Override document.createElement to intercept script creation
    const originalCreateElement = document.createElement;
    
    document.createElement = function(tagName: string, options?: ElementCreationOptions) {
      const element = originalCreateElement.call(this, tagName, options);
      
      if (tagName.toLowerCase() === 'script') {
        const script = element as HTMLScriptElement;
        
        // Monitor script src changes
        const originalSetAttribute = script.setAttribute;
        script.setAttribute = function(name: string, value: string) {
          if (name === 'src' && (value.includes('knowee') || value.includes('extension://'))) {
            console.warn('[ExtensionBlocker] Blocked script injection:', value);
            ExtensionBlocker.getInstance().blockedScripts.add(value);
            return;
          }
          return originalSetAttribute.call(this, name, value);
        };
      }
      
      return element;
    };
  }

  private monitorDOMChanges(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            // Check for knowee-ai elements
            if (this.isKnoweeAIElement(element)) {
              this.isolateElement(element);
            }
            
            // Check for script injections
            if (element.tagName === 'SCRIPT') {
              const script = element as HTMLScriptElement;
              if (this.isSuspiciousScript(script)) {
                this.blockScript(script);
              }
            }
          }
        });
      });
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'class', 'id']
    });

    this.observers.push(observer);
  }

  private protectAPIs(): void {
    // Protect fetch from being overridden
    if (window.fetch && !(window as any).__originalFetch) {
      (window as any).__originalFetch = window.fetch;
      
      // Create a protected fetch wrapper
      const protectedFetch = function(...args: Parameters<typeof fetch>) {
        const stack = new Error().stack || '';
        if (stack.includes('knowee-ai') || stack.includes('FloatTool')) {
          console.warn('[ExtensionBlocker] Blocked fetch call from extension');
          return Promise.reject(new Error('Blocked by extension protection'));
        }
        return (window as any).__originalFetch.apply(this, args);
      };

      try {
        Object.defineProperty(window, 'fetch', {
          value: protectedFetch,
          writable: false,
          configurable: false
        });
      } catch (e) {
        console.warn('[ExtensionBlocker] Could not protect fetch API:', e);
      }
    }
  }

  private handleKnoweeAI(): void {
    // Specific handling for knowee-ai extension
    const interval = setInterval(() => {
      // Find and neutralize knowee-ai elements
      const knoweeElements = document.querySelectorAll(
        '[class*="knowee"], [id*="knowee"], [data-extension="knowee-ai"], [class*="FloatTool"]'
      );
      
      knoweeElements.forEach(element => {
        this.isolateElement(element);
      });

      // Prevent knowee-ai from interfering with our app's state
      if ((window as any).knoweeAI) {
        console.warn('[ExtensionBlocker] knowee-ai global detected - neutralizing');
        try {
          delete (window as any).knoweeAI;
        } catch (e) {
          console.warn('[ExtensionBlocker] Could not remove knowee-ai global:', e);
        }
      }
    }, 1000);

    // Store interval for cleanup
    setTimeout(() => clearInterval(interval), 30000); // Stop after 30 seconds
  }

  private isKnoweeAIElement(element: Element): boolean {
    return element.className?.includes('knowee') ||
           element.id?.includes('knowee') ||
           element.getAttribute('data-extension') === 'knowee-ai' ||
           element.className?.includes('FloatTool') ||
           element.tagName === 'KNOWEE-AI';
  }

  private isSuspiciousScript(script: HTMLScriptElement): boolean {
    const src = script.src || '';
    const content = script.textContent || '';
    
    return src.includes('knowee') ||
           src.includes('extension://') ||
           content.includes('knowee-ai') ||
           content.includes('FloatTool') ||
           content.includes('messageSubscribe');
  }

  private isolateElement(element: Element): void {
    try {
      const htmlElement = element as HTMLElement;
      htmlElement.style.isolation = 'isolate';
      htmlElement.style.zIndex = '1';
      htmlElement.style.pointerEvents = 'none';
      element.setAttribute('data-app-isolated', 'true');
      
      console.warn('[ExtensionBlocker] Isolated extension element:', element);
    } catch (e) {
      console.warn('[ExtensionBlocker] Could not isolate element:', e);
    }
  }

  private blockScript(script: HTMLScriptElement): void {
    try {
      // Prevent script execution
      script.type = 'text/blocked';
      script.setAttribute('data-blocked', 'true');
      
      const src = script.src || 'inline';
      this.blockedScripts.add(src);
      
      console.warn('[ExtensionBlocker] Blocked script:', src);
    } catch (e) {
      console.warn('[ExtensionBlocker] Could not block script:', e);
    }
  }

  getBlockedScripts(): string[] {
    return Array.from(this.blockedScripts);
  }
}

// Initialize extension blocker early
export function initializeExtensionBlocker(): void {
  if (typeof window !== 'undefined') {
    const blocker = ExtensionBlocker.getInstance();
    blocker.activate();
  }
}

// Export singleton instance
export const extensionBlocker = ExtensionBlocker.getInstance();