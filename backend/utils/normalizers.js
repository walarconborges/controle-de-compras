/**
 * Este arquivo guarda utilitários de normalização e conversão.
 * Ele existe para padronizar texto, números, dinheiro e respostas derivadas das entidades do sistema.
 */
const { decimalValueToCents, decimalValueToString } = require("./money");
function converterBoolean(valor) {
  if (typeof valor === "boolean") {
    return valor;
  }

  if (typeof valor === "string") {
    const valorNormalizado = valor.trim().toLowerCase();

    if (valorNormalizado === "true") {
      return true;
    }

    if (valorNormalizado === "false") {
      return false;
    }
  }

  return null;
}

function normalizarDecimal(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return null;
  }

  return numero;
}

function normalizarTextoSimples(valor) {
  return String(valor || "").trim();
}

function normalizarUnidade(valor) {
  const unidade = normalizarTextoSimples(valor).toLowerCase();

  const mapa = {
    kg: "quilograma(s)",
    quilo: "quilograma(s)",
    quilos: "quilograma(s)",
    quilograma: "quilograma(s)",
    quilogramas: "quilograma(s)",
    g: "grama(s)",
    grama: "grama(s)",
    gramas: "grama(s)",
    l: "litro(s)",
    litro: "litro(s)",
    litros: "litro(s)",
    ml: "mililitro(s)",
    mililitro: "mililitro(s)",
    mililitros: "mililitro(s)",
    unidade: "unidade(s)",
    unidades: "unidade(s)",
    "unidade(s)": "unidade(s)",
    caixa: "caixa(s)",
    caixas: "caixa(s)",
    "caixa(s)": "caixa(s)",
    pacote: "pacote(s)",
    pacotes: "pacote(s)",
    "pacote(s)": "pacote(s)",
  };

  return mapa[unidade] || normalizarTextoSimples(valor);
}

function normalizarEmail(valor) {
  return String(valor || "").trim().toLowerCase();
}

function normalizarNomeGrupo(valor) {
  return String(valor || "")
    .trim()
    .replace(/\s+/g, " ");
}

function nomeGrupoEhValido(nomeGrupo) {
  return !!nomeGrupo && !/\s/.test(nomeGrupo);
}

function gerarCodigoGrupo(nomeGrupo, grupoId) {
  return `${String(nomeGrupo || "").trim()}-${grupoId}`.toUpperCase();
}

function decimalParaNumero(valor) {
  if (valor === null || valor === undefined) {
    return null;
  }

  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return null;
  }

  return numero;
}

function normalizarCompraItemResposta(compraItem) {
  const valorUnitario = decimalValueToString(compraItem.valorUnitario);
  const valorUnitarioCentavos = decimalValueToCents(compraItem.valorUnitario);
  const quantidade = decimalParaNumero(compraItem.quantidade);
  const subtotalCentavos = valorUnitarioCentavos === null || quantidade === null
    ? null
    : Math.round(quantidade * valorUnitarioCentavos);

  return {
    ...compraItem,
    quantidade: quantidade,
    valorUnitario: valorUnitario,
    valorUnitarioCentavos: valorUnitarioCentavos,
    subtotalCentavos: subtotalCentavos,
  };
}

function normalizarCompraResposta(compra) {
  return {
    ...compra,
    compraItens: Array.isArray(compra.compraItens)
      ? compra.compraItens.map(normalizarCompraItemResposta)
      : [],
  };
}

module.exports = {
  converterBoolean,
  normalizarDecimal,
  normalizarTextoSimples,
  normalizarUnidade,
  normalizarEmail,
  normalizarNomeGrupo,
  nomeGrupoEhValido,
  gerarCodigoGrupo,
  decimalParaNumero,
  normalizarCompraItemResposta,
  normalizarCompraResposta,
};
