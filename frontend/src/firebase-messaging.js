import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import firebaseConfig from './firebase-config';
import { api } from './api';

// Initialise Firebase app (singleton-safe)
const firebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

// Exported messaging instance (used by Layout for foreground handler)
let messagingInstance = null;

function getMessagingInstance() {
  if (!messagingInstance) {
    messagingInstance = getMessaging(firebaseApp);
  }
  return messagingInstance;
}

/**
 * Initialise FCM for the given userId.
 * - Requests notification permission
 * - Registers firebase-messaging-sw.js service worker
 * - Retrieves a real FCM token using the VAPID key
 * - Saves the token to the backend against this user
 *
 * @param {string} userId
 * @returns {Promise<string|null>} The FCM token, or null on failure
 */
export const initFCM = async (userId) => {
  if (!userId) return null;

  try {
    if (typeof window === 'undefined'
      || !('Notification' in window)
      || !('serviceWorker' in navigator)
    ) {
      console.warn('[FCM] Push notifications are not supported in this environment.');
      return null;
    }

    // 1. Request / confirm notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[FCM] Notification permission denied.');
      return null;
    }

    // 2. Register the dedicated Firebase messaging service worker
    //    FCM REQUIRES this file to be at /firebase-messaging-sw.js (root scope)
    const swRegistration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
      { scope: '/' }
    );
    await navigator.serviceWorker.ready;
    console.log('[FCM] firebase-messaging-sw.js registered:', swRegistration.scope);

    // 3. Obtain a real FCM token (VAPID key links your server to FCM)
    const messaging = getMessagingInstance();
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    if (!token) {
      console.warn('[FCM] No token returned — check VAPID key and Firebase project config.');
      return null;
    }

    console.log('[FCM] Token obtained:', token.substring(0, 20) + '...');

    // 4. Register token in the backend (stored in user.fcmTokens[])
    await api.registerFCMToken(token);
    console.log('[FCM] Token registered with backend successfully.');

    // Cache token presence in localStorage so Settings panel can show status
    localStorage.setItem('fcm_token_cached', '1');


    // 5. Foreground message handler — when the app is open we show
    //    a native notification manually because FCM does not auto-show
    //    notifications when the tab is in the foreground.
    onMessage(messaging, (payload) => {
      console.log('[FCM] Foreground message received:', payload);
      const { title, body, icon } = payload.notification || {};
      const clickAction = payload.data?.clickAction || '/';

      if (Notification.permission === 'granted' && title) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(title, {
            body: body || '',
            icon: icon || '/icon-192.png',
            badge: '/favicon.png',
            data: { clickAction },
          });
        });
      }
    });

    return token;
  } catch (err) {
    console.error('[FCM] Initialization failed:', err);
    return null;
  }
};

export { getMessagingInstance };
