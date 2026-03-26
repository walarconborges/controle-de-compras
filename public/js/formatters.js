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

export function normalizeMoneyToCents(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  if (typeof valor === "number") {
    if (!Number.isFinite(valor)) {
      return null;
    }

    return Math.round(valor * 100);
  }

  const textoOriginal = String(valor)
    .trim()
    .replace(/\s+/g, "")
    .replace(/R\$/gi, "");

  if (!textoOriginal) {
    return null;
  }

  const temVirgula = textoOriginal.includes(",");
  const temPonto = textoOriginal.includes(".");
  let texto = textoOriginal;

  if (temVirgula && temPonto) {
    texto = texto.replace(/\./g, "").replace(",", ".");
  } else if (temVirgula) {
    texto = texto.replace(",", ".");
  }

  if (!/^[-+]?\d+(\.\d{0,})?$/.test(texto)) {
    return null;
  }

  const negativo = texto.startsWith("-");
  const semSinal = negativo || texto.startsWith("+") ? texto.slice(1) : texto;
  const [parteInteira, parteDecimal = ""] = semSinal.split(".");
  const centavosTexto = `${parteDecimal}00`.slice(0, 2);
  const total = (Number(parteInteira || "0") * 100) + Number(centavosTexto || "0");

  return negativo ? -total : total;
}

export function centsToMoneyNumber(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return 0;
  }

  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return 0;
  }

  return numero / 100;
}

export function decimalStringToCents(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  return normalizeMoneyToCents(String(valor));
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
  return centsToMoneyNumber(valor).toLocaleString("pt-BR", {
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

export function formatFieldValueFromCents(valor) {
  if (!Number.isFinite(Number(valor))) {
    return "";
  }

  return centsToMoneyNumber(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatFieldValue(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return "";
  }

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
