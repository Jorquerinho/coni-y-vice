// ================================================
// SERVICE WORKER — Vice & Coni 💕
// Archivo: sw.js
// Debe estar en la misma carpeta que index.html
// ================================================

const CACHE_NAME = ‘vyc-v1’;

// Instalación del SW
self.addEventListener(‘install’, event => {
self.skipWaiting();
});

// Activación
self.addEventListener(‘activate’, event => {
event.waitUntil(clients.claim());
});

// Manejar notificaciones push (para el futuro si agregan servidor)
self.addEventListener(‘push’, event => {
if (!event.data) return;

const data = event.data.json();
event.waitUntil(
self.registration.showNotification(data.title, {
body: data.body,
icon: data.icon || ‘/icon.png’,
badge: data.badge || ‘/icon.png’,
vibrate: [200, 100, 200],
data: { url: data.url || ‘/’ }
})
);
});

// Al tocar la notificación, abrir/enfocar la app
self.addEventListener(‘notificationclick’, event => {
event.notification.close();

event.waitUntil(
clients.matchAll({ type: ‘window’, includeUncontrolled: true }).then(clientList => {
// Si la app ya está abierta, enfocarla
for (const client of clientList) {
if (client.url.includes(self.location.origin) && ‘focus’ in client) {
return client.focus();
}
}
// Si no está abierta, abrirla
if (clients.openWindow) {
return clients.openWindow(’/’);
}
})
);
});