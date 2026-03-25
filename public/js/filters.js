// Utilitários de filtro: garantem arrays válidos, extraem listas de respostas e renderizam chips de filtros ativos.
import { createFilterChip } from "./dom.js";

export function ensureArray(valor) {
  return Array.isArray(valor) ? valor : [];
}

export function extractListFromResponse(valor, chavesPossiveis = []) {
  if (Array.isArray(valor)) {
    return valor;
  }

  if (!valor || typeof valor !== "object") {
    return [];
  }

  for (const chave of chavesPossiveis) {
    if (Array.isArray(valor[chave])) {
      return valor[chave];
    }
  }

  return [];
}

export function renderFilterSummary(container, definicoes) {
  if (!container) {
    return;
  }

  container.textContent = "";

  definicoes.forEach(function (definicao) {
    if (!definicao?.value) {
      return;
    }

    container.appendChild(createFilterChip(`${definicao.label}: ${definicao.value}`, definicao.onRemove));
  });
}

export function updateCountLabel(elemento, quantidade, sufixo) {
  if (!elemento) {
    return;
  }

  elemento.textContent = `${quantidade} ${sufixo}`;
}
