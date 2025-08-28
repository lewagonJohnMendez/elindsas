// assets/js/modal-to-contact.js
document.addEventListener("DOMContentLoaded", () => {
  const modalEl   = document.getElementById("quoteModal");
  const quoteForm = document.getElementById("quoteForm");

  if (!quoteForm) return;

  quoteForm.addEventListener("submit", (e) => {
    e.preventDefault();

    // 1) Lee datos del modal
    const data = {
      repuesto: getVal(quoteForm, "[name='repuesto']"),
      modelo:   getVal(quoteForm, "[name='modelo']"),
      email:    getVal(quoteForm, "[name='email']"),
      mensaje:  getVal(quoteForm, "[name='mensaje']")
    };

    // 2) Construye bloque de texto plano
    const block = buildPlainText(data);

    // 3) Intenta pegar en un form de contacto si está en esta misma página
    const contactForm = findContactForm();
    if (contactForm) {
      pasteIntoMessage(contactForm, block);
      // Cierra modal si Bootstrap está presente
      try { bootstrap.Modal.getInstance(modalEl)?.hide(); } catch (_) {}
      // Lleva al form para que el user lo vea
      contactForm.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    // 4) Si el form está en contact.html, guarda y redirige
    sessionStorage.setItem("contactMessagePlain", block);
    // opcional: pasamos ancla para que aterrice en el bloque de contacto
    window.location.href = "contact.html#prefill=1";
  });

  function getVal(root, selector) {
    return root.querySelector(selector)?.value?.trim() || "";
  }

  function buildPlainText(d) {
    return (
`Solicitud de repuesto

Repuesto: ${d.repuesto || "-"}
Modelo/Serial: ${d.modelo || "-"}

Contacto:
Email: ${d.email || "-"}

Mensaje adicional:
${d.mensaje || "-"}
`);
  }

  function findContactForm() {
    // Prioridad: un form con la clase del template
    let form = document.querySelector("form.php-email-form[action*='forms/contact.php']");
    if (!form) {
      // fallback por si le pusiste id
      form = document.getElementById("contactForm");
    }
    return form || null;
  }

  function pasteIntoMessage(form, block) {
    const msgEl = form.querySelector("textarea[name='message']");
    if (!msgEl) return;
    const prev = msgEl.value?.trim();
    msgEl.value = prev ? (prev + "\n\n" + block) : block;
    msgEl.dispatchEvent(new Event("input", { bubbles: true })); // por si hay validación viva
  }
});
