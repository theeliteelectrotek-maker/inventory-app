// Firebase configuration
// All values come from environment variables — set them in frontend/.env
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY           || 'AIzaSyCPzU2dcISR8CQJZ-ML_rqnAMbJjNeudCU',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN       || 'tee-inventory-manager.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID        || 'tee-inventory-manager',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET    || 'tee-inventory-manager.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '65274257324',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID            || '1:65274257324:web:370a41afa7d1c16a21e409',
};

export default firebaseConfig;
