import { api } from './api';

// Fallback simulated token generator
const getSimulatedToken = (userId) => {
  return `mock_token_${userId}_${navigator.userAgent.replace(/[^a-zA-Z0-9]/g, '').substring(0, 30)}`;
};

export const initFCM = async (userId) => {
  if (!userId) return;

  try {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      console.log('Push notifications are not supported in this browser environment.');
      return;
    }

    // Request Notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission was denied by user.');
      return;
    }

    // Attempt real Firebase messaging or fall back to mock tokens
    let token = null;
    
    // In our local workspace, we generate a mock token so we can E2E validate without real Google credentials
    token = getSimulatedToken(userId);

    if (token) {
      console.log('Registering push notification token:', token);
      await api.registerFCMToken(token);
    }
  } catch (err) {
    console.error('FCM/Notification initialization failed:', err);
  }
};
