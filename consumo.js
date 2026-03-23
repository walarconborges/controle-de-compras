document.addEventListener("DOMContentLoaded", function () {
  const CHAVE_HISTORICO_COMPRAS = "controleComprasHistoricoCompras";
  const CHAVE_MOVIMENTACOES_ESTOQUE = "controleComprasMovimentacoesEstoque";
  const CHAVE_CATEGORIAS = "controleComprasCategorias";

  const visualizacaoConsumo = document.getElementById("visualizacao-consumo");
  const visualizacaoCompras = document.getElementById("visualizacao-compras");
  const agrupamentoConsumo = document.getElementById("agrupamento-consumo");

  const resultadoConsumoContainer = document.getElementById("resultado-consumo");
  const resultadoComprasContainer = document.getElementById("resultado-compras");

  const consumoTabelaBody = document.getElementById("consumo-tabela-body");
  const mediaComprasTabelaBody = document.getElementById("media-compras-tabela-body");

  const templateLinhaConsumo = document.getElementById("template-linha-consumo");
  const templateLinhaMediaCompras = document.getElementById("template-linha-media-compras");

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

  const ordenarColunaItemConsumo = document.getElementById("ordenar-coluna-item-consumo");
  const ordenarColunaCategoriaConsumo = document.getElementById("ordenar-coluna-categoria-consumo");
  const ordenarColunaQuantidadeConsumo = document.getElementById("ordenar-coluna-quantidade-consumo");

  const ordenarColunaItemMediaCompras = document.getElementById("ordenar-coluna-item-media-compras");
  const ordenarColunaCategoriaMediaCompras = document.getElementById("ordenar-coluna-categoria-media-compras");
  const ordenarColunaQuantidadeMediaCompras = document.getElementById("ordenar-coluna-quantidade-media-compras");

  let graficoCompras = null;
  let graficoConsumo = null;

  let filtrosConsumo = {
    item: "",
    categoria: ""
  };

  let filtrosMediaCompras = {
    item: "",
    categoria: ""
  };

  let ordenacaoAtualConsumo = {
    campo: "item",
    direcao: "asc"
  };

  let ordenacaoAtualMediaCompras = {
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
  popularCategoriasDinamicas();

  visualizacaoConsumo.addEventListener("change", function () {
    renderizarConsumo();
  });

  visualizacaoCompras.addEventListener("change", function () {
    renderizarCompras();
  });

  agrupamentoConsumo.addEventListener("change", function () {
    renderizarConsumo();
  });

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

  configurarOrdenacaoPorCabecalho("consumo", ordenarColunaItemConsumo, "item");
  configurarOrdenacaoPorCabecalho("consumo", ordenarColunaCategoriaConsumo, "categoria");
  configurarOrdenacaoPorCabecalho("consumo", ordenarColunaQuantidadeConsumo, "quantidade");

  configurarOrdenacaoPorCabecalho("compras", ordenarColunaItemMediaCompras, "item");
  configurarOrdenacaoPorCabecalho("compras", ordenarColunaCategoriaMediaCompras, "categoria");
  configurarOrdenacaoPorCabecalho("compras", ordenarColunaQuantidadeMediaCompras, "quantidade");

  renderizarCompras();
  renderizarConsumo();

  function carregarHistoricoCompras() {
    const dadosSalvos = localStorage.getItem(CHAVE_HISTORICO_COMPRAS);

    if (!dadosSalvos) {
      return [];
    }

    try {
      const dados = JSON.parse(dadosSalvos);
      return Array.isArray(dados) ? dados : [];
    } catch (erro) {
      console.error("Erro ao carregar histórico de compras:", erro);
      return [];
    }
  }

  function carregarMovimentacoesEstoque() {
    const dadosSalvos = localStorage.getItem(CHAVE_MOVIMENTACOES_ESTOQUE);

    if (!dadosSalvos) {
      return [];
    }

    try {
      const dados = JSON.parse(dadosSalvos);
      return Array.isArray(dados) ? dados : [];
    } catch (erro) {
      console.error("Erro ao carregar movimentações do estoque:", erro);
      return [];
    }
  }

  function carregarCategoriasSalvas() {
    const dadosSalvos = localStorage.getItem(CHAVE_CATEGORIAS);

    if (!dadosSalvos) {
      return [];
    }

    try {
      const dados = JSON.parse(dadosSalvos);
      return Array.isArray(dados) ? dados : [];
    } catch (erro) {
      console.error("Erro ao carregar categorias:", erro);
      return [];
    }
  }

  function popularCategoriasDinamicas() {
    const categorias = obterCategoriasDinamicas();

    preencherSelectCategorias(filtroCategoriaConsumo, "Todas as categorias", categorias, filtrosConsumo.categoria);
    preencherSelectCategorias(filtroCategoriaMediaCompras, "Todas as categorias", categorias, filtrosMediaCompras.categoria);
  }

  function preencherSelectCategorias(selectElement, textoPadrao, categorias, valorAtual) {
    if (!selectElement) {
      return;
    }

    selectElement.innerHTML = "";
    selectElement.appendChild(criarOption("", textoPadrao));

    categorias.forEach(function (categoria) {
      selectElement.appendChild(criarOption(categoria, categoria));
    });

    const existe = Array.from(selectElement.options).some(function (option) {
      return normalizarTexto(option.value) === normalizarTexto(valorAtual);
    });

    selectElement.value = existe ? valorAtual : "";
  }

  function obterCategoriasDinamicas() {
    const conjunto = new Set();

    carregarCategoriasSalvas().forEach(function (categoria) {
      const valor = normalizarNomeCategoria(categoria);
      if (valor) {
        conjunto.add(valor);
      }
    });

    carregarMovimentacoesEstoque().forEach(function (mov) {
      const valor = normalizarNomeCategoria(mov.categoria || "");
      if (valor) {
        conjunto.add(valor);
      }
    });

    carregarHistoricoCompras().forEach(function (compra) {
      const itens = Array.isArray(compra.itens) ? compra.itens : [];
      itens.forEach(function (item) {
        const valor = normalizarNomeCategoria(item.categoria || "");
        if (valor) {
          conjunto.add(valor);
        }
      });
    });

    return Array.from(conjunto).sort(function (a, b) {
      return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
    });
  }

  function criarOption(valor, texto) {
    const option = document.createElement("option");
    option.value = valor;
    option.textContent = texto;
    return option;
  }

  function renderizarCompras() {
    popularCategoriasDinamicas();

    const historico = carregarHistoricoCompras();
    const modo = visualizacaoCompras.value;
    const dadosConsolidados = consolidarHistoricoComprasPorItem(historico);
    const dadosFiltrados = aplicarFiltrosMediaCompras(dadosConsolidados);
    const dadosOrdenados = aplicarOrdenacaoMediaCompras(dadosFiltrados);

    atualizarResumoFiltrosMediaCompras();
    atualizarIndicadoresOrdenacao("compras");
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
    popularCategoriasDinamicas();

    const movimentacoes = carregarMovimentacoesEstoque();
    const consumos = movimentacoes.filter(function (mov) {
      return Number(mov.variacao) < 0 && mov.data;
    });

    const modo = visualizacaoConsumo.value;
    const agrupamento = agrupamentoConsumo.value;

    const consumosFiltradosNaOrigem = aplicarFiltrosMovimentacoesConsumo(consumos);
    const dadosConsolidados = consolidarConsumos(consumosFiltradosNaOrigem, agrupamento);
    const dadosOrdenados = aplicarOrdenacaoConsumo(dadosConsolidados);

    atualizarResumoFiltrosConsumo();
    atualizarIndicadoresOrdenacao("consumo");
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
      renderizarConsumoBarras(dadosOrdenados, agrupamento);
      return;
    }

    if (modo === "linha-do-tempo") {
      renderizarConsumoLinhaDoTempo(dadosOrdenados, agrupamento);
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

        if (!nomeItem || !unidadeItem) {
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

    resultadoComprasContainer.innerHTML = `
      <div class="table-responsive">
        <table class="table table-bordered table-hover align-middle mb-0 tabela-consumo">
          <thead class="table-light">
            <tr>
              <th
                scope="col"
                class="sortable-header"
                id="ordenar-coluna-item-media-compras"
                data-sort-key="item"
                role="button"
                tabindex="0"
                aria-label="Ordenar por item"
              >
                Item
                <span class="sort-indicator" aria-hidden="true">↕</span>
              </th>
              <th
                scope="col"
                class="sortable-header"
                id="ordenar-coluna-categoria-media-compras"
                data-sort-key="categoria"
                role="button"
                tabindex="0"
                aria-label="Ordenar por categoria"
              >
                Categoria
                <span class="sort-indicator" aria-hidden="true">↕</span>
              </th>
              <th scope="col">Última compra</th>
              <th
                scope="col"
                class="sortable-header cell-quantidade"
                id="ordenar-coluna-quantidade-media-compras"
                data-sort-key="quantidade"
                role="button"
                tabindex="0"
                aria-label="Ordenar por quantidade de itens"
              >
                Quantidade de itens
                <span class="sort-indicator" aria-hidden="true">↕</span>
              </th>
              <th scope="col">Média por compra</th>
              <th scope="col">Média por item</th>
              <th scope="col">Total acumulado</th>
            </tr>
          </thead>
          <tbody id="media-compras-tabela-body"></tbody>
        </table>
      </div>
    `;

    const body = document.getElementById("media-compras-tabela-body");
    if (!body) {
      return;
    }

    dados.forEach(function (item) {
      body.appendChild(criarLinhaMediaCompras(item));
    });

    reconectarCabecalhosCompras();
    atualizarIndicadoresOrdenacao("compras");
  }

  function criarLinhaMediaCompras(item) {
    let linha = null;

    if (templateLinhaMediaCompras) {
      const fragmento = templateLinhaMediaCompras.content.cloneNode(true);
      linha = fragmento.querySelector("tr");
    } else {
      linha = document.createElement("tr");
      linha.innerHTML = `
        <td class="item-nome"></td>
        <td class="item-categoria"></td>
        <td class="item-data-compra"></td>
        <td class="item-quantidade cell-quantidade"></td>
        <td class="item-media-compra"></td>
        <td class="item-media-item"></td>
        <td class="item-total-acumulado"></td>
      `;
    }

    linha.classList.add("item-row");
    linha.dataset.item = normalizarTexto(item.nome);
    linha.dataset.categoria = normalizarTexto(item.categoria);
    linha.dataset.quantidade = String(Number(item.quantidadeItens) || 0);

    const celulaNome = linha.querySelector(".item-nome");
    const celulaCategoria = linha.querySelector(".item-categoria");
    const celulaData = linha.querySelector(".item-data-compra");
    const celulaQuantidade = linha.querySelector(".item-quantidade");
    const celulaMediaCompra = linha.querySelector(".item-media-compra");
    const celulaMediaItem = linha.querySelector(".item-media-item");
    const celulaTotal = linha.querySelector(".item-total-acumulado");

    if (celulaNome) {
      celulaNome.textContent = item.nome;
    }

    if (celulaCategoria) {
      celulaCategoria.innerHTML = item.categoria
        ? `<span class="badge-categoria">${escaparHtml(item.categoria)}</span>`
        : "—";
    }

    if (celulaData) {
      celulaData.textContent = formatarData(item.ultimaCompra);
    }

    if (celulaQuantidade) {
      celulaQuantidade.textContent = formatarNumero(item.quantidadeItens);
    }

    if (celulaMediaCompra) {
      celulaMediaCompra.textContent = "R$ " + formatarMoeda(item.mediaPorCompra);
    }

    if (celulaMediaItem) {
      celulaMediaItem.textContent = "R$ " + formatarMoeda(item.mediaPorItem);
    }

    if (celulaTotal) {
      celulaTotal.textContent = "R$ " + formatarMoeda(item.totalAcumulado);
    }

    return linha;
  }

  function renderizarComprasLista(dados) {
    destruirGraficoCompras();

    const blocos = dados.map(function (item) {
      return `
        <div class="border rounded p-3 mb-3">
          <div><strong>Item:</strong> ${escaparHtml(item.nome)}</div>
          <div><strong>Categoria:</strong> ${escaparHtml(item.categoria || "Sem categoria")}</div>
          <div><strong>Última compra:</strong> ${escaparHtml(formatarData(item.ultimaCompra))}</div>
          <div><strong>Quantidade de itens:</strong> ${formatarNumero(item.quantidadeItens)}</div>
          <div><strong>Média por compra:</strong> R$ ${formatarMoeda(item.mediaPorCompra)}</div>
          <div><strong>Média por item:</strong> R$ ${formatarMoeda(item.mediaPorItem)}</div>
          <div><strong>Total acumulado:</strong> R$ ${formatarMoeda(item.totalAcumulado)}</div>
        </div>
      `;
    }).join("");

    resultadoComprasContainer.innerHTML = blocos;
  }

  function renderizarComprasBarras(dados) {
    const dadosOrdenados = dados.slice().sort(function (a, b) {
      return compararTexto(a.nome, b.nome);
    });

    const labels = dadosOrdenados.map(function (item) {
      return item.nome;
    });

    const valores = dadosOrdenados.map(function (item) {
      return Number(item.totalAcumulado) || 0;
    });

    resultadoComprasContainer.innerHTML = `
      <div class="p-3 bg-white rounded">
        <canvas id="grafico-compras-barras"></canvas>
      </div>
    `;

    const canvas = document.getElementById("grafico-compras-barras");

    if (!canvas) {
      return;
    }

    destruirGraficoCompras();

    graficoCompras = new Chart(canvas, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Total acumulado por item",
            data: valores
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });

    canvas.parentElement.style.height = "320px";
  }

  function renderizarComprasPizza(dados) {
    const dadosOrdenados = dados.slice().sort(function (a, b) {
      return compararTexto(a.nome, b.nome);
    });

    const labels = dadosOrdenados.map(function (item) {
      return item.nome;
    });

    const valores = dadosOrdenados.map(function (item) {
      return Number(item.totalAcumulado) || 0;
    });

    resultadoComprasContainer.innerHTML = `
      <div class="p-3 bg-white rounded">
        <canvas id="grafico-compras-pizza"></canvas>
      </div>
    `;

    const canvas = document.getElementById("grafico-compras-pizza");

    if (!canvas) {
      return;
    }

    destruirGraficoCompras();

    graficoCompras = new Chart(canvas, {
      type: "pie",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Participação por item",
            data: valores
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });

    canvas.parentElement.style.height = "320px";
  }

  function renderizarComprasLinhaDoTempo(dados) {
    const dadosOrdenados = dados.slice().sort(function (a, b) {
      return new Date(a.ultimaCompra) - new Date(b.ultimaCompra);
    });

    const labels = dadosOrdenados.map(function (item) {
      return formatarData(item.ultimaCompra);
    });

    const valores = dadosOrdenados.map(function (item) {
      return Number(item.totalAcumulado) || 0;
    });

    resultadoComprasContainer.innerHTML = `
      <div class="p-3 bg-white rounded">
        <canvas id="grafico-compras-linha-tempo"></canvas>
      </div>
    `;

    const canvas = document.getElementById("grafico-compras-linha-tempo");

    if (!canvas) {
      return;
    }

    destruirGraficoCompras();

    graficoCompras = new Chart(canvas, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Evolução do total acumulado",
            data: valores,
            fill: false,
            tension: 0.2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });

    canvas.parentElement.style.height = "320px";
  }

  function renderizarConsumoTabela(dados) {
    destruirGraficoConsumo();

    resultadoConsumoContainer.innerHTML = `
      <div class="table-responsive">
        <table class="table table-bordered table-hover align-middle mb-0 tabela-consumo">
          <thead class="table-light">
            <tr>
              <th
                scope="col"
                class="sortable-header"
                id="ordenar-coluna-item-consumo"
                data-sort-key="item"
                role="button"
                tabindex="0"
                aria-label="Ordenar por item"
              >
                Item
                <span class="sort-indicator" aria-hidden="true">↕</span>
              </th>
              <th scope="col">Unidade</th>
              <th
                scope="col"
                class="sortable-header"
                id="ordenar-coluna-categoria-consumo"
                data-sort-key="categoria"
                role="button"
                tabindex="0"
                aria-label="Ordenar por categoria"
              >
                Categoria
                <span class="sort-indicator" aria-hidden="true">↕</span>
              </th>
              <th scope="col">Data inicial</th>
              <th scope="col">Data final</th>
              <th scope="col">Dias no período</th>
              <th
                scope="col"
                class="sortable-header cell-quantidade"
                id="ordenar-coluna-quantidade-consumo"
                data-sort-key="quantidade"
                role="button"
                tabindex="0"
                aria-label="Ordenar por consumo total"
              >
                Consumo total
                <span class="sort-indicator" aria-hidden="true">↕</span>
              </th>
              <th scope="col">Média diária</th>
              <th scope="col">Ocorrências</th>
            </tr>
          </thead>
          <tbody id="consumo-tabela-body"></tbody>
        </table>
      </div>
    `;

    const body = document.getElementById("consumo-tabela-body");
    if (!body) {
      return;
    }

    dados.forEach(function (grupo) {
      body.appendChild(criarLinhaConsumo(grupo));
    });

    reconectarCabecalhosConsumo();
    atualizarIndicadoresOrdenacao("consumo");
  }

  function criarLinhaConsumo(grupo) {
    let linha = null;

    if (templateLinhaConsumo) {
      const fragmento = templateLinhaConsumo.content.cloneNode(true);
      linha = fragmento.querySelector("tr");
    } else {
      linha = document.createElement("tr");
      linha.innerHTML = `
        <td class="item-nome"></td>
        <td class="item-unidade"></td>
        <td class="item-categoria"></td>
        <td class="item-data-inicial"></td>
        <td class="item-data-final"></td>
        <td class="item-dias-periodo"></td>
        <td class="item-quantidade cell-quantidade"></td>
        <td class="item-media-diaria"></td>
        <td class="item-ocorrencias"></td>
      `;
    }

    linha.classList.add("item-row");
    linha.dataset.item = normalizarTexto(grupo.nome);
    linha.dataset.categoria = normalizarTexto(grupo.categoria);
    linha.dataset.quantidade = String(Number(grupo.consumoTotal) || 0);

    const celulaNome = linha.querySelector(".item-nome");
    const celulaUnidade = linha.querySelector(".item-unidade");
    const celulaCategoria = linha.querySelector(".item-categoria");
    const celulaDataInicial = linha.querySelector(".item-data-inicial");
    const celulaDataFinal = linha.querySelector(".item-data-final");
    const celulaDias = linha.querySelector(".item-dias-periodo");
    const celulaQuantidade = linha.querySelector(".item-quantidade");
    const celulaMediaDiaria = linha.querySelector(".item-media-diaria");
    const celulaOcorrencias = linha.querySelector(".item-ocorrencias");

    if (celulaNome) {
      celulaNome.textContent = grupo.nome;
    }

    if (celulaUnidade) {
      celulaUnidade.textContent = grupo.unidade || "—";
    }

    if (celulaCategoria) {
      celulaCategoria.innerHTML = grupo.categoria
        ? `<span class="badge-categoria">${escaparHtml(grupo.categoria)}</span>`
        : "—";
    }

    if (celulaDataInicial) {
      celulaDataInicial.textContent = formatarData(grupo.dataInicial);
    }

    if (celulaDataFinal) {
      celulaDataFinal.textContent = formatarData(grupo.dataFinal);
    }

    if (celulaDias) {
      celulaDias.textContent = formatarNumeroInteiro(grupo.diasNoPeriodo);
    }

    if (celulaQuantidade) {
      celulaQuantidade.textContent = formatarNumero(grupo.consumoTotal);
    }

    if (celulaMediaDiaria) {
      celulaMediaDiaria.textContent = formatarNumero(grupo.mediaDiaria);
    }

    if (celulaOcorrencias) {
      celulaOcorrencias.textContent = formatarNumeroInteiro(grupo.ocorrencias);
    }

    return linha;
  }

  function renderizarConsumoLista(dados, agrupamento) {
    destruirGraficoConsumo();

    const blocos = dados.map(function (grupo) {
      return `
        <div class="border rounded p-3 mb-3">
          <div><strong>${agrupamento === "categoria" ? "Categoria" : "Item"}:</strong> ${escaparHtml(grupo.nome)}</div>
          ${agrupamento === "categoria" ? "" : `<div><strong>Unidade:</strong> ${escaparHtml(grupo.unidade || "—")}</div>`}
          <div><strong>Categoria:</strong> ${escaparHtml(grupo.categoria || "Sem categoria")}</div>
          <div><strong>Período:</strong> ${escaparHtml(formatarData(grupo.dataInicial))} até ${escaparHtml(formatarData(grupo.dataFinal))}</div>
          <div><strong>Dias no período:</strong> ${formatarNumeroInteiro(grupo.diasNoPeriodo)}</div>
          <div><strong>Consumo total:</strong> ${formatarNumero(grupo.consumoTotal)}</div>
          <div><strong>Média diária:</strong> ${formatarNumero(grupo.mediaDiaria)}</div>
          <div><strong>Ocorrências:</strong> ${formatarNumeroInteiro(grupo.ocorrencias)}</div>
        </div>
      `;
    }).join("");

    resultadoConsumoContainer.innerHTML = blocos;
  }

  function renderizarConsumoBarras(dados, agrupamento) {
    const labels = dados.map(function (grupo) {
      return agrupamento === "categoria"
        ? grupo.nome
        : `${grupo.nome}${grupo.unidade ? ` (${grupo.unidade})` : ""}`;
    });

    const valores = dados.map(function (grupo) {
      return Number(grupo.consumoTotal) || 0;
    });

    resultadoConsumoContainer.innerHTML = `
      <div class="p-3 bg-white rounded">
        <canvas id="grafico-consumo-barras"></canvas>
      </div>
    `;

    const canvas = document.getElementById("grafico-consumo-barras");

    if (!canvas) {
      return;
    }

    destruirGraficoConsumo();

    graficoConsumo = new Chart(canvas, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: agrupamento === "categoria" ? "Consumo total por categoria" : "Consumo total por item",
            data: valores
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });

    canvas.parentElement.style.height = "320px";
  }

  function renderizarConsumoLinhaDoTempo(dados, agrupamento) {
    const dadosOrdenados = dados.slice().sort(function (a, b) {
      return new Date(a.dataFinal) - new Date(b.dataFinal);
    });

    const labels = dadosOrdenados.map(function (grupo) {
      return `${formatarData(grupo.dataFinal)} - ${agrupamento === "categoria" ? grupo.nome : grupo.nome}`;
    });

    const valores = dadosOrdenados.map(function (grupo) {
      return Number(grupo.consumoTotal) || 0;
    });

    resultadoConsumoContainer.innerHTML = `
      <div class="p-3 bg-white rounded">
        <canvas id="grafico-consumo-linha-tempo"></canvas>
      </div>
    `;

    const canvas = document.getElementById("grafico-consumo-linha-tempo");

    if (!canvas) {
      return;
    }

    destruirGraficoConsumo();

    graficoConsumo = new Chart(canvas, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: agrupamento === "categoria" ? "Evolução do consumo por categoria" : "Evolução do consumo por item",
            data: valores,
            fill: false,
            tension: 0.2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });

    canvas.parentElement.style.height = "320px";
  }

  function renderizarEstadoVazioCompras(mensagem) {
    resultadoComprasContainer.innerHTML = `
      <div class="table-responsive">
        <table class="table table-bordered table-hover align-middle mb-0 tabela-consumo">
          <thead class="table-light">
            <tr>
              <th scope="col">Item</th>
              <th scope="col">Categoria</th>
              <th scope="col">Última compra</th>
              <th scope="col">Quantidade de itens</th>
              <th scope="col">Média por compra</th>
              <th scope="col">Média por item</th>
              <th scope="col">Total acumulado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="7" class="text-center text-muted empty-state">${escaparHtml(mensagem)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  function renderizarEstadoVazioConsumo(mensagem) {
    resultadoConsumoContainer.innerHTML = `
      <div class="table-responsive">
        <table class="table table-bordered table-hover align-middle mb-0 tabela-consumo">
          <thead class="table-light">
            <tr>
              <th scope="col">Item</th>
              <th scope="col">Unidade</th>
              <th scope="col">Categoria</th>
              <th scope="col">Data inicial</th>
              <th scope="col">Data final</th>
              <th scope="col">Dias no período</th>
              <th scope="col">Consumo total</th>
              <th scope="col">Média diária</th>
              <th scope="col">Ocorrências</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="9" class="text-center text-muted empty-state">${escaparHtml(mensagem)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  function configurarOrdenacaoPorCabecalho(secao, elemento, campo) {
    if (!elemento) {
      return;
    }

    function alternarOrdenacao() {
      const estado = secao === "consumo" ? ordenacaoAtualConsumo : ordenacaoAtualMediaCompras;

      if (estado.campo === campo) {
        estado.direcao = estado.direcao === "asc" ? "desc" : "asc";
      } else {
        estado.campo = campo;
        estado.direcao = "asc";
      }

      sincronizarOrdenacaoComSelect(secao);

      if (secao === "consumo") {
        renderizarConsumo();
      } else {
        renderizarCompras();
      }
    }

    elemento.addEventListener("click", alternarOrdenacao);

    elemento.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        alternarOrdenacao();
      }
    });
  }

  function reconectarCabecalhosConsumo() {
    configurarOrdenacaoPorCabecalho("consumo", document.getElementById("ordenar-coluna-item-consumo"), "item");
    configurarOrdenacaoPorCabecalho("consumo", document.getElementById("ordenar-coluna-categoria-consumo"), "categoria");
    configurarOrdenacaoPorCabecalho("consumo", document.getElementById("ordenar-coluna-quantidade-consumo"), "quantidade");
  }

  function reconectarCabecalhosCompras() {
    configurarOrdenacaoPorCabecalho("compras", document.getElementById("ordenar-coluna-item-media-compras"), "item");
    configurarOrdenacaoPorCabecalho("compras", document.getElementById("ordenar-coluna-categoria-media-compras"), "categoria");
    configurarOrdenacaoPorCabecalho("compras", document.getElementById("ordenar-coluna-quantidade-media-compras"), "quantidade");
  }

  function sincronizarOrdenacaoPeloSelect(secao) {
    const select = secao === "consumo" ? ordenacaoConsumo : ordenacaoMediaCompras;
    const estado = secao === "consumo" ? ordenacaoAtualConsumo : ordenacaoAtualMediaCompras;

    if (!select) {
      return;
    }

    const valor = select.value || "item-asc";
    const partes = valor.split("-");

    estado.campo = partes[0] || "item";
    estado.direcao = partes[1] || "asc";
  }

  function sincronizarOrdenacaoComSelect(secao) {
    const select = secao === "consumo" ? ordenacaoConsumo : ordenacaoMediaCompras;
    const estado = secao === "consumo" ? ordenacaoAtualConsumo : ordenacaoAtualMediaCompras;

    if (!select) {
      return;
    }

    select.value = `${estado.campo}-${estado.direcao}`;
  }

  function atualizarIndicadoresOrdenacao(secao) {
    const estado = secao === "consumo" ? ordenacaoAtualConsumo : ordenacaoAtualMediaCompras;
    const cabecalhos = secao === "consumo"
      ? [
          { elemento: document.getElementById("ordenar-coluna-item-consumo"), campo: "item" },
          { elemento: document.getElementById("ordenar-coluna-categoria-consumo"), campo: "categoria" },
          { elemento: document.getElementById("ordenar-coluna-quantidade-consumo"), campo: "quantidade" }
        ]
      : [
          { elemento: document.getElementById("ordenar-coluna-item-media-compras"), campo: "item" },
          { elemento: document.getElementById("ordenar-coluna-categoria-media-compras"), campo: "categoria" },
          { elemento: document.getElementById("ordenar-coluna-quantidade-media-compras"), campo: "quantidade" }
        ];

    cabecalhos.forEach(function (cabecalho) {
      if (!cabecalho.elemento) {
        return;
      }

      const indicador = cabecalho.elemento.querySelector(".sort-indicator");
      const ativo = estado.campo === cabecalho.campo;

      cabecalho.elemento.setAttribute(
        "aria-sort",
        ativo ? (estado.direcao === "asc" ? "ascending" : "descending") : "none"
      );

      if (indicador) {
        indicador.textContent = !ativo ? "↕" : estado.direcao === "asc" ? "↑" : "↓";
      }
    });
  }

  function atualizarResumoFiltrosConsumo() {
    if (!resumoFiltrosConsumo) {
      return;
    }

    resumoFiltrosConsumo.innerHTML = "";

    if (filtrosConsumo.item) {
      resumoFiltrosConsumo.appendChild(
        criarChipFiltro("Item: " + filtrosConsumo.item, function () {
          filtrosConsumo.item = "";
          if (filtroItemConsumo) {
            filtroItemConsumo.value = "";
          }
          renderizarConsumo();
        })
      );
    }

    if (filtrosConsumo.categoria) {
      resumoFiltrosConsumo.appendChild(
        criarChipFiltro("Categoria: " + filtrosConsumo.categoria, function () {
          filtrosConsumo.categoria = "";
          if (filtroCategoriaConsumo) {
            filtroCategoriaConsumo.value = "";
          }
          renderizarConsumo();
        })
      );
    }
  }

  function atualizarResumoFiltrosMediaCompras() {
    if (!resumoFiltrosMediaCompras) {
      return;
    }

    resumoFiltrosMediaCompras.innerHTML = "";

    if (filtrosMediaCompras.item) {
      resumoFiltrosMediaCompras.appendChild(
        criarChipFiltro("Item: " + filtrosMediaCompras.item, function () {
          filtrosMediaCompras.item = "";
          if (filtroItemMediaCompras) {
            filtroItemMediaCompras.value = "";
          }
          renderizarCompras();
        })
      );
    }

    if (filtrosMediaCompras.categoria) {
      resumoFiltrosMediaCompras.appendChild(
        criarChipFiltro("Categoria: " + filtrosMediaCompras.categoria, function () {
          filtrosMediaCompras.categoria = "";
          if (filtroCategoriaMediaCompras) {
            filtroCategoriaMediaCompras.value = "";
          }
          renderizarCompras();
        })
      );
    }
  }

  function criarChipFiltro(texto, aoRemover) {
    const chip = document.createElement("span");
    chip.className = "filter-chip";

    const textoChip = document.createElement("span");
    textoChip.textContent = texto;

    const botao = document.createElement("button");
    botao.type = "button";
    botao.setAttribute("aria-label", "Remover filtro");
    botao.innerHTML = "&times;";
    botao.addEventListener("click", aoRemover);

    chip.appendChild(textoChip);
    chip.appendChild(botao);

    return chip;
  }

  function atualizarContador(elemento, quantidade, sufixo) {
    if (!elemento) {
      return;
    }

    elemento.textContent = `${quantidade} ${sufixo}`;
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

  function compararTexto(a, b) {
    return String(a || "").localeCompare(String(b || ""), "pt-BR", {
      sensitivity: "base"
    });
  }

  function compararNumero(a, b) {
    return (Number(a) || 0) - (Number(b) || 0);
  }

  function normalizarTexto(valor) {
    return String(valor || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function normalizarNomeCategoria(valor) {
    return String(valor || "").trim().replace(/\s+/g, " ");
  }

  function formatarData(valor) {
    const data = valor instanceof Date ? valor : new Date(valor);

    if (isNaN(data.getTime())) {
      return "-";
    }

    return data.toLocaleDateString("pt-BR");
  }

  function formatarNumero(valor) {
    return Number(valor).toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  function formatarNumeroInteiro(valor) {
    return Number(valor).toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  function formatarMoeda(valor) {
    return Number(valor).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function escaparHtml(valor) {
    return String(valor || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
