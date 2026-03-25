// Utilitários de mensagem: padronizam feedback visual e limpeza de estados de texto para o usuário.
export function setFeedbackMessage(elemento, mensagem, tipo, configuracao = {}) {
  if (!elemento) {
    return;
  }

  const classeBase = configuracao.classeBase || "small";
  const role = configuracao.role || (tipo === "danger" || tipo === "warning" ? "alert" : "status");
  elemento.textContent = mensagem;
  elemento.className = `${classeBase} text-${tipo}`.trim();
  elemento.setAttribute("role", role);
}

export function clearFeedbackMessage(elemento, configuracao = {}) {
  if (!elemento) {
    return;
  }

  elemento.textContent = "";
  elemento.className = configuracao.classeBase || "small";
  elemento.setAttribute("role", configuracao.role || "status");
}
