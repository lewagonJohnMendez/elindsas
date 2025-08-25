(function () {
  const mount = document.getElementById('app-footer');
  if (!mount) return;

  fetch('assets/partials/footer.html', { cache: 'no-cache' })
    .then(r => r.text())
    .then(html => { mount.innerHTML = html; })
    .catch(err => console.error('Error cargando footer:', err));
})();
