(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const mount = document.getElementById('app-header');
    if (!mount) return;

    // Resuelve la URL del parcial respetando <base>
    const headerURL = new URL('assets/partials/header.html', document.baseURI).toString();

    fetch(headerURL, { cache: 'no-cache' })
      .then(res => {
        if (!res.ok) throw new Error(`Header HTTP ${res.status}`);
        return res.text();
      })
      .then(html => {
        mount.innerHTML = html;
        highlightActive();
        setupMobileToggle();
      })
      .catch(err => {
        console.warn('Header include error:', err);
      });

    function highlightActive(){
  const links = document.querySelectorAll('#navbar a.nav-link');
  if (!links.length) return;

  // Página actual
  const currentFile = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  // Alias: páginas que deben activar otro link
  const aliasMap = {
    'innovacion.html': 'services.html',
    // puedes agregar más pares aquí
  };

  // Si la página actual está en aliasMap, sustituimos
  const effectiveFile = aliasMap[currentFile] || currentFile;

  links.forEach(a => {
    const href = a.getAttribute('href') || '';
    const file = href.split('#')[0].toLowerCase() || 'index.html';
    const isActive =
      file === effectiveFile ||
      (effectiveFile === 'index.html' && href.includes('#hero'));

    if (isActive) {
      a.classList.add('active');
      a.setAttribute('aria-current', 'page');
    }
  });
}

    function setupMobileToggle() {
      const nav = document.getElementById('navbar');
      const toggle = document.querySelector('.mobile-nav-toggle');
      if (!nav || !toggle) return;

      const toggleMenu = () => {
        const isOpen = nav.classList.toggle('navbar-mobile');
        toggle.classList.toggle('bi-list', !isOpen);
        toggle.classList.toggle('bi-x', isOpen);
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      };

      toggle.addEventListener('click', toggleMenu);
      toggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMenu(); }
      });

      // Cierra en móvil al clickear cualquier link dentro del nav
      nav.addEventListener('click', (e) => {
        const link = e.target.closest('a.nav-link');
        if (link && nav.classList.contains('navbar-mobile')) toggleMenu();
      });
    }
  });
})();
