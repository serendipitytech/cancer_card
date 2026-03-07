import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";

let initialized = false;

export async function initCapacitor() {
  if (initialized || !Capacitor.isNativePlatform()) return;
  initialized = true;

  await configureStatusBar();
  await hideSplashScreen();
  listenAppLifecycle();
}

async function configureStatusBar() {
  try {
    await StatusBar.setStyle({ style: Style.Light });
  } catch {
    // Status bar plugin not available
  }
}

async function hideSplashScreen() {
  try {
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch {
    // Splash screen plugin not available
  }
}

function listenAppLifecycle() {
  App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) {
      window.dispatchEvent(new CustomEvent("capacitor:foreground"));
    }
  });

  App.addListener("backButton", () => {
    if (window.history.length > 1) {
      window.history.back();
    }
  });
}

export async function openExternalUrl(url: string) {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url, presentationStyle: "popover" });
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
