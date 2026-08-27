// Firebase Cloud Messaging Background Service Worker
// Fully modular, production-grade Web Push handler for TS Price Manager

importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-messaging-compat.js');

// Initialize Firebase App in service worker context
firebase.initializeApp({
  projectId: "gen-lang-client-0836292212",
  appId: "1:389975625261:web:eab4ca2094c33084fd72a4",
  apiKey: "AIzaSyBc25flBicCmC7ps-fs_LKgwBIwh2puHQs",
  authDomain: "gen-lang-client-0836292212.firebaseapp.com",
  storageBucket: "gen-lang-client-0836292212.firebasestorage.app",
  messagingSenderId: "389975625261"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const title = payload.notification?.title || payload.data?.title || 'TS Price Manager';
  const body = payload.notification?.body || payload.data?.body || 'New update available!';
  const icon = payload.notification?.image || payload.data?.image || '/logoTSPM.png';
  const badge = '/logoTSPM.png';

  // Extract notification attributes
  const category = payload.data?.category || 'system';
  const priority = payload.data?.priority || 'medium';
  const screen = payload.data?.screen || 'home';

  const notificationOptions = {
    body: body,
    icon: icon,
    badge: badge,
    vibrate: priority === 'high' ? [200, 100, 200] : [100],
    tag: `ts-pm-notif-${category}`,
    requireInteraction: priority === 'high',
    data: {
      screen: screen,
      category: category,
      clickUrl: payload.data?.clickUrl || `/?screen=${screen}`
    }
  };

  self.registration.showNotification(title, notificationOptions);
});

// Deep-linking notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click received:', event.notification);
  event.notification.close();

  const targetScreen = event.notification.data?.screen || 'home';
  const targetUrl = event.notification.data?.clickUrl || `/?screen=${targetScreen}`;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. Look for an already active window/tab of our application
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.indexOf(self.location.origin) !== -1) {
          // Focus the existing tab
          if (client.focus) {
            client.focus();
          }
          // Dispatch navigation action to active React client via MessagePort API
          if (client.postMessage) {
            client.postMessage({
              type: 'NAVIGATE_TO_SCREEN',
              screen: targetScreen
            });
          }
          return;
        }
      }

      // 2. If no window is currently open, open a new window directly carrying the query parameters
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
