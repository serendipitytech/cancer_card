import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.serendipitytech.cancercard",
  appName: "Cancer Card",
  webDir: "out",
  server: {
    // Production URL; for local dev, override with: url: "http://192.168.x.x:3000"
    url: "https://cancer-card.serendipitylabs.cloud",
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: "#7C3AED",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
