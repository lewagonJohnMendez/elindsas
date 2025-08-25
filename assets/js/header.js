(function(){
  // Detecta el <base> para construir rutas absolutas correctas
  const baseEl = document.querySelector('base');
  const BASE = (baseEl ? baseEl.getAttribute('href') : '/') || '/';
  const headerURL = new URL('assets/partials/header.html', location.origin + BASE).toString();

  // Carga e inyecta el parcial
  fetch(headerURL, { cache: 'no-cache' })
    .then(res => {
      if (!res.ok) throw new Error('No se pudo cargar el header');
      return res.text();
    })
    .then(html => {
      const mount = document.getElementById('app-header');
      if (!mount) return;
      mount.innerHTML = html;

      // Activa el item correcto según la página actual
      highlightActive();

      // Activa el toggle móvil
      setupMobileToggle();
    })
    .catch(err => {
      // Fallback simple si algo falla (opcional)
      console.warn('Header include error:', err);
    });

  function highlightActive(){
    const links = document.querySelectorAll('#navbar a.nav-link');
    if (!links.length) return;

    // Archivo actual (sin slash inicial)
    const currentFile = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

    links.forEach(a => {
      const href = a.getAttribute('href') || '';
      const file = href.split('#')[0].toLowerCase() || 'index.html';
      // Marca activo si coincide archivo, o si es home con #hero
      const isActive =
        file === currentFile ||
        (currentFile === 'index.html' && href.includes('#hero'));
      if (isActive) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      }
    });
  }

  function setupMobileToggle(){
    const toggle = document.querySelector('.mobile-nav-toggle');
    const nav = document.getElementById('navbar');
    if (!toggle || !nav) return;

    const toggleMenu = () => {
      const isOpen = nav.classList.toggle('navbar-mobile');
      toggle.classList.toggle('bi-list', !isOpen);
      toggle.classList.toggle('bi-x', isOpen);
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    };

    toggle.addEventListener('click', toggleMenu);
    toggle.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleMenu();
      }
    });

    // Cerrar al hacer click en un link (opcional)
    nav.addEventListener('click', (e)=>{
      if (e.target.matches('a.nav-link') && nav.classList.contains('navbar-mobile')) {
        toggleMenu();
      }
    });
  }
})();
