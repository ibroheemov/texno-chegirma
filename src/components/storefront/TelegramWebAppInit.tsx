"use client";

import Script from "next/script";

// Loaded on the /do-kon storefront so it also works as a Telegram Mini App:
// when opened via the bot's "web_app" button, this tells Telegram's client
// to drop its own chrome and expand the WebView to full height. Outside
// Telegram (a normal browser visit) these calls are safe no-ops.
export function TelegramWebAppInit() {
  return (
    <Script
      src="https://telegram.org/js/telegram-web-app.js"
      strategy="afterInteractive"
      onLoad={() => {
        const webApp = window.Telegram?.WebApp;
        webApp?.ready();
        webApp?.expand();
      }}
    />
  );
}
