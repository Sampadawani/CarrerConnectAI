import { useEffect, useRef, useState } from "react";

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || "";
let turnstileApiPromise;

function loadTurnstileApi() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (turnstileApiPromise) return turnstileApiPromise;

  turnstileApiPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.turnstile) resolve(window.turnstile);
      else {
        turnstileApiPromise = undefined;
        reject(new Error("Cloudflare Turnstile did not initialize."));
      }
    };
    script.onerror = () => {
      turnstileApiPromise = undefined;
      script.remove();
      reject(new Error("Cloudflare Turnstile could not be loaded."));
    };
    document.head.appendChild(script);
  });

  return turnstileApiPromise;
}

export default function TurnstileWidget({ action, theme, onToken }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    onToken("");

    if (!siteKey) {
      setError("CAPTCHA is not configured. Set VITE_TURNSTILE_SITE_KEY to enable sign-in.");
      return () => { active = false; };
    }

    setError("");
    loadTurnstileApi().then((turnstile) => {
      if (!active || !containerRef.current) return;
      try {
        const size = window.matchMedia("(max-width: 360px)").matches ? "compact" : "normal";
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme,
          size,
          callback: (token) => {
            if (!active) return;
            setError("");
            onToken(token);
          },
          "expired-callback": () => {
            if (!active) return;
            onToken("");
            setError("CAPTCHA expired. Complete the challenge again.");
          },
          "error-callback": () => {
            if (!active) return;
            onToken("");
            setError("CAPTCHA could not be verified. Reload the page and try again.");
          },
          "timeout-callback": () => {
            if (!active) return;
            onToken("");
            setError("CAPTCHA timed out. Complete the challenge again.");
          },
        });
      } catch (renderError) {
        console.error("Could not render Cloudflare Turnstile:", renderError);
        setError("CAPTCHA could not be displayed. Check the configured site key and domain.");
      }
    }).catch((loadError) => {
      if (!active) return;
      console.error(loadError);
      setError("CAPTCHA could not be loaded. Check your connection and reload the page.");
    });

    return () => {
      active = false;
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [action, theme, onToken]);

  return (
    <div className="turnstile-field">
      <div className="turnstile-widget" ref={containerRef} aria-label="Cloudflare CAPTCHA challenge" />
      {error && <p className="turnstile-error" role="status">{error}</p>}
    </div>
  );
}
