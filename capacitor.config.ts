import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.myhome.myedls',
  appName: 'MyEDLS',
  webDir: 'dist',
  // Configuration pour développement (décommenter pour tester en local)
  // server: {
  //   url: 'http://localhost:8080',
  //   cleartext: true
  // },
  plugins: {
    Camera: {
      presentationStyle: 'fullscreen'
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#000000',
      androidSplashResourceName: 'splash',
      iosSplashResourceName: 'Default',
      // Force le masquage du splash screen même si l'app n'est pas prête
      launchAutoHide: true,
      // Timeout pour éviter que le splash reste affiché indéfiniment
      showDuration: 3000,
      fadeInDuration: 200,
      fadeOutDuration: 200
    },
    Geolocation: {
      permissions: {
        android: {
          fineLocation: ['android.permission.ACCESS_FINE_LOCATION'],
          coarseLocation: ['android.permission.ACCESS_COARSE_LOCATION']
        },
        ios: {
          locationWhenInUse: 'MyEDLS a besoin de votre localisation pour géolocaliser automatiquement vos projets'
        }
      }
    }
  }
};

export default config;
