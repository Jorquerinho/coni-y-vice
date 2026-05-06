// ================================================
// SERVICE WORKER — Vice & Coni 💕
// Con soporte Firebase Cloud Messaging (FCM)
// ================================================

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ⚠️ Estos valores deben coincidir exactamente con los de index.html
firebase.initializeApp({
apiKey: "AIzaSyAmvJLykvvzn1T53YQgRGYtnSlq1LqZX2Q",
authDomain: "appamorvicente.firebaseapp.com",
projectId: "appamorvicente",
storageBucket: "appamorvicente.firebasestorage.app",
messagingSenderId: "554827642467",
appId: "1:554827642467:web:8bd245e57b9c3f6f2aea56"
});

const messaging = firebase.messaging();

// ================================================
// NOTIFICACIONES EN BACKGROUND (app cerrada/minimizada)
// FCM llama a este handler cuando llega un mensaje
// con el campo "data" (sin "notification")
// ================================================
messaging.onBackgroundMessage(payload => {
const { title, body, icon } = payload.notification || payload.data || {};

self.registration.showNotification(title || 'Vice & Coni 💕', {
body: body || '',
icon: icon || '/icon.png',
badge: '/icon.png',
vibrate: [200, 100, 200],
data: { url: payload.data?.url || '/' }
});
});

// ================================================
// AL TOCAR LA NOTIFICACIÓN → abrir/enfocar la app
// ================================================
self.addEventListener('notificationclick', event => {
event.notification.close();

event.waitUntil(
clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
for (const client of clientList) {
if (client.url.includes(self.location.origin) && 'focus' in client) {
return client.focus();
}
}
if (clients.openWindow) {
return clients.openWindow(event.notification.data?.url || '/');
}
})
);
});

// ================================================
// INSTALL / ACTIVATE
// ================================================
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(clients.claim()));
