// assets/js/contact-prefill.js
document.addEventListener("DOMContentLoaded", () => {
  if (!location.hash.includes("prefill=1")) return;

  const block = sessionStorage.getItem("contactMessagePlain") || "";
  // Intentamos encontrar el form del template
  const form = document.querySelector("form.php-email-form[action*='forms/contact.php']") 
            || document.getElementById("contactForm");
  if (!form || !block) return;

  const msgEl = form.querySelector("textarea[name='message']");
  if (!msgEl) return;

  const prev = msgEl.value?.trim();
  msgEl.value = prev ? (prev + "\n\n" + block) : block;
  msgEl.dispatchEvent(new Event("input", { bubbles: true }));

  // Limpia el storage para no duplicar si refrescan
  sessionStorage.removeItem("contactMessagePlain");

  // Opcional: foco al mensaje
  msgEl.focus();

  // Opcional PRO: si quieres hacer scroll al bloque contacto
  form.scrollIntoView({ behavior: "smooth", block: "start" });
});
