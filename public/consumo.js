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
  let ultimoElementoFocado = null;

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
    configurarMenuMobile();
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

  function configurarMenuMobile() {
    if (!menu || !menuContent || !backdrop) {
      return;
    }

    function abrirMenu() {
      ultimoElementoFocado = document.activeElement;
      menu.classList.add("is-open");
      menuContent.classList.add("is-open");
      menu.setAttribute("aria-hidden", "false");
      backdrop.hidden = false;

      if (btnAbrirMenu) {
        btnAbrirMenu.setAttribute("aria-expanded", "true");
      }

      document.body.classList.add("menu-mobile-open");
      menuContent.focus();
    }

    function fecharMenu() {
      menu.classList.remove("is-open");
      menuContent.classList.remove("is-open");
      menu.setAttribute("aria-hidden", "true");
      backdrop.hidden = true;

      if (btnAbrirMenu) {
        btnAbrirMenu.setAttribute("aria-expanded", "false");
      }

      document.body.classList.remove("menu-mobile-open");

      if (ultimoElementoFocado && typeof ultimoElementoFocado.focus === "function") {
        ultimoElementoFocado.focus();
      }
    }

    if (btnAbrirMenu) {
      btnAbrirMenu.addEventListener("click", abrirMenu);
    }

    if (btnFecharMenu) {
      btnFecharMenu.addEventListener("click", fecharMenu);
    }

    backdrop.addEventListener("click", fecharMenu);

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        fecharMenu();
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth >= 992) {
        fecharMenu();
      }
    });
  }

  async function verificarSessao() {
    try {
      const resposta = await fetch("/sessao", {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json"
        }
      });

      if (!resposta.ok) {
        window.location.replace("index.html");
        throw new Error("Sessão não encontrada");
      }

      const dados = await lerJsonSeguro(resposta);

      if (!dados.usuario) {
        window.location.replace("index.html");
        throw new Error("Usuário não encontrado na sessão");
      }

      const statusGrupo = String(dados.usuario.statusGrupo || "").toLowerCase();
      if (statusGrupo && statusGrupo !== "aceito") {
        window.location.replace("aguardando.html");
        throw new Error("Usuário ainda não foi aceito no grupo");
      }
    } catch (error) {
      if (!String(error.message || "").includes("aceito no grupo")) {
        window.location.replace("index.html");
      }
      throw error;
    }
  }

  async function carregarDados() {
    const [respostaCompras, respostaMovimentacoes] = await Promise.all([
      fetch("/compras", {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" }
      }).catch(function () { return null; }),
      fetch("/movimentacoes-estoque", {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" }
      }).catch(function () { return null; })
    ]);

    if (respostaCompras && respostaCompras.ok) {
      const dadosCompras = await lerJsonSeguro(respostaCompras);
      historicoCompras = normalizarCompras(extrairListaResposta(dadosCompras));
    } else {
      historicoCompras = [];
    }

    if (respostaMovimentacoes && respostaMovimentacoes.ok) {
      const dadosMovimentacoes = await lerJsonSeguro(respostaMovimentacoes);
      movimentacoesEstoque = normalizarMovimentacoes(extrairListaResposta(dadosMovimentacoes));
    } else {
      movimentacoesEstoque = [];
    }
  }

  function extrairListaResposta(payload) {
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

          const categoria = normalizarNomeCategoria(
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
          const valorUnitario = Number(item.valorUnitario) || 0;
          const subtotalInformado = Number(item.subtotal);
          const subtotal = Number.isNaN(subtotalInformado)
            ? quantidade * valorUnitario
            : subtotalInformado;

          return {
            nome: nome,
            categoria: categoria,
            quantidade: quantidade,
            unidade: unidade,
            valorUnitario: valorUnitario,
            subtotal: subtotal
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

      const categoria = normalizarNomeCategoria(
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
      const categoria = normalizarNomeCategoria(mov.categoria || "");
      if (categoria) {
        conjunto.add(categoria);
      }
    });

    historicoCompras.forEach(function (compra) {
      const itens = Array.isArray(compra.itens) ? compra.itens : [];
      itens.forEach(function (item) {
        const categoria = normalizarNomeCategoria(item.categoria || "");
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
      return normalizarTexto(option.value) === normalizarTexto(valorAnterior);
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
        const categoria = normalizarNomeCategoria(item.categoria || "");
        const quantidade = Number(item.quantidade) || 0;
        const subtotal = Number(item.subtotal);
        const valorUnitario = Number(item.valorUnitario) || 0;
        const totalItem = Number.isNaN(subtotal) ? quantidade * valorUnitario : subtotal;

        if (!nome) {
          return;
        }

        const chave = `${normalizarTexto(nome)}||${normalizarTexto(categoria)}`;

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
        normalizarTexto(item.nome).includes(normalizarTexto(filtrosMediaCompras.item));

      const correspondeCategoria =
        !filtrosMediaCompras.categoria ||
        normalizarTexto(item.categoria) === normalizarTexto(filtrosMediaCompras.categoria);

      return correspondeItem && correspondeCategoria;
    });
  }

  function aplicarFiltrosMovimentacoesConsumo(lista) {
    return lista.filter(function (mov) {
      const nome = String(mov.nome || "").trim();
      const categoria = normalizarNomeCategoria(mov.categoria || "");

      const correspondeItem =
        !filtrosConsumo.item ||
        normalizarTexto(nome).includes(normalizarTexto(filtrosConsumo.item));

      const correspondeCategoria =
        !filtrosConsumo.categoria ||
        normalizarTexto(categoria) === normalizarTexto(filtrosConsumo.categoria);

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
      const categoria = normalizarNomeCategoria(mov.categoria || "");

      if (isNaN(dataMov.getTime()) || Number.isNaN(consumo)) {
        return;
      }

      let chave = "";
      let nomeExibicao = "";
      let unidadeExibicao = "";
      let categoriaExibicao = categoria;

      if (agrupamento === "categoria") {
        nomeExibicao = categoria || "Sem categoria";
        chave = normalizarTexto(nomeExibicao);
      } else {
        const nomeItem = String(mov.nome || "").trim();
        const unidadeItem = String(mov.unidade || "").trim();

        if (!nomeItem) {
          return;
        }

        nomeExibicao = nomeItem;
        unidadeExibicao = unidadeItem;
        chave = `${normalizarTexto(nomeExibicao)}||${normalizarTexto(unidadeExibicao)}||${normalizarTexto(categoriaExibicao)}`;
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
        comparacao = compararTexto(a.nome, b.nome);
      } else if (ordenacaoAtualConsumo.campo === "categoria") {
        comparacao = compararTexto(a.categoria || a.nome, b.categoria || b.nome);
      } else if (ordenacaoAtualConsumo.campo === "quantidade") {
        comparacao = compararNumero(a.consumoTotal, b.consumoTotal);
      }

      if (comparacao === 0) {
        comparacao = compararTexto(a.nome, b.nome);
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
        comparacao = compararTexto(a.nome, b.nome);
      } else if (ordenacaoAtualMediaCompras.campo === "categoria") {
        comparacao = compararTexto(a.categoria, b.categoria);
      } else if (ordenacaoAtualMediaCompras.campo === "quantidade") {
        comparacao = compararNumero(a.quantidadeItens, b.quantidadeItens);
      }

      if (comparacao === 0) {
        comparacao = compararTexto(a.nome, b.nome);
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

      linha.dataset.item = normalizarTexto(grupo.nome);
      linha.dataset.categoria = normalizarTexto(grupo.categoria);
      linha.dataset.quantidade = String(Number(grupo.quantidadeItens) || 0);

      preencherCelula(linha, ".item-nome", grupo.nome);
      preencherCelula(linha, ".item-categoria", grupo.categoria || "Sem categoria");
      preencherCelula(linha, ".item-data-compra", formatarData(grupo.ultimaCompra));
      preencherCelula(linha, ".item-quantidade", formatarNumero(grupo.quantidadeItens));
      preencherCelula(linha, ".item-media-compra", formatarMoeda(grupo.mediaPorCompra));
      preencherCelula(linha, ".item-media-item", formatarMoeda(grupo.mediaPorItem));
      preencherCelula(linha, ".item-total-acumulado", formatarMoeda(grupo.totalAcumulado));

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
      item.appendChild(criarBlocoTexto("small", `Última compra: ${formatarData(grupo.ultimaCompra)}`));
      item.appendChild(criarBlocoTexto("small", `Quantidade de itens: ${formatarNumero(grupo.quantidadeItens)}`));
      item.appendChild(criarBlocoTexto("small", `Média por compra: ${formatarMoeda(grupo.mediaPorCompra)}`));
      item.appendChild(criarBlocoTexto("small", `Média por item: ${formatarMoeda(grupo.mediaPorItem)}`));
      item.appendChild(criarBlocoTexto("small", `Total acumulado: ${formatarMoeda(grupo.totalAcumulado)}`));

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
          return formatarData(item.ultimaCompra);
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

      linha.dataset.item = normalizarTexto(grupo.nome);
      linha.dataset.categoria = normalizarTexto(grupo.categoria);
      linha.dataset.quantidade = String(Number(grupo.consumoTotal) || 0);

      preencherCelula(linha, ".item-nome", grupo.nome);
      preencherCelula(linha, ".item-unidade", grupo.unidade || "-");
      preencherCelula(linha, ".item-categoria", grupo.categoria || "Sem categoria");
      preencherCelula(linha, ".item-data-inicial", formatarData(grupo.dataInicial));
      preencherCelula(linha, ".item-data-final", formatarData(grupo.dataFinal));
      preencherCelula(linha, ".item-dias-periodo", formatarNumero(grupo.diasNoPeriodo));
      preencherCelula(linha, ".item-quantidade", formatarNumero(grupo.consumoTotal));
      preencherCelula(linha, ".item-media-diaria", formatarNumero(grupo.mediaDiaria));
      preencherCelula(linha, ".item-ocorrencias", formatarNumero(grupo.ocorrencias));

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
      item.appendChild(criarBlocoTexto("small", `Período: ${formatarData(grupo.dataInicial)} até ${formatarData(grupo.dataFinal)}`));
      item.appendChild(criarBlocoTexto("small", `Dias no período: ${formatarNumero(grupo.diasNoPeriodo)}`));
      item.appendChild(criarBlocoTexto("small", `Consumo total: ${formatarNumero(grupo.consumoTotal)}`));
      item.appendChild(criarBlocoTexto("small", `Média diária: ${formatarNumero(grupo.mediaDiaria)}`));
      item.appendChild(criarBlocoTexto("small", `Ocorrências: ${formatarNumero(grupo.ocorrencias)}`));

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
          return formatarData(item.dataFinal);
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
    atualizarResumoFiltros(
      resumoFiltrosConsumo,
      filtrosConsumo,
      [
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
      ]
    );
  }

  function atualizarResumoFiltrosMediaCompras() {
    atualizarResumoFiltros(
      resumoFiltrosMediaCompras,
      filtrosMediaCompras,
      [
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
      ]
    );
  }

  function atualizarResumoFiltros(container, estado, definicoes) {
    if (!container) {
      return;
    }

    container.textContent = "";

    definicoes.forEach(function (definicao) {
      if (!definicao.value) {
        return;
      }

      container.appendChild(criarChipFiltro(`${definicao.label}: ${definicao.value}`, definicao.onRemove));
    });
  }

  function criarChipFiltro(texto, onRemove) {
    const chip = document.createElement("span");
    chip.className = "filter-chip";

    const spanTexto = document.createElement("span");
    spanTexto.textContent = texto;

    const botao = document.createElement("button");
    botao.type = "button";
    botao.setAttribute("aria-label", "Remover filtro");
    botao.textContent = "×";
    botao.addEventListener("click", onRemove);

    chip.appendChild(spanTexto);
    chip.appendChild(botao);
    return chip;
  }

  function atualizarContador(elemento, quantidade, sufixo) {
    if (!elemento) {
      return;
    }

    elemento.textContent = `${quantidade} ${sufixo}`;
  }

  function compararTexto(a, b) {
    return String(a || "").localeCompare(String(b || ""), "pt-BR", {
      sensitivity: "base"
    });
  }

  function compararNumero(a, b) {
    return Number(a || 0) - Number(b || 0);
  }

  function normalizarTexto(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }

  function normalizarNomeCategoria(valor) {
    return String(valor || "").trim().replace(/\s+/g, " ");
  }

  function formatarData(valor) {
    const data = new Date(valor);

    if (isNaN(data.getTime())) {
      return "-";
    }

    return data.toLocaleDateString("pt-BR");
  }

  function formatarNumero(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  async function lerJsonSeguro(resposta) {
    try {
      return await resposta.json();
    } catch {
      return {};
    }
  }
});
