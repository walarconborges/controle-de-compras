// Utilitários de mensagem e validação visual.
// Padroniza feedback geral, mensagens por campo e limpeza de estado de formulário.

function resolveTypeClass(tipo) {
  const mapa = {
    danger: "text-danger",
    warning: "text-warning",
    success: "text-success",
    info: "text-info",
    primary: "text-primary",
    secondary: "text-secondary",
    muted: "text-secondary",
  };
  return mapa[tipo] || "text-body-secondary";
}

function ensureFieldErrorElement(input, configuracao = {}) {
  if (!input) {
    return null;
  }

  const selector = configuracao.selector || '[data-field-error="true"]';
  let elemento = input.parentElement ? input.parentElement.querySelector(selector) : null;

  if (!elemento) {
    elemento = document.createElement("div");
    elemento.className = configuracao.className || "invalid-feedback d-block small";
    elemento.dataset.fieldError = "true";

    if (input.parentElement) {
      input.parentElement.appendChild(elemento);
    } else {
      input.insertAdjacentElement("afterend", elemento);
    }
  }

  return elemento;
}

export function setFeedbackMessage(elemento, mensagem, tipo, configuracao = {}) {
  if (!elemento) {
    return;
  }

  const classeBase = configuracao.classeBase || "small";
  const role = configuracao.role || (tipo === "danger" || tipo === "warning" ? "alert" : "status");

  elemento.hidden = false;
  elemento.textContent = mensagem || "";
  elemento.className = `${classeBase} ${resolveTypeClass(tipo)}`.trim();
  elemento.setAttribute("role", role);
  elemento.setAttribute("aria-live", configuracao.ariaLive || "polite");
}

export function clearFeedbackMessage(elemento, configuracao = {}) {
  if (!elemento) {
    return;
  }

  elemento.textContent = "";
  elemento.className = configuracao.classeBase || "small";
  elemento.setAttribute("role", configuracao.role || "status");
  elemento.setAttribute("aria-live", configuracao.ariaLive || "polite");

  if (configuracao.hideWhenEmpty !== false) {
    elemento.hidden = true;
  }
}

export function setFieldError(input, mensagem, configuracao = {}) {
  if (!input) {
    return;
  }

  input.classList.add("is-invalid");
  input.setAttribute("aria-invalid", "true");

  const errorElement = ensureFieldErrorElement(input, configuracao);
  if (errorElement) {
    errorElement.hidden = false;
    errorElement.textContent = mensagem || "";
  }
}

export function clearFieldError(input, configuracao = {}) {
  if (!input) {
    return;
  }

  input.classList.remove("is-invalid");
  input.removeAttribute("aria-invalid");

  const selector = configuracao.selector || '[data-field-error="true"]';
  const errorElement = input.parentElement ? input.parentElement.querySelector(selector) : null;

  if (errorElement) {
    errorElement.textContent = "";
    errorElement.hidden = true;
  }
}

export function clearFieldErrors(inputs = [], configuracao = {}) {
  if (!Array.isArray(inputs)) {
    return;
  }

  inputs.forEach(function (input) {
    clearFieldError(input, configuracao);
  });
}
