// Service worker só do push dos avisos (FP12): mostra a notificação e abre o painel ao tocar.
// O texto vem do servidor e nunca tem nome nem dado clínico.
self.addEventListener('push', (evento) => {
  const dados = evento.data ? evento.data.json() : {};
  evento.waitUntil(
    self.registration.showNotification(dados.titulo || 'PsycheLink', {
      body: dados.corpo || 'Há um aviso novo no painel.',
      icon: '/Psychelink.png',
      data: { url: dados.url || '/inicio' },
    }),
  );
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const url = new URL(evento.notification.data?.url || '/inicio', self.location.origin).href;
  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      const aberta = janelas.find((j) => j.url.startsWith(self.location.origin));
      return aberta ? aberta.focus().then((j) => j.navigate(url)) : self.clients.openWindow(url);
    }),
  );
});
