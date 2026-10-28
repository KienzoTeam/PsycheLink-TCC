// Aplica o tema salvo antes da primeira pintura (evita piscar no tema errado). Chave igual à de lib/tema.ts.
try {
  var salvo = localStorage.getItem('psychelink_web_tema');
  document.documentElement.dataset.theme = salvo === 'light' || salvo === 'dark' ? salvo : 'system';
} catch (erro) {
  document.documentElement.dataset.theme = 'system';
}
