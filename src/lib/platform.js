/**
 * Runtime detection of which shell the SPA is running inside.
 *
 * Web browser, Capacitor (iOS/Android WebView), and Electron all expose
 * different capabilities — APIs that exist in one will silently fail in
 * another. Use these helpers to gate platform-specific code paths.
 */

/** True when the page is inside a Capacitor native shell (iOS or Android app). */
export function isCapacitorNative() {
  if (typeof window === "undefined") return false;
  const cap = window.Capacitor;
  if (cap && typeof cap.isNativePlatform === "function") {
    return cap.isNativePlatform();
  }
  return !!cap?.isNative;
}

/** True when the page is inside Electron's BrowserWindow. */
export function isElectron() {
  if (typeof window === "undefined") return false;
  if (
    typeof navigator !== "undefined" &&
    navigator.userAgent &&
    navigator.userAgent.toLowerCase().includes("electron")
  ) {
    return true;
  }
  return (
    typeof window.process === "object" &&
    window.process?.versions?.electron != null
  );
}

/** True when the page is in a plain desktop/mobile browser tab (not native shell). */
export function isWebBrowser() {
  return !isCapacitorNative() && !isElectron();
}

/**
 * Open a URL the right way for the current platform.
 *
 *  - Capacitor native: if @capacitor/browser is installed (Browser plugin
 *    auto-registered onto window.Capacitor.Plugins), open in an in-app
 *    browser (SafariViewController on iOS, Custom Tabs on Android). The
 *    React SPA stays alive in the WebView underneath. Returns a handle
 *    that resolves when the user dismisses the in-app browser.
 *  - Else: navigates the current page (web tab or Electron window).
 *
 * Returns { kind: "in-app-browser" | "same-window", onClosed?: Promise<void> }
 */
export async function openExternalUrl(url) {
  const cap = typeof window !== "undefined" ? window.Capacitor : null;
  const Browser = cap?.Plugins?.Browser;

  if (isCapacitorNative() && Browser && typeof Browser.open === "function") {
    let resolveClosed;
    const onClosed = new Promise((resolve) => {
      resolveClosed = resolve;
    });

    let listener = null;
    try {
      listener = await Browser.addListener("browserFinished", () => {
        try {
          listener?.remove?.();
        } catch (_) {}
        resolveClosed();
      });
    } catch (_) {
      // Older plugin versions: no listener API. Resolve immediately on open.
      setTimeout(() => resolveClosed(), 0);
    }

    await Browser.open({ url });
    return { kind: "in-app-browser", onClosed };
  }

  window.location.assign(url);
  return { kind: "same-window" };
}
