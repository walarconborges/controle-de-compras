import { apiGet, apiPost, apiPatch, apiDelete, readJsonSafe as lerJsonSeguro } from "./api.js";
import { ensureAcceptedSession } from "./auth.js";
import { setupMobileMenu } from "./dom.js";
import { compareText, compareNumber, normalizeText, normalizeCategoryName, decimalStringToCents, centsToMoneyNumber, formatNumber, formatCurrency, formatDate, formatFieldValue } from "./formatters.js";
import { setFeedbackMessage, clearFeedbackMessage } from "./messages.js";
import { ensureArray, extractListFromResponse, renderFilterSummary, updateCountLabel } from "./filters.js";

document.addEventListener("DOMContentLoaded", function () {
  const visualizacaoConsumo = document.getElementById("visualizacao-consumo");
  const visualizacaoCompras = document.getElementById("visualizacao-compras");
  const agrupamentoConsumo = document.getElementById("agrupamento-consumo");

  const resultadoConsumoContainer = document.getElementById("resultado-consumo");
  const resultadoComprasContainer = document.getElementById("resultado-compras");

  const filtroItemConsumo = document.getElementById("filtro-item-consumo");
  const filtroCategoriaConsumo = document.getElementById("filtro-categoria-consumo");
  const ordenacaoConsumo = document.getElementById("ordenacao-consumo");
  const resumoFiltrosConsumo = document.getElementById("resumo-filtros-consumo");
  const contadorItensConsumo = document.getElementById("contador-itens-consumo");
  const btnLimparFiltrosConsumo = document.getElementById("btn-limpar-filtros-consumo");

  const filtroItemMediaCompras = document.getElementById("filtro-item-media-compras");
  const filtroCategoriaMediaCompras = document.getElementById("filtro-categoria-media-compras");
  const ordenacaoMediaCompras = document.getElementById("ordenacao-media-compras");
  const resumoFiltrosMediaCompras = document.getElementById("resumo-filtros-media-compras");
  const contadorItensMediaCompras = document.getElementById("contador-itens-media-compras");
  const btnLimparFiltrosMediaCompras = document.getElementById("btn-limpar-filtros-media-compras");

  const templateLinhaConsumo = document.getElementById("template-linha-consumo");
  const templateLinhaMediaCompras = document.getElementById("template-linha-media-compras");

  const tabs = document.querySelectorAll("#consumo-tabs .nav-link");
  const paineis = document.querySelectorAll(".tab-content-section");

  const menu = document.getElementById("menu-lateral-consumo");
  const menuContent = document.getElementById("menu-lateral-conteudo-consumo");
  const btnAbrirMenu = document.getElementById("btn-menu-mobile");
  const btnFecharMenu = document.getElementById("btn-fechar-menu-mobile");
  const backdrop = document.getElementById("menu-mobile-backdrop");

  let graficoCompras = null;
  let graficoConsumo = null;

  let historicoCompras = [];
  let movimentacoesEstoque = [];

  const filtrosConsumo = {
    item: "",
    categoria: ""
  };

  const filtrosMediaCompras = {
    item: "",
    categoria: ""
  };

  const ordenacaoAtualConsumo = {
    campo: "item",
    direcao: "asc"
  };

  const ordenacaoAtualMediaCompras = {
    campo: "item",
    direcao: "asc"
  };

  if (
    !visualizacaoConsumo ||
    !visualizacaoCompras ||
    !agrupamentoConsumo ||
    !resultadoConsumoContainer ||
    !resultadoComprasContainer
  ) {
    console.error("Estrutura HTML das visualizações de consumo/compras não encontrada.");
    return;
  }

  sincronizarOrdenacaoComSelect("consumo");
  sincronizarOrdenacaoComSelect("compras");
  configurarEventos();
  inicializar();

  async function inicializar() {
    try {
      await verificarSessao();
      await carregarDados();
      popularCategoriasDinamicas();
      renderizarCompras();
      renderizarConsumo();
    } catch (error) {
      console.error("Erro ao inicializar consumo.js:", error);
      renderizarErroGeral("Não foi possível carregar os dados da página.");
    }
  }

  function configurarEventos() {
    setupMobileMenu({
      menu,
      menuContent,
      btnOpen: btnAbrirMenu,
      btnClose: btnFecharMenu,
      backdrop
    });
    configurarTabs();

    visualizacaoConsumo.addEventListener("change", renderizarConsumo);
    visualizacaoCompras.addEventListener("change", renderizarCompras);
    agrupamentoConsumo.addEventListener("change", renderizarConsumo);

    if (filtroItemConsumo) {
      filtroItemConsumo.addEventListener("input", function () {
        filtrosConsumo.item = filtroItemConsumo.value.trim();
        renderizarConsumo();
      });
    }

    if (filtroCategoriaConsumo) {
      filtroCategoriaConsumo.addEventListener("change", function () {
        filtrosConsumo.categoria = filtroCategoriaConsumo.value;
        renderizarConsumo();
      });
    }

    if (ordenacaoConsumo) {
      ordenacaoConsumo.addEventListener("change", function () {
        sincronizarOrdenacaoPeloSelect("consumo");
        renderizarConsumo();
      });
    }

    if (btnLimparFiltrosConsumo) {
      btnLimparFiltrosConsumo.addEventListener("click", function () {
        filtrosConsumo.item = "";
        filtrosConsumo.categoria = "";

        if (filtroItemConsumo) {
          filtroItemConsumo.value = "";
        }

        if (filtroCategoriaConsumo) {
          filtroCategoriaConsumo.value = "";
        }

        renderizarConsumo();
      });
    }

    if (filtroItemMediaCompras) {
      filtroItemMediaCompras.addEventListener("input", function () {
        filtrosMediaCompras.item = filtroItemMediaCompras.value.trim();
        renderizarCompras();
      });
    }

    if (filtroCategoriaMediaCompras) {
      filtroCategoriaMediaCompras.addEventListener("change", function () {
        filtrosMediaCompras.categoria = filtroCategoriaMediaCompras.value;
        renderizarCompras();
      });
    }

    if (ordenacaoMediaCompras) {
      ordenacaoMediaCompras.addEventListener("change", function () {
        sincronizarOrdenacaoPeloSelect("compras");
        renderizarCompras();
      });
    }

    if (btnLimparFiltrosMediaCompras) {
      btnLimparFiltrosMediaCompras.addEventListener("click", function () {
        filtrosMediaCompras.item = "";
        filtrosMediaCompras.categoria = "";

        if (filtroItemMediaCompras) {
          filtroItemMediaCompras.value = "";
        }

        if (filtroCategoriaMediaCompras) {
          filtroCategoriaMediaCompras.value = "";
        }

        renderizarCompras();
      });
    }
  }

  function configurarTabs() {
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        const alvo = tab.getAttribute("data-tab");

        tabs.forEach(function (outraTab) {
          const ativa = outraTab === tab;
          outraTab.classList.toggle("active", ativa);
          outraTab.setAttribute("aria-selected", ativa ? "true" : "false");
        });

        paineis.forEach(function (painel) {
          painel.classList.toggle("active", painel.id === alvo);
        });
      });
    });
  }


  async function verificarSessao() {
    await ensureAcceptedSession();
  }

  async function carregarDados() {
    const [respostaCompras, respostaMovimentacoes] = await Promise.all([
      apiGet("/compras").catch(function () { return null; }),
      apiGet("/movimentacoes-estoque").catch(function () { return null; })
    ]);

    if (respostaCompras && respostaCompras.response.ok) {
      historicoCompras = normalizarCompras(extractListFromResponse(respostaCompras.data, ["data", "items", "resultado", "resultados", "compras", "registros", "lista"]));
    } else {
      historicoCompras = [];
    }

    if (respostaMovimentacoes && respostaMovimentacoes.response.ok) {
      movimentacoesEstoque = normalizarMovimentacoes(extractListFromResponse(respostaMovimentacoes.data, ["data", "items", "resultado", "resultados", "movimentacoes", "movimentacoesEstoque", "registros", "lista"]));
    } else {
      movimentacoesEstoque = [];
    }
  }

  function extractListFromResponse(payload) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (!payload || typeof payload !== "object") {
      return [];
    }

    const chavesPossiveis = [
      "data",
      "items",
      "resultado",
      "resultados",
      "compras",
      "movimentacoes",
      "movimentacoesEstoque",
      "registros",
      "lista"
    ];

    for (const chave of chavesPossiveis) {
      if (Array.isArray(payload[chave])) {
        return payload[chave];
      }
    }

    return [];
  }

  function normalizarCompras(lista) {
    return lista.map(function (compra) {
      const itensOriginais = Array.isArray(compra.compraItens)
        ? compra.compraItens
        : Array.isArray(compra.compra_itens)
          ? compra.compra_itens
          : Array.isArray(compra.itens)
            ? compra.itens
            : [];

      return {
        id: Number(compra.id) || null,
        data: compra.criadoEm || compra.createdAt || compra.data || compra.dataCompra || null,
        itens: itensOriginais.map(function (item) {
          const nome = String(
            item.nomeItem ||
            item.nome ||
            item.item?.nome ||
            item.grupoItem?.item?.nome ||
            ""
          ).trim();

          const categoria = normalizeCategoryName(
            item.categoria ||
            item.item?.categoria?.nome ||
            item.grupoItem?.item?.categoria?.nome ||
            ""
          );

          const unidade = String(
            item.unidade ||
            item.item?.unidadePadrao ||
            item.grupoItem?.item?.unidadePadrao ||
            ""
          ).trim();

          const quantidade = Number(item.quantidade) || 0;
          const valorUnitarioCentavos = Number.isInteger(Number(item.valorUnitarioCentavos))
            ? Number(item.valorUnitarioCentavos)
            : decimalStringToCents(item.valorUnitario);
          const subtotalInformadoCentavos = Number(item.subtotalCentavos);
          const subtotalCentavos = Number.isFinite(subtotalInformadoCentavos)
            ? subtotalInformadoCentavos
            : Math.round(quantidade * Number(valorUnitarioCentavos || 0));

          return {
            nome: nome,
            categoria: categoria,
            quantidade: quantidade,
            unidade: unidade,
            valorUnitarioCentavos: Number(valorUnitarioCentavos || 0),
            subtotalCentavos: subtotalCentavos
          };
        }).filter(function (item) {
          return Boolean(item.nome);
        })
      };
    }).filter(function (compra) {
      return Array.isArray(compra.itens) && compra.itens.length > 0;
    });
  }

  function normalizarMovimentacoes(lista) {
    return lista.map(function (mov) {
      const quantidade = Number(mov.quantidade) || 0;
      const tipo = String(mov.tipo || "").trim().toLowerCase();

      const nome = String(
        mov.item?.nome ||
        mov.itemNome ||
        mov.nomeItem ||
        mov.nome ||
        mov.grupoItem?.item?.nome ||
        ""
      ).trim();

      const unidade = String(
        mov.item?.unidadePadrao ||
        mov.unidade ||
        mov.unidadeItem ||
        mov.grupoItem?.item?.unidadePadrao ||
        ""
      ).trim();

      const categoria = normalizeCategoryName(
        mov.item?.categoria?.nome ||
        mov.categoria ||
        mov.categoriaNome ||
        mov.grupoItem?.item?.categoria?.nome ||
        ""
      );

      let variacao = quantidade;

      if (
        tipo.includes("saida") ||
        tipo.includes("saída") ||
        tipo.includes("consumo") ||
        tipo.includes("baixa")
      ) {
        variacao = quantidade * -1;
      } else if (tipo.includes("entrada")) {
        variacao = quantidade;
      } else if (Number(mov.variacao) < 0) {
        variacao = Math.abs(quantidade) * -1;
      } else if (Number(mov.variacao) > 0) {
        variacao = Math.abs(quantidade);
      }

      return {
        id: Number(mov.id) || null,
        data: mov.criadoEm || mov.createdAt || mov.data || null,
        tipo: tipo,
        nome: nome,
        unidade: unidade,
        categoria: categoria,
        variacao: variacao,
        quantidade: quantidade
      };
    }).filter(function (mov) {
      return Boolean(mov.nome) && mov.data;
    });
  }

  function popularCategoriasDinamicas() {
    const categorias = obterCategoriasDinamicas();

    preencherSelectCategorias(
      filtroCategoriaConsumo,
      "Todas as categorias",
      categorias,
      filtrosConsumo.categoria
    );

    preencherSelectCategorias(
      filtroCategoriaMediaCompras,
      "Todas as categorias",
      categorias,
      filtrosMediaCompras.categoria
    );
  }

  function obterCategoriasDinamicas() {
    const conjunto = new Set();

    movimentacoesEstoque.forEach(function (mov) {
      const categoria = normalizeCategoryName(mov.categoria || "");
      if (categoria) {
        conjunto.add(categoria);
      }
    });

    historicoCompras.forEach(function (compra) {
      const itens = Array.isArray(compra.itens) ? compra.itens : [];
      itens.forEach(function (item) {
        const categoria = normalizeCategoryName(item.categoria || "");
        if (categoria) {
          conjunto.add(categoria);
        }
      });
    });

    return Array.from(conjunto).sort(function (a, b) {
      return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
    });
  }

  function preencherSelectCategorias(selectElement, textoPadrao, categorias, valorAtual) {
    if (!selectElement) {
      return;
    }

    const valorAnterior = valorAtual || "";
    selectElement.textContent = "";
    selectElement.appendChild(criarOption("", textoPadrao));

    categorias.forEach(function (categoria) {
      selectElement.appendChild(criarOption(categoria, categoria));
    });

    const existe = Array.from(selectElement.options).some(function (option) {
      return normalizeText(option.value) === normalizeText(valorAnterior);
    });

    selectElement.value = existe ? valorAnterior : "";
  }

  function criarOption(valor, texto) {
    const option = document.createElement("option");
    option.value = valor;
    option.textContent = texto;
    return option;
  }

  function renderizarCompras() {
    const modo = visualizacaoCompras.value;
    const dadosConsolidados = consolidarHistoricoComprasPorItem(historicoCompras);
    const dadosFiltrados = aplicarFiltrosMediaCompras(dadosConsolidados);
    const dadosOrdenados = aplicarOrdenacaoMediaCompras(dadosFiltrados);

    atualizarResumoFiltrosMediaCompras();
    atualizarContador(contadorItensMediaCompras, dadosOrdenados.length, "registro(s) exibido(s)");

    if (dadosConsolidados.length === 0) {
      destruirGraficoCompras();
      renderizarEstadoVazioCompras("Nenhum dado de compra disponível até o momento.");
      return;
    }

    if (dadosOrdenados.length === 0) {
      destruirGraficoCompras();
      renderizarEstadoVazioCompras("Nenhum registro corresponde aos filtros aplicados.");
      return;
    }

    if (modo === "tabela") {
      renderizarComprasTabela(dadosOrdenados);
      return;
    }

    if (modo === "lista") {
      renderizarComprasLista(dadosOrdenados);
      return;
    }

    if (modo === "barras") {
      renderizarComprasBarras(dadosOrdenados);
      return;
    }

    if (modo === "pizza") {
      renderizarComprasPizza(dadosOrdenados);
      return;
    }

    if (modo === "linha-do-tempo") {
      renderizarComprasLinhaDoTempo(dadosOrdenados);
      return;
    }

    renderizarComprasTabela(dadosOrdenados);
  }

  function renderizarConsumo() {
    const consumos = movimentacoesEstoque.filter(function (mov) {
      return Number(mov.variacao) < 0 && mov.data;
    });

    const modo = visualizacaoConsumo.value;
    const agrupamento = agrupamentoConsumo.value;

    const consumosFiltradosNaOrigem = aplicarFiltrosMovimentacoesConsumo(consumos);
    const dadosConsolidados = consolidarConsumos(consumosFiltradosNaOrigem, agrupamento);
    const dadosOrdenados = aplicarOrdenacaoConsumo(dadosConsolidados);

    atualizarResumoFiltrosConsumo();
    atualizarContador(contadorItensConsumo, dadosOrdenados.length, "registro(s) exibido(s)");

    if (consumos.length === 0) {
      destruirGraficoConsumo();
      renderizarEstadoVazioConsumo("Nenhum dado de consumo disponível até o momento.");
      return;
    }

    if (dadosOrdenados.length === 0) {
      destruirGraficoConsumo();
      renderizarEstadoVazioConsumo("Nenhum registro corresponde aos filtros aplicados.");
      return;
    }

    if (modo === "tabela") {
      renderizarConsumoTabela(dadosOrdenados);
      return;
    }

    if (modo === "lista") {
      renderizarConsumoLista(dadosOrdenados, agrupamento);
      return;
    }

    if (modo === "barras") {
      renderizarConsumoBarras(dadosOrdenados);
      return;
    }

    if (modo === "linha-do-tempo") {
      renderizarConsumoLinhaDoTempo(dadosOrdenados);
      return;
    }

    renderizarConsumoTabela(dadosOrdenados);
  }

  function consolidarHistoricoComprasPorItem(historico) {
    const grupos = {};

    historico.forEach(function (compra) {
      const dataCompra = new Date(compra.data);
      const itens = Array.isArray(compra.itens) ? compra.itens : [];

      if (isNaN(dataCompra.getTime())) {
        return;
      }

      itens.forEach(function (item) {
        const nome = String(item.nome || "").trim();
        const categoria = normalizeCategoryName(item.categoria || "");
        const quantidade = Number(item.quantidade) || 0;
        const subtotalCentavos = Number(item.subtotalCentavos);
        const valorUnitarioCentavos = Number.isInteger(Number(item.valorUnitarioCentavos))
          ? Number(item.valorUnitarioCentavos)
          : decimalStringToCents(item.valorUnitario);
        const totalItem = Number.isFinite(subtotalCentavos)
          ? subtotalCentavos
          : Math.round(quantidade * Number(valorUnitarioCentavos || 0));

        if (!nome) {
          return;
        }

        const chave = `${normalizeText(nome)}||${normalizeText(categoria)}`;

        if (!grupos[chave]) {
          grupos[chave] = {
            nome: nome,
            categoria: categoria,
            quantidadeItens: 0,
            totalAcumulado: 0,
            ocorrenciasCompra: 0,
            ultimaCompra: dataCompra
          };
        }

        grupos[chave].quantidadeItens += quantidade;
        grupos[chave].totalAcumulado += totalItem;
        grupos[chave].ocorrenciasCompra += 1;

        if (dataCompra > grupos[chave].ultimaCompra) {
          grupos[chave].ultimaCompra = dataCompra;
        }
      });
    });

    return Object.values(grupos).map(function (grupo) {
      const mediaPorCompra = grupo.ocorrenciasCompra > 0
        ? grupo.totalAcumulado / grupo.ocorrenciasCompra
        : 0;

      const mediaPorItem = grupo.quantidadeItens > 0
        ? grupo.totalAcumulado / grupo.quantidadeItens
        : 0;

      return {
        nome: grupo.nome,
        categoria: grupo.categoria,
        ultimaCompra: grupo.ultimaCompra,
        quantidadeItens: grupo.quantidadeItens,
        totalAcumulado: grupo.totalAcumulado,
        ocorrenciasCompra: grupo.ocorrenciasCompra,
        mediaPorCompra: mediaPorCompra,
        mediaPorItem: mediaPorItem
      };
    });
  }

  function aplicarFiltrosMediaCompras(lista) {
    return lista.filter(function (item) {
      const correspondeItem =
        !filtrosMediaCompras.item ||
        normalizeText(item.nome).includes(normalizeText(filtrosMediaCompras.item));

      const correspondeCategoria =
        !filtrosMediaCompras.categoria ||
        normalizeText(item.categoria) === normalizeText(filtrosMediaCompras.categoria);

      return correspondeItem && correspondeCategoria;
    });
  }

  function aplicarFiltrosMovimentacoesConsumo(lista) {
    return lista.filter(function (mov) {
      const nome = String(mov.nome || "").trim();
      const categoria = normalizeCategoryName(mov.categoria || "");

      const correspondeItem =
        !filtrosConsumo.item ||
        normalizeText(nome).includes(normalizeText(filtrosConsumo.item));

      const correspondeCategoria =
        !filtrosConsumo.categoria ||
        normalizeText(categoria) === normalizeText(filtrosConsumo.categoria);

      return correspondeItem && correspondeCategoria;
    });
  }

  function calcularDiasNoPeriodo(dataInicial, dataFinal) {
    const umDiaEmMs = 1000 * 60 * 60 * 24;
    const diferencaEmMs = dataFinal - dataInicial;
    return Math.floor(diferencaEmMs / umDiaEmMs) + 1;
  }

  function consolidarConsumos(consumos, agrupamento) {
    const grupos = {};

    consumos.forEach(function (mov) {
      const dataMov = new Date(mov.data);
      const consumo = Math.abs(Number(mov.variacao));
      const categoria = normalizeCategoryName(mov.categoria || "");

      if (isNaN(dataMov.getTime()) || Number.isNaN(consumo)) {
        return;
      }

      let chave = "";
      let nomeExibicao = "";
      let unidadeExibicao = "";
      let categoriaExibicao = categoria;

      if (agrupamento === "categoria") {
        nomeExibicao = categoria || "Sem categoria";
        chave = normalizeText(nomeExibicao);
      } else {
        const nomeItem = String(mov.nome || "").trim();
        const unidadeItem = String(mov.unidade || "").trim();

        if (!nomeItem) {
          return;
        }

        nomeExibicao = nomeItem;
        unidadeExibicao = unidadeItem;
        chave = `${normalizeText(nomeExibicao)}||${normalizeText(unidadeExibicao)}||${normalizeText(categoriaExibicao)}`;
      }

      if (!grupos[chave]) {
        grupos[chave] = {
          nome: nomeExibicao,
          unidade: unidadeExibicao,
          categoria: categoriaExibicao,
          dataInicial: dataMov,
          dataFinal: dataMov,
          consumoTotal: 0,
          ocorrencias: 0
        };
      }

      if (dataMov < grupos[chave].dataInicial) {
        grupos[chave].dataInicial = dataMov;
      }

      if (dataMov > grupos[chave].dataFinal) {
        grupos[chave].dataFinal = dataMov;
      }

      grupos[chave].consumoTotal += consumo;
      grupos[chave].ocorrencias += 1;
    });

    return Object.values(grupos).map(function (grupo) {
      const diasNoPeriodo = calcularDiasNoPeriodo(grupo.dataInicial, grupo.dataFinal);
      const mediaDiaria = diasNoPeriodo > 0
        ? grupo.consumoTotal / diasNoPeriodo
        : grupo.consumoTotal;

      return {
        nome: grupo.nome,
        unidade: grupo.unidade,
        categoria: grupo.categoria,
        dataInicial: grupo.dataInicial,
        dataFinal: grupo.dataFinal,
        diasNoPeriodo: diasNoPeriodo,
        consumoTotal: grupo.consumoTotal,
        mediaDiaria: mediaDiaria,
        ocorrencias: grupo.ocorrencias
      };
    });
  }

  function aplicarOrdenacaoConsumo(lista) {
    const listaOrdenada = lista.slice();

    listaOrdenada.sort(function (a, b) {
      let comparacao = 0;

      if (ordenacaoAtualConsumo.campo === "item") {
        comparacao = compareText(a.nome, b.nome);
      } else if (ordenacaoAtualConsumo.campo === "categoria") {
        comparacao = compareText(a.categoria || a.nome, b.categoria || b.nome);
      } else if (ordenacaoAtualConsumo.campo === "quantidade") {
        comparacao = compareNumber(a.consumoTotal, b.consumoTotal);
      }

      if (comparacao === 0) {
        comparacao = compareText(a.nome, b.nome);
      }

      return ordenacaoAtualConsumo.direcao === "desc" ? comparacao * -1 : comparacao;
    });

    return listaOrdenada;
  }

  function aplicarOrdenacaoMediaCompras(lista) {
    const listaOrdenada = lista.slice();

    listaOrdenada.sort(function (a, b) {
      let comparacao = 0;

      if (ordenacaoAtualMediaCompras.campo === "item") {
        comparacao = compareText(a.nome, b.nome);
      } else if (ordenacaoAtualMediaCompras.campo === "categoria") {
        comparacao = compareText(a.categoria, b.categoria);
      } else if (ordenacaoAtualMediaCompras.campo === "quantidade") {
        comparacao = compareNumber(a.quantidadeItens, b.quantidadeItens);
      }

      if (comparacao === 0) {
        comparacao = compareText(a.nome, b.nome);
      }

      return ordenacaoAtualMediaCompras.direcao === "desc" ? comparacao * -1 : comparacao;
    });

    return listaOrdenada;
  }

  function renderizarComprasTabela(dados) {
    destruirGraficoCompras();
    resultadoComprasContainer.textContent = "";

    const tableResponsive = document.createElement("div");
    tableResponsive.className = "table-responsive";

    const tabela = document.createElement("table");
    tabela.className = "table table-bordered table-hover align-middle mb-0 tabela-consumo";

    const thead = document.createElement("thead");
    thead.className = "table-light";

    const trHead = document.createElement("tr");
    trHead.appendChild(criarCabecalhoOrdenavel("ordenar-coluna-item-media-compras", "Item", "compras", "item", "Ordenar por item"));
    trHead.appendChild(criarCabecalhoOrdenavel("ordenar-coluna-categoria-media-compras", "Categoria", "compras", "categoria", "Ordenar por categoria"));
    trHead.appendChild(criarCabecalhoTexto("Última compra"));
    trHead.appendChild(criarCabecalhoOrdenavel("ordenar-coluna-quantidade-media-compras", "Quantidade de itens", "compras", "quantidade", "Ordenar por quantidade de itens", "cell-quantidade"));
    trHead.appendChild(criarCabecalhoTexto("Média por compra"));
    trHead.appendChild(criarCabecalhoTexto("Média por item"));
    trHead.appendChild(criarCabecalhoTexto("Total acumulado"));

    thead.appendChild(trHead);

    const tbody = document.createElement("tbody");

    dados.forEach(function (grupo) {
      const linha = templateLinhaMediaCompras
        ? templateLinhaMediaCompras.content.firstElementChild.cloneNode(true)
        : document.createElement("tr");

      linha.dataset.item = normalizeText(grupo.nome);
      linha.dataset.categoria = normalizeText(grupo.categoria);
      linha.dataset.quantidade = String(Number(grupo.quantidadeItens) || 0);

      preencherCelula(linha, ".item-nome", grupo.nome);
      preencherCelula(linha, ".item-categoria", grupo.categoria || "Sem categoria");
      preencherCelula(linha, ".item-data-compra", formatDate(grupo.ultimaCompra));
      preencherCelula(linha, ".item-quantidade", formatNumber(grupo.quantidadeItens));
      preencherCelula(linha, ".item-media-compra", formatCurrency(grupo.mediaPorCompra));
      preencherCelula(linha, ".item-media-item", formatCurrency(grupo.mediaPorItem));
      preencherCelula(linha, ".item-total-acumulado", formatCurrency(grupo.totalAcumulado));

      tbody.appendChild(linha);
    });

    tabela.appendChild(thead);
    tabela.appendChild(tbody);
    tableResponsive.appendChild(tabela);
    resultadoComprasContainer.appendChild(tableResponsive);

    atualizarIndicadoresOrdenacao("compras");
  }

  function renderizarComprasLista(dados) {
    destruirGraficoCompras();
    resultadoComprasContainer.textContent = "";

    const lista = document.createElement("div");
    lista.className = "list-group";

    dados.forEach(function (grupo) {
      const item = document.createElement("div");
      item.className = "list-group-item";

      item.appendChild(criarBlocoTexto("fw-semibold", grupo.nome));
      item.appendChild(criarBlocoTexto("small text-muted", grupo.categoria || "Sem categoria"));
      item.appendChild(criarBlocoTexto("small", `Última compra: ${formatDate(grupo.ultimaCompra)}`));
      item.appendChild(criarBlocoTexto("small", `Quantidade de itens: ${formatNumber(grupo.quantidadeItens)}`));
      item.appendChild(criarBlocoTexto("small", `Média por compra: ${formatCurrency(grupo.mediaPorCompra)}`));
      item.appendChild(criarBlocoTexto("small", `Média por item: ${formatCurrency(grupo.mediaPorItem)}`));
      item.appendChild(criarBlocoTexto("small", `Total acumulado: ${formatCurrency(grupo.totalAcumulado)}`));

      lista.appendChild(item);
    });

    resultadoComprasContainer.appendChild(lista);
  }

  function renderizarComprasBarras(dados) {
    resultadoComprasContainer.textContent = "";

    const wrapper = document.createElement("div");
    wrapper.style.height = "320px";

    const canvas = document.createElement("canvas");
    canvas.id = "grafico-compras-barras";

    wrapper.appendChild(canvas);
    resultadoComprasContainer.appendChild(wrapper);

    destruirGraficoCompras();

    if (typeof Chart === "undefined") {
      return;
    }

    graficoCompras = new Chart(canvas, {
      type: "bar",
      data: {
        labels: dados.map(function (item) { return item.nome; }),
        datasets: [
          {
            label: "Total acumulado",
            data: dados.map(function (item) { return item.totalAcumulado; })
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  function renderizarComprasPizza(dados) {
    resultadoComprasContainer.textContent = "";

    const wrapper = document.createElement("div");
    wrapper.style.height = "320px";

    const canvas = document.createElement("canvas");
    canvas.id = "grafico-compras-pizza";

    wrapper.appendChild(canvas);
    resultadoComprasContainer.appendChild(wrapper);

    destruirGraficoCompras();

    if (typeof Chart === "undefined") {
      return;
    }

    graficoCompras = new Chart(canvas, {
      type: "pie",
      data: {
        labels: dados.map(function (item) { return item.nome; }),
        datasets: [
          {
            label: "Total acumulado",
            data: dados.map(function (item) { return item.totalAcumulado; })
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  function renderizarComprasLinhaDoTempo(dados) {
    resultadoComprasContainer.textContent = "";

    const wrapper = document.createElement("div");
    wrapper.style.height = "320px";

    const canvas = document.createElement("canvas");
    canvas.id = "grafico-compras-linha-tempo";

    wrapper.appendChild(canvas);
    resultadoComprasContainer.appendChild(wrapper);

    destruirGraficoCompras();

    if (typeof Chart === "undefined") {
      return;
    }

    const ordenadosPorData = dados.slice().sort(function (a, b) {
      return new Date(a.ultimaCompra) - new Date(b.ultimaCompra);
    });

    graficoCompras = new Chart(canvas, {
      type: "line",
      data: {
        labels: ordenadosPorData.map(function (item) {
          return formatDate(item.ultimaCompra);
        }),
        datasets: [
          {
            label: "Total acumulado",
            data: ordenadosPorData.map(function (item) {
              return item.totalAcumulado;
            }),
            fill: false,
            tension: 0.2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  function renderizarConsumoTabela(dados) {
    destruirGraficoConsumo();
    resultadoConsumoContainer.textContent = "";

    const tableResponsive = document.createElement("div");
    tableResponsive.className = "table-responsive";

    const tabela = document.createElement("table");
    tabela.className = "table table-bordered table-hover align-middle mb-0 tabela-consumo";

    const thead = document.createElement("thead");
    thead.className = "table-light";

    const trHead = document.createElement("tr");
    trHead.appendChild(criarCabecalhoOrdenavel("ordenar-coluna-item-consumo", "Item", "consumo", "item", "Ordenar por item"));
    trHead.appendChild(criarCabecalhoTexto("Unidade"));
    trHead.appendChild(criarCabecalhoOrdenavel("ordenar-coluna-categoria-consumo", "Categoria", "consumo", "categoria", "Ordenar por categoria"));
    trHead.appendChild(criarCabecalhoTexto("Data inicial"));
    trHead.appendChild(criarCabecalhoTexto("Data final"));
    trHead.appendChild(criarCabecalhoTexto("Dias no período"));
    trHead.appendChild(criarCabecalhoOrdenavel("ordenar-coluna-quantidade-consumo", "Consumo total", "consumo", "quantidade", "Ordenar por consumo total", "cell-quantidade"));
    trHead.appendChild(criarCabecalhoTexto("Média diária"));
    trHead.appendChild(criarCabecalhoTexto("Ocorrências"));

    thead.appendChild(trHead);

    const tbody = document.createElement("tbody");

    dados.forEach(function (grupo) {
      const linha = templateLinhaConsumo
        ? templateLinhaConsumo.content.firstElementChild.cloneNode(true)
        : document.createElement("tr");

      linha.dataset.item = normalizeText(grupo.nome);
      linha.dataset.categoria = normalizeText(grupo.categoria);
      linha.dataset.quantidade = String(Number(grupo.consumoTotal) || 0);

      preencherCelula(linha, ".item-nome", grupo.nome);
      preencherCelula(linha, ".item-unidade", grupo.unidade || "-");
      preencherCelula(linha, ".item-categoria", grupo.categoria || "Sem categoria");
      preencherCelula(linha, ".item-data-inicial", formatDate(grupo.dataInicial));
      preencherCelula(linha, ".item-data-final", formatDate(grupo.dataFinal));
      preencherCelula(linha, ".item-dias-periodo", formatNumber(grupo.diasNoPeriodo));
      preencherCelula(linha, ".item-quantidade", formatNumber(grupo.consumoTotal));
      preencherCelula(linha, ".item-media-diaria", formatNumber(grupo.mediaDiaria));
      preencherCelula(linha, ".item-ocorrencias", formatNumber(grupo.ocorrencias));

      tbody.appendChild(linha);
    });

    tabela.appendChild(thead);
    tabela.appendChild(tbody);
    tableResponsive.appendChild(tabela);
    resultadoConsumoContainer.appendChild(tableResponsive);

    atualizarIndicadoresOrdenacao("consumo");
  }

  function renderizarConsumoLista(dados, agrupamento) {
    destruirGraficoConsumo();
    resultadoConsumoContainer.textContent = "";

    const lista = document.createElement("div");
    lista.className = "list-group";

    dados.forEach(function (grupo) {
      const item = document.createElement("div");
      item.className = "list-group-item";

      item.appendChild(criarBlocoTexto("fw-semibold", grupo.nome));

      if (agrupamento === "item") {
        item.appendChild(criarBlocoTexto("small text-muted", grupo.unidade || "-"));
      }

      item.appendChild(criarBlocoTexto("small text-muted", grupo.categoria || "Sem categoria"));
      item.appendChild(criarBlocoTexto("small", `Período: ${formatDate(grupo.dataInicial)} até ${formatDate(grupo.dataFinal)}`));
      item.appendChild(criarBlocoTexto("small", `Dias no período: ${formatNumber(grupo.diasNoPeriodo)}`));
      item.appendChild(criarBlocoTexto("small", `Consumo total: ${formatNumber(grupo.consumoTotal)}`));
      item.appendChild(criarBlocoTexto("small", `Média diária: ${formatNumber(grupo.mediaDiaria)}`));
      item.appendChild(criarBlocoTexto("small", `Ocorrências: ${formatNumber(grupo.ocorrencias)}`));

      lista.appendChild(item);
    });

    resultadoConsumoContainer.appendChild(lista);
  }

  function renderizarConsumoBarras(dados) {
    resultadoConsumoContainer.textContent = "";

    const wrapper = document.createElement("div");
    wrapper.style.height = "320px";

    const canvas = document.createElement("canvas");
    canvas.id = "grafico-consumo-barras";

    wrapper.appendChild(canvas);
    resultadoConsumoContainer.appendChild(wrapper);

    destruirGraficoConsumo();

    if (typeof Chart === "undefined") {
      return;
    }

    graficoConsumo = new Chart(canvas, {
      type: "bar",
      data: {
        labels: dados.map(function (item) { return item.nome; }),
        datasets: [
          {
            label: "Consumo total",
            data: dados.map(function (item) { return item.consumoTotal; })
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  function renderizarConsumoLinhaDoTempo(dados) {
    resultadoConsumoContainer.textContent = "";

    const wrapper = document.createElement("div");
    wrapper.style.height = "320px";

    const canvas = document.createElement("canvas");
    canvas.id = "grafico-consumo-linha-tempo";

    wrapper.appendChild(canvas);
    resultadoConsumoContainer.appendChild(wrapper);

    destruirGraficoConsumo();

    if (typeof Chart === "undefined") {
      return;
    }

    const ordenadosPorData = dados.slice().sort(function (a, b) {
      return new Date(a.dataFinal) - new Date(b.dataFinal);
    });

    graficoConsumo = new Chart(canvas, {
      type: "line",
      data: {
        labels: ordenadosPorData.map(function (item) {
          return formatDate(item.dataFinal);
        }),
        datasets: [
          {
            label: "Consumo total",
            data: ordenadosPorData.map(function (item) {
              return item.consumoTotal;
            }),
            fill: false,
            tension: 0.2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  function renderizarEstadoVazioCompras(mensagem) {
    destruirGraficoCompras();
    resultadoComprasContainer.textContent = "";

    const alerta = document.createElement("div");
    alerta.className = "alert alert-light border text-muted mb-0";
    alerta.textContent = mensagem;

    resultadoComprasContainer.appendChild(alerta);
  }

  function renderizarEstadoVazioConsumo(mensagem) {
    destruirGraficoConsumo();
    resultadoConsumoContainer.textContent = "";

    const alerta = document.createElement("div");
    alerta.className = "alert alert-light border text-muted mb-0";
    alerta.textContent = mensagem;

    resultadoConsumoContainer.appendChild(alerta);
  }

  function renderizarErroGeral(mensagem) {
    destruirGraficoCompras();
    destruirGraficoConsumo();

    resultadoComprasContainer.textContent = "";
    resultadoConsumoContainer.textContent = "";

    const alertaCompras = document.createElement("div");
    alertaCompras.className = "alert alert-danger mb-0";
    alertaCompras.textContent = mensagem;

    const alertaConsumo = document.createElement("div");
    alertaConsumo.className = "alert alert-danger mb-0";
    alertaConsumo.textContent = mensagem;

    resultadoComprasContainer.appendChild(alertaCompras);
    resultadoConsumoContainer.appendChild(alertaConsumo);
  }

  function destruirGraficoCompras() {
    if (graficoCompras) {
      graficoCompras.destroy();
      graficoCompras = null;
    }
  }

  function destruirGraficoConsumo() {
    if (graficoConsumo) {
      graficoConsumo.destroy();
      graficoConsumo = null;
    }
  }

  function criarCabecalhoTexto(texto, className = "") {
    const th = document.createElement("th");
    th.scope = "col";
    if (className) {
      th.className = className;
    }
    th.textContent = texto;
    return th;
  }

  function criarCabecalhoOrdenavel(id, texto, tipo, campo, ariaLabel, className = "") {
    const th = document.createElement("th");
    th.scope = "col";
    th.id = id;
    th.role = "button";
    th.tabIndex = 0;
    th.setAttribute("data-sort-key", campo);
    th.setAttribute("aria-label", ariaLabel);
    th.className = `sortable-header${className ? " " + className : ""}`;

    const spanTexto = document.createElement("span");
    spanTexto.textContent = texto;

    const indicador = document.createElement("span");
    indicador.className = "sort-indicator";
    indicador.setAttribute("aria-hidden", "true");
    indicador.textContent = "↕";

    th.appendChild(spanTexto);
    th.appendChild(document.createTextNode(" "));
    th.appendChild(indicador);

    configurarOrdenacaoPorCabecalho(tipo, th, campo);
    return th;
  }

  function preencherCelula(linha, seletor, valor) {
    const celula = linha.querySelector(seletor);
    if (celula) {
      celula.textContent = valor;
    }
  }

  function criarBlocoTexto(className, texto) {
    const div = document.createElement("div");
    div.className = className;
    div.textContent = texto;
    return div;
  }

  function configurarOrdenacaoPorCabecalho(tipo, elemento, campo) {
    if (!elemento || elemento.dataset.sortBound === "true") {
      return;
    }

    elemento.dataset.sortBound = "true";

    elemento.addEventListener("click", function () {
      alternarOrdenacao(tipo, campo);
    });

    elemento.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        alternarOrdenacao(tipo, campo);
      }
    });
  }

  function alternarOrdenacao(tipo, campo) {
    const estado = tipo === "consumo" ? ordenacaoAtualConsumo : ordenacaoAtualMediaCompras;

    if (estado.campo === campo) {
      estado.direcao = estado.direcao === "asc" ? "desc" : "asc";
    } else {
      estado.campo = campo;
      estado.direcao = "asc";
    }

    sincronizarOrdenacaoComSelect(tipo);

    if (tipo === "consumo") {
      renderizarConsumo();
    } else {
      renderizarCompras();
    }
  }

  function sincronizarOrdenacaoComSelect(tipo) {
    const estado = tipo === "consumo" ? ordenacaoAtualConsumo : ordenacaoAtualMediaCompras;
    const select = tipo === "consumo" ? ordenacaoConsumo : ordenacaoMediaCompras;

    if (!select) {
      return;
    }

    select.value = `${estado.campo}-${estado.direcao}`;
  }

  function sincronizarOrdenacaoPeloSelect(tipo) {
    const estado = tipo === "consumo" ? ordenacaoAtualConsumo : ordenacaoAtualMediaCompras;
    const select = tipo === "consumo" ? ordenacaoConsumo : ordenacaoMediaCompras;

    if (!select || !select.value) {
      return;
    }

    const partes = select.value.split("-");
    estado.campo = partes[0] || "item";
    estado.direcao = partes[1] || "asc";
  }

  function atualizarIndicadoresOrdenacao(tipo) {
    const estado = tipo === "consumo" ? ordenacaoAtualConsumo : ordenacaoAtualMediaCompras;
    const ids = tipo === "consumo"
      ? {
          item: "ordenar-coluna-item-consumo",
          categoria: "ordenar-coluna-categoria-consumo",
          quantidade: "ordenar-coluna-quantidade-consumo"
        }
      : {
          item: "ordenar-coluna-item-media-compras",
          categoria: "ordenar-coluna-categoria-media-compras",
          quantidade: "ordenar-coluna-quantidade-media-compras"
        };

    Object.keys(ids).forEach(function (campo) {
      const elemento = document.getElementById(ids[campo]);
      if (!elemento) {
        return;
      }

      const indicador = elemento.querySelector(".sort-indicator");
      const ativo = estado.campo === campo;

      elemento.setAttribute(
        "aria-sort",
        ativo ? (estado.direcao === "asc" ? "ascending" : "descending") : "none"
      );

      if (indicador) {
        indicador.textContent = !ativo ? "↕" : estado.direcao === "asc" ? "↑" : "↓";
      }
    });
  }

  function atualizarResumoFiltrosConsumo() {
    renderFilterSummary(resumoFiltrosConsumo, [
      {
        label: "Item",
        value: filtrosConsumo.item,
        onRemove: function () {
          filtrosConsumo.item = "";
          if (filtroItemConsumo) {
            filtroItemConsumo.value = "";
          }
          renderizarConsumo();
        }
      },
      {
        label: "Categoria",
        value: filtrosConsumo.categoria,
        onRemove: function () {
          filtrosConsumo.categoria = "";
          if (filtroCategoriaConsumo) {
            filtroCategoriaConsumo.value = "";
          }
          renderizarConsumo();
        }
      }
    ]);
  }

  function atualizarResumoFiltrosMediaCompras() {
    renderFilterSummary(resumoFiltrosMediaCompras, [
      {
        label: "Item",
        value: filtrosMediaCompras.item,
        onRemove: function () {
          filtrosMediaCompras.item = "";
          if (filtroItemMediaCompras) {
            filtroItemMediaCompras.value = "";
          }
          renderizarCompras();
        }
      },
      {
        label: "Categoria",
        value: filtrosMediaCompras.categoria,
        onRemove: function () {
          filtrosMediaCompras.categoria = "";
          if (filtroCategoriaMediaCompras) {
            filtroCategoriaMediaCompras.value = "";
          }
          renderizarCompras();
        }
      }
    ]);
  }

  function atualizarContador(elemento, quantidade, sufixo) {
    updateCountLabel(elemento, quantidade, sufixo);
  }





  function formatDate(valor) {
    const data = new Date(valor);

    if (isNaN(data.getTime())) {
      return "-";
    }

    return data.toLocaleDateString("pt-BR");
  }



});
