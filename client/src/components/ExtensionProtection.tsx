import { useEffect } from 'react';
import { detectKnoweeAI, detectExtensionInterference } from '@/lib/utils';

export function ExtensionProtection() {
  useEffect(() => {
    // Monitor for extension interference
    const monitorExtensions = () => {
      if (detectKnoweeAI()) {
        console.warn('[Extension] knowee-ai detected - implementing isolation measures');
        
        // Prevent knowee-ai from interfering with our app's DOM
        const knoweeElements = document.querySelectorAll('[class*="knowee"], [id*="knowee"], [data-extension="knowee-ai"]');
        knoweeElements.forEach(element => {
          try {
            (element as HTMLElement).style.isolation = 'isolate';
            (element as HTMLElement).style.zIndex = '1';
            element.setAttribute('data-app-isolated', 'true');
          } catch (e) {
            console.warn('[Extension] Could not isolate knowee-ai element:', e);
          }
        });
        
        // Prevent extension from capturing our app's events
        const originalAddEventListener = document.addEventListener;
        document.addEventListener = function(type, listener, options) {
          // Check if this is our app's event or extension's
          const stack = new Error().stack || '';
          if (stack.includes('knowee-ai') || stack.includes('FloatTool')) {
            console.warn('[Extension] Blocked knowee-ai event listener:', type);
            return;
          }
          return originalAddEventListener.call(this, type, listener, options);
        };
      }
      
      if (detectExtensionInterference()) {
        console.warn('[Extension] General extension interference detected');
      }
    };
    
    // Run immediately and then periodically
    monitorExtensions();
    const interval = setInterval(monitorExtensions, 5000);
    
    // Cleanup
    return () => {
      clearInterval(interval);
    };
  }, []);
  
  // This component doesn't render anything - it's just for side effects
  return null;
}

export default ExtensionProtection;