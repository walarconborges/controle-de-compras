// Utilitários de validação leve no cliente: evitam repetição de regras simples antes do envio ao backend.
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

export function normalizeSingleWord(valor) {
  return String(valor || "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")[0] || "";
}
