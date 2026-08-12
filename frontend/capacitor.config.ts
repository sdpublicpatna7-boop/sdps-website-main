import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.sdpublic.qpbuilder',
  appName: 'SDPS QP Builder',
  webDir: 'build/qp-portal/app',
  backgroundColor: '#090d16',
  server: {
    androidScheme: 'https'
  },
  android: {
    overScrollMode: 'never'
  },
  ios: {
    contentInset: 'never'
  }
};

export default config;
