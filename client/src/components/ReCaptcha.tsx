import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

interface ReCaptchaProps {
  siteKey: string;
  onChange?: (token: string | null) => void;
  onExpired?: () => void;
  onError?: () => void;
  theme?: 'light' | 'dark';
  size?: 'compact' | 'normal';
  className?: string;
}

export interface ReCaptchaRef {
  reset: () => void;
  execute: () => void;
  getResponse: () => string;
}

export const ReCaptcha = forwardRef<ReCaptchaRef, ReCaptchaProps>(({
  siteKey,
  onChange,
  onExpired,
  onError,
  theme = 'light',
  size = 'normal',
  className = ''
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetIdRef.current !== null && window.grecaptcha) {
        window.grecaptcha.reset(widgetIdRef.current);
      }
    },
    execute: () => {
      if (widgetIdRef.current !== null && window.grecaptcha) {
        window.grecaptcha.execute(widgetIdRef.current);
      }
    },
    getResponse: () => {
      if (widgetIdRef.current !== null && window.grecaptcha) {
        return window.grecaptcha.getResponse(widgetIdRef.current);
      }
      return '';
    }
  }));

  useEffect(() => {
    const renderRecaptcha = () => {
      if (window.grecaptcha && window.grecaptcha.render && containerRef.current) {
        // Clear any existing content first
        if (containerRef.current.innerHTML) {
          containerRef.current.innerHTML = '';
        }
        
        // Only render if not already rendered
        if (widgetIdRef.current === null) {
          try {
            widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
              sitekey: siteKey,
              callback: onChange,
              'expired-callback': onExpired,
              'error-callback': onError,
              theme: theme,
              size: size,
            });
          } catch (e) {
            // Handle reCAPTCHA already rendered error
            console.warn('reCAPTCHA render error:', e);
          }
        }
      }
    };

    if (window.grecaptcha && window.grecaptcha.render) {
      renderRecaptcha();
    } else {
      window.grecaptchaReadyCallback = renderRecaptcha;
    }

    return () => {
      if (widgetIdRef.current !== null && window.grecaptcha) {
        try {
          // Reset the widget and clear the container
          if (window.grecaptcha.reset) {
            window.grecaptcha.reset(widgetIdRef.current);
          }
          if (containerRef.current) {
            containerRef.current.innerHTML = '';
          }
          widgetIdRef.current = null;
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    };
  }, [siteKey, onChange, onExpired, onError, theme, size]);

  return <div ref={containerRef} className={className} data-testid="recaptcha-widget" />;
});

ReCaptcha.displayName = 'ReCaptcha';

// Extend Window interface for TypeScript
declare global {
  interface Window {
    grecaptcha: any;
    grecaptchaReadyCallback?: () => void;
  }
}