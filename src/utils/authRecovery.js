export function readRecoveryIntent(urlValue) {
  try {
    const url = new URL(urlValue);
    const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
    const errorCode = hash.get("error_code") || url.searchParams.get("error_code");
    const error = hash.get("error") || url.searchParams.get("error");

    if (errorCode || error) return "invalid";

    const recoveryType = hash.get("type") || url.searchParams.get("type");
    if (recoveryType === "recovery" || url.searchParams.has("code")) return "recovery";

    return "missing";
  } catch {
    return "invalid";
  }
}

export function scrubAuthParameters() {
  if (typeof window === "undefined") return;
  window.history.replaceState(
    null,
    "",
    window.location.pathname,
  );
}
