// Utilitários de formatação e normalização: tratam texto, números, datas, moeda e comparações reutilizadas.
export function normalizeText(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function normalizeCategoryName(valor) {
  return String(valor || "").trim().replace(/\s+/g, " ");
}

export function normalizeNumber(valor) {
  const texto = String(valor || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  return parseFloat(texto);
}

export function compareText(a, b) {
  return String(a || "").localeCompare(String(b || ""), "pt-BR", {
    sensitivity: "base"
  });
}

export function compareNumber(a, b) {
  return Number(a || 0) - Number(b || 0);
}

export function formatNumber(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

export function formatCurrency(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

export function formatDate(valor) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) {
    return "-";
  }
  return data.toLocaleDateString("pt-BR");
}

export function formatFieldValue(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) {
    return "";
  }

  return numero.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

export function getFullName(usuario = {}, fallback = {}) {
  const nomeCompletoUsuario = [usuario.nome, usuario.sobrenome]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (nomeCompletoUsuario) {
    return nomeCompletoUsuario;
  }

  const nomeCompletoFallback = [fallback?.nome, fallback?.sobrenome]
    .filter(Boolean)
    .join(" ")
    .trim();

  return nomeCompletoFallback || fallback?.nome || "-";
}
