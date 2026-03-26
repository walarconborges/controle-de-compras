// Utilitários de DOM: manipulam menu mobile, limpam containers e montam estruturas visuais repetidas com segurança.
import { DESKTOP_MENU_BREAKPOINT } from "./constants.js";

export function escapeHtml(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function clearElement(elemento) {
  if (!elemento) {
    return;
  }

  elemento.textContent = "";
}

export function createTextCell(valor, className = "") {
  const td = document.createElement("td");
  if (className) {
    td.className = className;
  }
  td.textContent = String(valor ?? "-");
  return td;
}

export function createTableMessageRow(colspan, texto, className = "text-center text-muted") {
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = Number(colspan) || 1;
  td.className = className;
  td.textContent = texto;
  tr.appendChild(td);
  return tr;
}

export function setupMobileMenu({ menu, menuContent, btnOpen, btnClose, backdrop }) {
  if (!menu || !menuContent || !backdrop) {
    return function noop() {};
  }

  let ultimoElementoFocado = null;

  function abrirMenu() {
    ultimoElementoFocado = document.activeElement;
    menu.classList.add("is-open");
    menuContent.classList.add("is-open");
    menu.setAttribute("aria-hidden", "false");
    backdrop.hidden = false;

    if (btnOpen) {
      btnOpen.setAttribute("aria-expanded", "true");
    }

    document.body.classList.add("menu-mobile-open");
    menuContent.focus();
  }

  function fecharMenu() {
    menu.classList.remove("is-open");
    menuContent.classList.remove("is-open");
    menu.setAttribute("aria-hidden", "true");
    backdrop.hidden = true;

    if (btnOpen) {
      btnOpen.setAttribute("aria-expanded", "false");
    }

    document.body.classList.remove("menu-mobile-open");

    if (ultimoElementoFocado && typeof ultimoElementoFocado.focus === "function") {
      ultimoElementoFocado.focus();
    }
  }

  if (btnOpen) {
    btnOpen.addEventListener("click", abrirMenu);
  }

  if (btnClose) {
    btnClose.addEventListener("click", fecharMenu);
  }

  backdrop.addEventListener("click", fecharMenu);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      fecharMenu();
    }
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth >= DESKTOP_MENU_BREAKPOINT) {
      fecharMenu();
    }
  });

  return fecharMenu;
}

export function renderKeyValueRows(container, campos) {
  if (!container) {
    return;
  }

  clearElement(container);

  campos.forEach(function ([rotulo, valor]) {
    const linha = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = `${rotulo}: `;
    const span = document.createElement("span");
    span.textContent = String(valor);
    linha.appendChild(strong);
    linha.appendChild(span);
    container.appendChild(linha);
  });
}

export function createFilterChip(texto, onRemove) {
  const chip = document.createElement("span");
  chip.className = "filter-chip";

  const spanTexto = document.createElement("span");
  spanTexto.textContent = texto;

  const botao = document.createElement("button");
  botao.type = "button";
  botao.setAttribute("aria-label", "Remover filtro");
  botao.textContent = "×";
  botao.addEventListener("click", onRemove);

  chip.appendChild(spanTexto);
  chip.appendChild(botao);
  return chip;
}
