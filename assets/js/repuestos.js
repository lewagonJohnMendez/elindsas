// assets/js/repuestos.js
(function () {
  // ===========================
  // Constantes / Config
  // ===========================
  const DEBOUNCE_DELAY = 180;
  const PLACEHOLDER_IMAGE = "assets/img/repuestos/placeholder.svg";
  const FALLBACK_ICON = "bi-tools";

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
    return {
      cat: params.get("cat") || "*",
      q: params.get("q") || ""
    };
  }

  function updateHash(cat, q) {
    const params = new URLSearchParams();
    params.set("cat", cat || "*");
    if (q) params.set("q", q);
    const newHash = `#${params.toString()}`;
    if (location.hash !== newHash) {
      history.replaceState(null, "", newHash);
    }
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
    const countEl = document.getElementById("partsCount"); // opcional (si existe en el HTML)

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
        render(catalogo);
        bindImageFallbacks(); // fallback de imágenes
        hookFiltersAndSearch();
        hookDetail();
        initFromHash();
        updateCount(visibleCardsCount(), totalCardsCount());
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
        sku: item.sku || "",
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
    // UI: errores / empty
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
                           <p class="mt-2 small">No encontramos resultados con ese filtro 🔎</p>`;
        grid.insertAdjacentElement("afterend", empty);
      }
      return empty;
    }

    function toggleEmptyState(show) {
      const empty = ensureEmptyState();
      empty.classList.toggle("d-none", !show);
    }

    // ===========================
    // Render
    // ===========================
    function render(items) {
      if (!Array.isArray(items) || items.length === 0) {
        grid.innerHTML = "";
        toggleEmptyState(true);
        return;
      }
      toggleEmptyState(false);

      grid.innerHTML = items.map(toCard).join("");

      // Delegación global: clics en el grid (cotizar)
      grid.addEventListener("click", handleGridClick, { once: true });
    }

    function toCard(item) {
      const category = item.categoria || "otros";
      const tags = item.tags.join(" ").toLowerCase();
      const searchText = `${item.titulo} ${item.descripcion} ${item.sku}`.toLowerCase();
      const badgeClass = item.badge
        ? `bg-${item.estado}-subtle text-${item.estado} border stock-badge`
        : "";

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
                    data-id="${escapeHtml(item.sku || item.titulo)}"
                    aria-label="Ver detalles de ${escapeHtml(item.titulo)}">
              Ver detalle
            </button>
            <button class="btn btn-primary btn-sm"
                    data-action="cotizar"
                    data-part="${escapeHtml(item.titulo)}"
                    data-bs-toggle="modal"
                    data-bs-target="#quoteModal"
                    aria-label="Solicitar cotización de ${escapeHtml(item.titulo)}">
              Pedir por código
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

    function handleGridClick(e) {
      const btn = e.target.closest("[data-action]");
      if (!btn) {
        // rearmar el listener si el click no fue en botón (solo una vez)
        grid.addEventListener("click", handleGridClick, { once: true });
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

      // Atajos UX finos (opcional)
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

    function applyFilters() {
      const cards = Array.from(grid.querySelectorAll(":scope > div"));
      let visibleCount = 0;

      cards.forEach((card) => {
        const category = card.getAttribute("data-category") || "";
        const tags = card.getAttribute("data-tags") || "";
        const searchText = card.getAttribute("data-search") || "";

        const categoryMatch =
          currentFilter === "*" || category === currentFilter || tags.includes(currentFilter);
        const searchMatch =
          !currentSearch || tags.includes(currentSearch) || searchText.includes(currentSearch);

        const show = categoryMatch && searchMatch;
        card.style.display = show ? "" : "none";
        if (show) visibleCount++;
      });

      toggleEmptyState(visibleCount === 0);
      updateHash(currentFilter, currentSearch);
      updateCount(visibleCount, cards.length);
    }

    function visibleCardsCount() {
      return Array.from(grid.querySelectorAll(":scope > div")).filter(
        (c) => c.style.display !== "none"
      ).length;
    }

    function totalCardsCount() {
      return grid.querySelectorAll(":scope > div").length;
    }

    function updateCount(visible, total) {
      if (!countEl) return;
      countEl.textContent = `Mostrando ${visible} de ${total}`;
      // Accesibilidad: anunciar cambios
      countEl.setAttribute("aria-live", "polite");
      countEl.setAttribute("role", "status");
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
        sku: document.getElementById("detailSku"),
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
        const id = btn.getAttribute("data-id");
        const item = catalogo.find((x) => (x.sku || x.titulo) === id);
        if (!item) return;
        showItemDetail(item, el, detailModal);
      });
    }

    function showItemDetail(item, el, modal) {
      el.title.textContent = item.titulo;
      el.desc.textContent = item.descripcion;

      setupDetailImage(item, el);
      renderSpecifications(item, el);

      el.sku.textContent = item.sku || "—";
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
        (item.sku ? `• SKU: ${item.sku}\n` : "") +
        `¿Me ayudas con esta parte y su disponibilidad?`;
      el.whats.href = `https://wa.me/573133845117?text=${encodeURIComponent(message)}`;
    }
  });
})();
