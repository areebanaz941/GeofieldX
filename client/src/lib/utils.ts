import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility functions for safe destructuring and object validation
export function isValidObject(obj: any): obj is object {
  return obj !== null && obj !== undefined && typeof obj === 'object' && !Array.isArray(obj);
}

export function safeDestructure<T extends Record<string, any>>(
  obj: any,
  defaultValues: Partial<T> = {}
): T {
  if (!isValidObject(obj)) {
    console.warn('safeDestructure: Invalid object provided:', obj);
    return defaultValues as T;
  }
  
  return { ...defaultValues, ...obj } as T;
}

export function safeGet<T>(obj: any, path: string, defaultValue?: T): T | undefined {
  if (!isValidObject(obj)) {
    return defaultValue;
  }
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (!isValidObject(current) || !(key in current)) {
      return defaultValue;
    }
    current = current[key];
  }
  
  return current as T;
}

// Safe event handler wrapper
export function safeEventHandler<T extends Event>(
  handler: (event: T) => void,
  fallback?: (error: Error, event: T) => void
) {
  return (event: T) => {
    try {
      handler(event);
    } catch (error) {
      console.error('Event handler error:', error);
      if (fallback) {
        fallback(error as Error, event);
      }
    }
  };
}

// Safe async operation wrapper
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    console.error('Async operation failed:', error);
    return fallback;
  }
}

// Extension interference detection
export function detectExtensionInterference(): boolean {
  try {
    // Check for common extension signatures
    const stack = new Error().stack || '';
    return stack.includes('extension://') || 
           stack.includes('chrome-extension://') ||
           stack.includes('moz-extension://') ||
           stack.includes('knowee-ai');
  } catch {
    return false;
  }
}

// Specific knowee-ai extension detection
export function detectKnoweeAI(): boolean {
  try {
    // Check for knowee-ai specific elements or behaviors
    return document.querySelector('[data-extension="knowee-ai"]') !== null ||
           document.querySelector('.knowee-floattool') !== null ||
           window.location.href.includes('knowee-ai') ||
           !!document.querySelector('script[src*="knowee"]');
  } catch {
    return false;
  }
}

// Safe script injection protection
export function protectFromScriptInjection(): void {
  // Monitor for script injections
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          
          // Check for suspicious script injections
          if (element.tagName === 'SCRIPT' && 
              (element.getAttribute('src')?.includes('knowee') ||
               element.textContent?.includes('knowee-ai') ||
               element.textContent?.includes('FloatTool'))) {
            console.warn('[Extension] Potentially harmful script injection blocked:', element);
            
            // Isolate the script
            try {
              element.setAttribute('data-isolated', 'true');
              (element as HTMLElement).style.isolation = 'isolate';
            } catch (e) {
              console.warn('[Extension] Could not isolate injected script:', e);
            }
          }
        }
      });
    });
  });
  
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true
  });
}

// Safe property access with extension interference protection
export function safePropertyAccess<T>(
  obj: any,
  property: string,
  defaultValue?: T
): T | undefined {
  try {
    if (!isValidObject(obj)) {
      return defaultValue;
    }
    
    const value = obj[property];
    return value !== undefined ? value : defaultValue;
  } catch (error) {
    if (detectExtensionInterference()) {
      console.warn('[Extension Interference] Property access failed:', property, error);
    } else {
      console.error('Property access failed:', property, error);
    }
    return defaultValue;
  }
}
