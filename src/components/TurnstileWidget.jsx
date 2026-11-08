import { useEffect, useRef, useState } from "react";

const SCRIPT_ID = "cloudflare-turnstile-script";
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);
    const script = existing || document.createElement("script");
    script.addEventListener("load", () => resolve(window.turnstile), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Güvenlik doğrulaması yüklenemedi.")),
      { once: true },
    );

    if (!existing) {
      script.id = SCRIPT_ID;
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      document.head.append(script);
    }
  });
}

export function TurnstileWidget({
  siteKey,
  onTokenChange,
  action = "feedback_submit",
  ariaLabel = "Bot koruması doğrulaması",
}) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;

    loadTurnstile()
      .then((turnstile) => {
        if (!active || !containerRef.current) return;
        if (widgetIdRef.current !== null) turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme: "light",
          size: "flexible",
          callback: (token) => onTokenChange(token),
          "expired-callback": () => onTokenChange(""),
          "error-callback": () => {
            onTokenChange("");
            setLoadError("Güvenlik doğrulaması tamamlanamadı. Lütfen yeniden deneyin.");
          },
        });
      })
      .catch((error) => {
        if (active) setLoadError(error.message);
      });

    return () => {
      active = false;
      if (window.turnstile && widgetIdRef.current !== null) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [action, onTokenChange, siteKey]);

  return (
    <div>
      <div ref={containerRef} aria-label={ariaLabel} />
      {loadError ? (
        <p className="mt-2 text-sm font-semibold text-danger-700" role="alert">{loadError}</p>
      ) : null}
    </div>
  );
}
