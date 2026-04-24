import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.britsync.app',
  appName: 'BritSync AI',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false
  }
};

export default config;