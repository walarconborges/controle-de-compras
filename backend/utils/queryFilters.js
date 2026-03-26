/**
 * Este arquivo centraliza paginação, filtros e ordenação de listagens.
 * Ele existe para evitar repetição entre rotas que suportam page, limit, busca, datas e orderBy.
 */

function paraInteiroPositivo(valor, padrao) {
  const numero = Number(valor);

  if (!Number.isInteger(numero) || numero <= 0) {
    return padrao;
  }

  return numero;
}

function paraInteiroFaixa(valor, padrao, minimo, maximo) {
  const numero = Number(valor);

  if (!Number.isInteger(numero)) {
    return padrao;
  }

  if (numero < minimo) {
    return minimo;
  }

  if (numero > maximo) {
    return maximo;
  }

  return numero;
}

function obterPrimeiroValor(query = {}, chaves = []) {
  for (const chave of chaves) {
    if (query[chave] !== undefined) {
      return query[chave];
    }
  }

  return undefined;
}

function normalizarTextoBusca(valor) {
  if (valor == null) {
    return "";
  }

  return String(valor).trim();
}

function parseDateBoundary(valor, finalDoDia = false) {
  if (!valor) {
    return null;
  }

  const texto = String(valor).trim();
  if (!texto) {
    return null;
  }

  const possuiHorario = /T\d{2}:\d{2}/.test(texto);

  if (possuiHorario) {
    const data = new Date(texto);
    return Number.isNaN(data.getTime()) ? null : data;
  }

  const sufixo = finalDoDia ? "T23:59:59.999Z" : "T00:00:00.000Z";
  const data = new Date(`${texto}${sufixo}`);
  return Number.isNaN(data.getTime()) ? null : data;
}

function construirFiltroData({ de, ate, campo = "criadoEm" }) {
  const inicio = parseDateBoundary(de, false);
  const fim = parseDateBoundary(ate, true);

  if (!inicio && !fim) {
    return {};
  }

  return {
    [campo]: {
      ...(inicio ? { gte: inicio } : {}),
      ...(fim ? { lte: fim } : {}),
    },
  };
}

function construirPaginacao(query = {}) {
  const page = paraInteiroPositivo(obterPrimeiroValor(query, ["page", "pagina"]), 1);
  const limit = paraInteiroFaixa(obterPrimeiroValor(query, ["limit", "limite"]), 50, 1, 100);
  const skip = (page - 1) * limit;

  return { page, limit, skip, take: limit };
}

function construirIntervaloDatasQuery(query = {}) {
  return {
    de: obterPrimeiroValor(query, ["de", "dataInicial", "startDate", "inicio"]),
    ate: obterPrimeiroValor(query, ["ate", "dataFinal", "endDate", "fim"]),
  };
}

function obterTextoBuscaQuery(query = {}) {
  return normalizarTextoBusca(obterPrimeiroValor(query, ["busca", "search", "q", "termo"]));
}

function obterOrdenacaoQuery(query = {}, padraoCampo, padraoDirecao = "asc") {
  return {
    campo: normalizarTextoBusca(obterPrimeiroValor(query, ["ordenarPor", "sortBy", "orderBy"])) || padraoCampo,
    direcao: normalizarDirecaoOrdenacao(obterPrimeiroValor(query, ["ordem", "sortOrder", "direction"]), padraoDirecao),
  };
}

function anexarHeadersPaginacao(res, meta) {
  res.set("X-Page", String(meta.page));
  res.set("X-Limit", String(meta.limit));
  res.set("X-Total-Count", String(meta.total));
  res.set("X-Total-Pages", String(meta.totalPages));
  res.set("X-Has-Next-Page", String(meta.hasNextPage));
  res.set("X-Has-Previous-Page", String(meta.hasPreviousPage));
}

function construirMetaPaginacao(total, page, limit) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

function normalizarDirecaoOrdenacao(valor, padrao = "asc") {
  const texto = String(valor || padrao).trim().toLowerCase();
  return texto === "desc" ? "desc" : "asc";
}

module.exports = {
  normalizarTextoBusca,
  parseDateBoundary,
  construirFiltroData,
  construirPaginacao,
  construirMetaPaginacao,
  anexarHeadersPaginacao,
  normalizarDirecaoOrdenacao,
  construirIntervaloDatasQuery,
  obterTextoBuscaQuery,
  obterOrdenacaoQuery,
};
