// assets/js/repuestos.js
(function () {
  // ===========================
  // Constantes / Config
  // ===========================
  const DEBOUNCE_DELAY = 180;
  const PLACEHOLDER_IMAGE = "assets/img/repuestos/placeholder.svg";
  const FALLBACK_ICON = "bi-tools";
  const PAGE_SIZE = 9;              // <-- ítems por página (ajústalo a gusto)

  // Estado de paginación/filtrado
  let matchedIdx = [];               // índices filtrados del catálogo
  let currentPage = 1;               // página actual (1-based)

  // ===========================
  // Helpers
  // ===========================
  function debounce(fn, delay = DEBOUNCE_DELAY) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function escapeHtml(unsafe) {
    if (typeof unsafe !== "string") return unsafe;
    return unsafe
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getParamsFromHash() {
    const hash = location.hash.startsWith("#") ? location.hash.slice(1) : location.hash;
    const params = new URLSearchParams(hash);
    return { cat: params.get("cat") || "*", q: params.get("q") || "" };
  }

  function updateHash(cat, q) {
  const isDefault = (!cat || cat === '*') && (!q || q === '');
  const base = location.pathname + location.search;

  if (isDefault) {
    // Limpia el hash si estamos en estado por defecto
    if (location.hash) history.replaceState(null, '', base);
    return;
  }

  const params = new URLSearchParams();
  params.set('cat', cat || '*');
  if (q) params.set('q', q);
  history.replaceState(null, '', base + '#' + params.toString());
}

  // ===========================
  // Main
  // ===========================
  document.addEventListener("DOMContentLoaded", function main() {
    const grid = document.getElementById("partsGrid");
    if (!grid) return;

    const pills = document.querySelectorAll(".filter-pill");
    const input = document.getElementById("searchInput");
    const clearBtn = document.getElementById("clearSearchBtn");
    const partName = document.getElementById("partName");
    const countEl = document.getElementById("partsCount");         // opcional
    const paginationEl = document.getElementById("partsPagination");// requerido para paginación

    // Estado
    let catalogo = [];
    let currentFilter = "*";
    let currentSearch = "";

    // Cargar catálogo
    fetch(`assets/data/repuestos.json?v=${Date.now()}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!data || !Array.isArray(data.items)) throw new Error("Formato de datos inválido");
        catalogo = data.items.map(validateItem);
        render(catalogo);            // inicializa matchedIdx y pinta página 1
        hookFiltersAndSearch();
        hookDetail();
        initFromHash();              // aplica filtros de la URL si hay
      })
      .catch((err) => {
        console.error("Error cargando repuestos:", err);
        showError("No se pudo cargar el catálogo de repuestos. Por favor, intenta más tarde.");
      });

    // ===========================
    // Validación de ítems
    // ===========================
    function validateItem(item) {
      return {
        titulo: item.titulo || "Repuesto sin nombre",
        descripcion: item.descripcion || "",
        categoria: item.categoria || "otros",
        tags: Array.isArray(item.tags) ? item.tags : [],
        img: item.img || "",
        icon: item.icon || FALLBACK_ICON,
        estado: item.estado || "secondary",
        badge: item.badge || "",
        specs: Array.isArray(item.specs) ? item.specs : [],
        lead_time: item.lead_time || "",
        stock: item.stock || "",
        datasheet: item.datasheet || ""
      };
    }

    // ===========================
    // UI: errores / empty / contador
    // ===========================
    function showError(message) {
      grid.innerHTML = `
        <div class="col-12">
          <div class="alert alert-warning" role="alert">
            <i class="bi bi-exclamation-triangle me-2"></i>${escapeHtml(message)}
          </div>
        </div>`;
    }

    function ensureEmptyState() {
      let empty = document.getElementById("partsEmptyState");
      if (!empty) {
        empty = document.createElement("div");
        empty.id = "partsEmptyState";
        empty.className = "text-center text-muted py-4 d-none";
        empty.innerHTML = `<i class="bi bi-search" style="font-size:2rem;"></i>
                           <p class="mt-2 small">No encontramos resultados con ese filtro, consulta a nuestro equipo por correo electrónico.</p>`;
        grid.insertAdjacentElement("afterend", empty);
      }
      return empty;
    }

    function toggleEmptyState(show) {
      const empty = ensureEmptyState();
      empty.classList.toggle("d-none", !show);
    }

    function updateCount(visible, total) {
      if (!countEl) return;
      countEl.textContent = `Mostrando ${visible} de ${total}`;
      countEl.setAttribute("aria-live", "polite");
      countEl.setAttribute("role", "status");
    }

    // ===========================
    // Render + Paginación
    // ===========================
    function render(items) {
      // índices sin filtros (todo)
      matchedIdx = items.map((_, i) => i);
      currentPage = 1;
      paintCurrentPage();

      // Delegación global: clics en el grid (cotizar/detalle) — one-shot con rearmado
      grid.addEventListener("click", handleGridClick, { once: true });
    }

    function paintCurrentPage() {
      // limpiar grid
      grid.innerHTML = "";

      if (matchedIdx.length === 0) {
        toggleEmptyState(true);
        updateCount(0, 0);
        buildPagination(0, 0);
        return;
      }
      toggleEmptyState(false);

      const total = matchedIdx.length;
      const totalPages = Math.ceil(total / PAGE_SIZE);
      currentPage = Math.max(1, Math.min(currentPage, totalPages));

      const start = (currentPage - 1) * PAGE_SIZE;
      const end = Math.min(start + PAGE_SIZE, total);

      const html = matchedIdx.slice(start, end).map(i => toCard(catalogo[i])).join("");
      grid.innerHTML = html;

      bindImageFallbacks();

      updateCount(end - start, total);
      buildPagination(currentPage, totalPages);
    }

    function toCard(item) {
      const category   = item.categoria || "otros";
      const tags       = (item.tags || []).join(" ").toLowerCase();
      const searchText = `${item.titulo} ${item.descripcion}`.toLowerCase();
      const badgeClass = item.badge ? `bg-${item.estado}-subtle text-${item.estado} border stock-badge` : "";

      const imageHtml = `
        <span class="d-inline-block" style="width:60px;height:60px;">
          <img class="part-img"
               src="${item.img && item.img.trim() !== "" ? item.img : PLACEHOLDER_IMAGE}"
               alt="${escapeHtml(item.titulo)}"
               loading="lazy"
               style="width:60px;height:60px;object-fit:cover;border-radius:8px;"
               data-fallback-icon="${escapeHtml(item.icon)}">
        </span>`;

      return `
      <div class="col-md-6 col-xl-4"
           data-category="${escapeHtml(category)}"
           data-tags="${escapeHtml(tags)}"
           data-search="${escapeHtml(searchText)}">
        <div class="part-card p-3 h-100">
          <div class="d-flex align-items-center gap-3">
            ${imageHtml}
            <div>
              <h6 class="mb-1">${escapeHtml(item.titulo)}</h6>
              ${item.badge ? `<span class="badge ${badgeClass}">${escapeHtml(item.badge)}</span>` : ""}
            </div>
          </div>
          <p class="mt-3 mb-2 small text-muted">${escapeHtml(item.descripcion)}</p>
          <div class="d-flex gap-2">
            <button class="btn btn-outline-secondary btn-sm"
                    data-action="detalle"
                    data-id="${escapeHtml(item.titulo)}"
                    aria-label="Ver detalles de ${escapeHtml(item.titulo)}">
              Ver detalle
            </button>
            <button class="btn btn-primary btn-sm"
                    data-action="cotizar"
                    data-part="${escapeHtml(item.titulo)}"
                    data-bs-toggle="modal"
                    data-bs-target="#quoteModal"
                    aria-label="Solicitar cotización de ${escapeHtml(item.titulo)}">
              Consulta por correo
            </button>
          </div>
        </div>
      </div>`;
    }

    function bindImageFallbacks() {
      const imgs = grid.querySelectorAll("img.part-img");
      imgs.forEach((img) => {
        img.onerror = () => {
          const iconClass = img.getAttribute("data-fallback-icon") || FALLBACK_ICON;
          const icon = document.createElement("i");
          icon.className = `bi ${iconClass} icon`;
          icon.style.fontSize = "2rem";
          img.replaceWith(icon);
        };
      });
    }

    function buildPagination(page, totalPages) {
      if (!paginationEl) return;
      if (!totalPages || totalPages <= 1) {
        paginationEl.classList.add("d-none");
        paginationEl.innerHTML = "";
        return;
      }
      paginationEl.classList.remove("d-none");

      const makeItem = (label, p, disabled = false, active = false, aria = "") => `
        <li class="page-item ${disabled ? "disabled" : ""} ${active ? "active" : ""}">
          <a class="page-link" href="#" data-page="${p}" ${aria}>${label}</a>
        </li>`;

      let html = "";
      // Prev
      html += makeItem("&laquo;", page - 1, page === 1, false, 'aria-label="Anterior"');

      // ventana de números (máx 7)
      const max = 7;
      let start = Math.max(1, page - Math.floor(max / 2));
      let end = Math.min(start + max - 1, totalPages);
      start = Math.max(1, end - max + 1);

      if (start > 1) {
        html += makeItem("1", 1, false, page === 1);
        if (start > 2) html += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
      }

      for (let p = start; p <= end; p++) {
        html += makeItem(String(p), p, false, page === p);
      }

      if (end < totalPages) {
        if (end < totalPages - 1) html += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
        html += makeItem(String(totalPages), totalPages, false, page === totalPages);
      }

      // Next
      html += makeItem("&raquo;", page + 1, page === totalPages, false, 'aria-label="Siguiente"');

      paginationEl.innerHTML = html;

      // Bind clicks
      paginationEl.querySelectorAll("a.page-link").forEach((a) => {
        a.addEventListener("click", (ev) => {
          ev.preventDefault();
          const p = parseInt(a.getAttribute("data-page"), 10);
          if (isNaN(p)) return;
          goToPage(p);
        });
      });
    }

    function goToPage(p) {
      const totalPages = Math.ceil(matchedIdx.length / PAGE_SIZE);
      currentPage = Math.max(1, Math.min(p, totalPages));
      paintCurrentPage();
      document.getElementById("partsGrid")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // ===========================
    // Delegación de clicks del grid
    // ===========================
    function handleGridClick(e) {
      const btn = e.target.closest("[data-action]");
      if (!btn) {
        grid.addEventListener("click", handleGridClick, { once: true }); // rearmar si no fue botón
        return;
      }
      const action = btn.getAttribute("data-action");
      const partNameValue = btn.getAttribute("data-part") || "Repuesto ELIND";

      if (action === "cotizar" && partName) {
        partName.value = partNameValue;
      }

      // Volvemos a escuchar para siguientes clics
      grid.addEventListener("click", handleGridClick, { once: true });
    }

    // ===========================
    // Filtros + Búsqueda
    // ===========================
    function hookFiltersAndSearch() {
      // Pills
      pills.forEach((pill) => {
        pill.setAttribute("role", "button");
        pill.setAttribute("aria-pressed", "false");
        pill.addEventListener("click", () => {
          const filter = pill.dataset.filter || "*";
          setActiveFilter(pill, filter);
          applyFilters();
        });
      });

      // Buscar
      if (input) {
        input.addEventListener(
          "input",
          debounce((e) => {
            currentSearch = e.target.value.trim().toLowerCase();
            applyFilters();
            setClearBtnVisibility();
          })
        );
      }

      // Limpiar
      if (clearBtn) {
        clearBtn.addEventListener("click", () => {
          if (!input) return;
          input.value = "";
          input.focus();
          currentSearch = "";
          applyFilters();
          setClearBtnVisibility();
        });
        setClearBtnVisibility();
      }

      // Atajos UX
      document.addEventListener("keydown", (ev) => {
        if ((ev.ctrlKey || ev.metaKey) && ev.key === "/") {
          ev.preventDefault();
          input?.focus();
        }
      });
      input?.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape" && input.value) {
          ev.preventDefault();
          clearBtn?.click();
        }
      });
    }

    function setClearBtnVisibility() {
      if (!clearBtn || !input) return;
      clearBtn.classList.toggle("d-none", input.value.trim() === "");
    }

    function setActiveFilter(activePill, filter) {
      pills.forEach((p) => {
        p.classList.remove("active");
        p.setAttribute("aria-pressed", "false");
      });
      activePill.classList.add("active");
      activePill.setAttribute("aria-pressed", "true");
      currentFilter = filter;
    }

    // Recalcula coincidencias (con catálogo) y repinta página 1
    function applyFilters() {
      const search = currentSearch;
      const filter = currentFilter;

      matchedIdx = [];
      for (let i = 0; i < catalogo.length; i++) {
        const item = catalogo[i];
        const category   = (item.categoria || "").toLowerCase();
        const tags       = (item.tags || []).join(" ").toLowerCase();
        const searchText = `${item.titulo} ${item.descripcion}`.toLowerCase();

        const categoryMatch = filter === "*" || category === filter || tags.includes(filter);
        const searchMatch   = !search || tags.includes(search) || searchText.includes(search);

        if (categoryMatch && searchMatch) matchedIdx.push(i);
      }

      currentPage = 1;
      paintCurrentPage();
      updateHash(currentFilter, currentSearch);
    }

    function initFromHash() {
      const params = getParamsFromHash();
      currentSearch = params.q || "";
      currentFilter = params.cat || "*";

      if (input) input.value = currentSearch;
      setClearBtnVisibility();

      const targetPill =
        Array.from(pills).find((p) => p.dataset.filter === currentFilter) || pills[0];
      if (targetPill) setActiveFilter(targetPill, targetPill.dataset.filter || "*");

      applyFilters();
    }

    // ===========================
    // Modal de detalle
    // ===========================
    function hookDetail() {
      const detailModalEl = document.getElementById("detailModal");
      if (!detailModalEl) return;

      const detailModal = new bootstrap.Modal(detailModalEl, {});
      const el = {
        title: document.getElementById("detailTitle"),
        img: document.getElementById("detailImg"),
        icon: document.getElementById("detailIcon"),
        desc: document.getElementById("detailDesc"),
        specs: document.getElementById("detailSpecs"),
        lead: document.getElementById("detailLead"),
        stock: document.getElementById("detailStock"),
        sheet: document.getElementById("detailSheet"),
        whats: document.getElementById("detailWhats"),
        quoteBtn: document.getElementById("detailQuoteBtn"),
        partName: document.getElementById("partName")
      };

      // Delegación: abrir modal de detalle
      grid.addEventListener("click", (e) => {
        const btn = e.target.closest('[data-action="detalle"]');
        if (!btn) return;
        const idTitulo = btn.getAttribute("data-id"); // ahora usamos el título como ID
        const item = catalogo.find((x) => x.titulo === idTitulo);
        if (!item) return;
        showItemDetail(item, el, detailModal);
      });
    }

    function showItemDetail(item, el, modal) {
      el.title.textContent = item.titulo;
      el.desc.textContent = item.descripcion;

      setupDetailImage(item, el);
      renderSpecifications(item, el);

      // Metadatos visibles
      el.lead.textContent = item.lead_time || "—";
      el.stock.textContent = item.stock || "—";

      setupDatasheetLink(item, el);
      setupWhatsAppLink(item, el);

      if (el.quoteBtn && el.partName) {
        el.quoteBtn.onclick = () => {
          el.partName.value = item.titulo;
        };
      }

      modal.show();
    }

    function setupDetailImage(item, el) {
      const hasImage = item.img && item.img.trim() !== "";
      if (hasImage) {
        el.img.src = item.img;
        el.img.alt = item.titulo;
        el.img.classList.remove("d-none");
        el.icon.classList.add("d-none");
        el.img.onerror = () => {
          el.img.classList.add("d-none");
          el.icon.classList.remove("d-none");
          el.icon.innerHTML = `<i class="bi ${item.icon || FALLBACK_ICON}" style="font-size:48px;"></i>`;
        };
      } else {
        el.img.classList.add("d-none");
        el.icon.classList.remove("d-none");
        el.icon.innerHTML = `<i class="bi ${item.icon || FALLBACK_ICON}" style="font-size:48px;"></i>`;
      }
    }

    function renderSpecifications(item, el) {
      el.specs.innerHTML = "";
      if (item.specs && item.specs.length > 0) {
        item.specs.forEach((spec) => {
          const li = document.createElement("li");
          li.textContent = spec;
          el.specs.appendChild(li);
        });
      } else {
        const li = document.createElement("li");
        li.textContent = "No hay especificaciones disponibles";
        li.classList.add("text-muted");
        el.specs.appendChild(li);
      }
    }

    function setupDatasheetLink(item, el) {
      if (item.datasheet) {
        el.sheet.href = item.datasheet;
        el.sheet.classList.remove("d-none");
        el.sheet.textContent = "Ver ficha técnica";
      } else {
        el.sheet.classList.add("d-none");
        el.sheet.removeAttribute("href");
      }
    }

    function setupWhatsAppLink(item, el) {
      const message =
        `Hola ELIND, quiero este repuesto:\n` +
        `• ${item.titulo}\n` +
        `¿Me ayudas con el precio y su disponibilidad?`;
      el.whats.href = `https://wa.me/573133845117?text=${encodeURIComponent(message)}`;
    }
  });
})();
