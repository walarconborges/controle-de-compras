/**
 * Utilitários monetários em centavos.
 * Eles existem para evitar imprecisão de ponto flutuante em valores de dinheiro.
 */
const { Prisma } = require("@prisma/client");

function normalizarTextoMonetario(valor) {
  return String(valor ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/R\$/gi, "");
}

function parseMoneyInputToCents(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  if (typeof valor === "number") {
    if (!Number.isFinite(valor)) {
      return null;
    }

    return Math.round(valor * 100);
  }

  if (typeof valor === "bigint") {
    return Number(valor);
  }

  const textoOriginal = normalizarTextoMonetario(valor);

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
  const inteiro = Number(parteInteira || "0");
  const centavos = Number(centavosTexto || "0");

  if (!Number.isFinite(inteiro) || !Number.isFinite(centavos)) {
    return null;
  }

  const total = (inteiro * 100) + centavos;
  return negativo ? -total : total;
}

function centsToDecimalString(valor) {
  if (!Number.isInteger(valor)) {
    return null;
  }

  const negativo = valor < 0;
  const absoluto = Math.abs(valor);
  const inteiro = Math.floor(absoluto / 100);
  const centavos = String(absoluto % 100).padStart(2, "0");

  return `${negativo ? "-" : ""}${inteiro}.${centavos}`;
}

function decimalValueToString(valor) {
  if (valor === null || valor === undefined) {
    return null;
  }

  if (valor instanceof Prisma.Decimal) {
    return valor.toFixed(2);
  }

  if (typeof valor === "number") {
    if (!Number.isFinite(valor)) {
      return null;
    }

    return valor.toFixed(2);
  }

  const texto = String(valor).trim();
  return texto || null;
}

function decimalValueToCents(valor) {
  const texto = decimalValueToString(valor);

  if (!texto) {
    return null;
  }

  return parseMoneyInputToCents(texto);
}

module.exports = {
  parseMoneyInputToCents,
  centsToDecimalString,
  decimalValueToString,
  decimalValueToCents,
};
