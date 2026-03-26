// Utilitários simples de UX de estado: loading, skeleton, bloqueio de botão e estados vazios.

export function setButtonLoading(button, carregando, textos = {}) {
  if (!button) {
    return;
  }

  if (!button.dataset.originalText) {
    button.dataset.originalText = button.textContent || "";
  }

  button.disabled = Boolean(carregando);
  button.setAttribute("aria-busy", carregando ? "true" : "false");
  button.textContent = carregando
    ? (textos.loading || "Carregando...")
    : (textos.default || button.dataset.originalText || "");
}

export function renderSkeleton(container, linhas = 4, larguraClasse = "w-100") {
  if (!container) {
    return;
  }

  container.innerHTML = "";

  for (let index = 0; index < linhas; index += 1) {
    const linha = document.createElement("div");
    linha.className = `placeholder-glow mb-2 ${larguraClasse}`.trim();

    const span = document.createElement("span");
    span.className = "placeholder col-12";
    if (index === linhas - 1) {
      span.className = "placeholder col-8";
    }

    linha.appendChild(span);
    container.appendChild(linha);
  }
}

export function createSkeletonRow(colspan, quantidadeColunas = 4) {
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = Number(colspan) || quantidadeColunas;
  td.innerHTML = '<div class="placeholder-glow"><span class="placeholder col-12"></span></div>';
  tr.appendChild(td);
  return tr;
}

export function renderTableSkeleton(tbody, colspan, linhas = 3) {
  if (!tbody) {
    return;
  }

  tbody.textContent = "";
  for (let index = 0; index < linhas; index += 1) {
    tbody.appendChild(createSkeletonRow(colspan));
  }
}

export function renderEmptyState(container, mensagem) {
  if (!container) {
    return;
  }

  container.textContent = "";
  const estado = document.createElement("div");
  estado.className = "small text-muted";
  estado.textContent = mensagem;
  container.appendChild(estado);
}
