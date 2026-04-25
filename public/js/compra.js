import { apiGet, apiPost, apiPatch, apiDelete, readJsonSafe as lerJsonSeguro } from "./api.js";
import { ensureAcceptedSession } from "./auth.js";
import { setupMobileMenu } from "./dom.js";
import { compareText, compareNumber, normalizeText, normalizeCategoryName, normalizeNumber, normalizeMoneyToCents, centsToMoneyNumber, decimalStringToCents, formatNumber, formatCurrency, formatDate, formatFieldValueFromCents } from "./formatters.js";
import { setFeedbackMessage, clearFeedbackMessage } from "./messages.js";
import { ensureArray, extractListFromResponse, renderFilterSummary, updateCountLabel } from "./filters.js";

document.addEventListener("DOMContentLoaded", function () {
  const compraForm = document.getElementById("compra-form");
  const compraTabela = document.getElementById("compra-tabela");
  const templateLinhaCompra = document.getElementById("template-linha-compra");
  const campoMensagem = document.getElementById("compra-mensagem");

  const campoItem = document.getElementById("item-compra");
  const campoQuantidade = document.getElementById("quantidade-compra");

  const campoCategoria = document.getElementById("categoria-compra");
  const campoNovaCategoriaWrapper = document.getElementById("nova-categoria-wrapper");
  const campoNovaCategoria = document.getElementById("nova-categoria-compra");

  const campoValorUnitario = document.getElementById("valor-unitario-compra");

  const btnSalvarItem = document.getElementById("btn-salvar-item-compra");
  const btnLimparFormulario = document.getElementById("btn-limpar-item-compra");
  const btnFinalizarCompra = document.getElementById("btn-finalizar-compra");
  const btnLimparFiltros = document.getElementById("btn-limpar-filtros-compra");

  const filtroItemCompra = document.getElementById("filtro-item-compra");
  const filtroCategoriaCompra = document.getElementById("filtro-categoria-compra");
  const ordenacaoCompra = document.getElementById("ordenacao-compra");
  const resumoFiltrosCompra = document.getElementById("resumo-filtros-compra");
  const contadorItensCompra = document.getElementById("contador-itens-compra");
  const totalCompraElement = document.getElementById("total-compra");

  const ordenarColunaItem = document.getElementById("ordenar-coluna-item-compra");
  const ordenarColunaQuantidade = document.getElementById("ordenar-coluna-quantidade-compra");
  const ordenarColunaCategoria = document.getElementById("ordenar-coluna-categoria-compra");

  const modalElement = document.getElementById("modalAdicionarCompra");
  const modalBootstrap =
    modalElement && window.bootstrap && window.bootstrap.Modal
      ? window.bootstrap.Modal.getOrCreateInstance(modalElement)
      : null;

  const sugestoesItemContainer = document.getElementById("sugestoes-item-compra");

  const menu = document.getElementById("menu-lateral-compra");
  const menuContent = document.getElementById("menu-lateral-conteudo-compra");
  const btnAbrirMenu = document.getElementById("btn-menu-mobile");
  const btnFecharMenu = document.getElementById("btn-fechar-menu-mobile");
  const backdrop = document.getElementById("menu-mobile-backdrop");

  let itensCompra = [];
  let itensGlobais = [];
  let categoriasGlobais = [];
  let grupoItens = [];
  let indiceEdicao = null;

  const filtrosAtivos = {
    item: "",
    categoria: ""
  };

  const estadoOrdenacao = {
    campo: "item",
    direcao: "asc"
  };

  if (
    !compraTabela ||
    !compraForm ||
    !campoItem ||
    !campoQuantidade ||
    !campoCategoria ||
    !campoValorUnitario ||
    !campoMensagem
  ) {
    console.error("Estrutura principal da página de compra não encontrada.");
    return;
  }

  sincronizarOrdenacaoComSelect();
  configurarEventos();
  inicializar();

  async function inicializar() {
    try {
      await verificarSessao();
      await carregarDadosIniciais();
      popularCategoriasDinamicas();
      renderizarTabela();
      limparFormulario();
    } catch (error) {
      console.error("Erro ao inicializar compra.js:", error);
      exibirMensagem("Não foi possível carregar a página de compra.", "danger");
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

    campoItem.addEventListener("input", function () {
      atualizarCategoriaPeloNomeDigitado();
      renderizarSugestoesItem(campoItem.value);
    });

    campoItem.addEventListener("blur", function () {
      setTimeout(function () {
        limparSugestoes();
      }, 150);
    });

    campoCategoria.addEventListener("change", alternarCampoCategoriaNova);

    compraForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      await salvarItemFormulario();
    });

    if (btnLimparFormulario) {
      btnLimparFormulario.addEventListener("click", function () {
        limparFormulario();
        limparMensagem();
        campoItem.focus();
      });
    }

    if (btnFinalizarCompra) {
      btnFinalizarCompra.addEventListener("click", async function () {
        await finalizarCompra();
      });
    }

    if (btnLimparFiltros) {
      btnLimparFiltros.addEventListener("click", function () {
        filtrosAtivos.item = "";
        filtrosAtivos.categoria = "";

        if (filtroItemCompra) {
          filtroItemCompra.value = "";
        }

        if (filtroCategoriaCompra) {
          filtroCategoriaCompra.value = "";
        }

        renderizarTabela();
      });
    }

    if (filtroItemCompra) {
      filtroItemCompra.addEventListener("input", function () {
        filtrosAtivos.item = filtroItemCompra.value.trim();
        renderizarTabela();
      });
    }

    if (filtroCategoriaCompra) {
      filtroCategoriaCompra.addEventListener("change", function () {
        filtrosAtivos.categoria = filtroCategoriaCompra.value;
        renderizarTabela();
      });
    }

    if (ordenacaoCompra) {
      ordenacaoCompra.addEventListener("change", function () {
        sincronizarOrdenacaoPeloSelect();
        renderizarTabela();
      });
    }

    configurarOrdenacaoPorCabecalho(ordenarColunaItem, "item");
    configurarOrdenacaoPorCabecalho(ordenarColunaQuantidade, "quantidade");
    configurarOrdenacaoPorCabecalho(ordenarColunaCategoria, "categoria");

    if (modalElement) {
      modalElement.addEventListener("hidden.bs.modal", function () {
        limparFormulario();
        limparMensagem();
      });
    }
  }

  async function verificarSessao() {
    await ensureAcceptedSession();
  }

  async function carregarDadosIniciais() {
    const [resItens, resCategorias, resGrupoItens] = await Promise.all([
      fetch("/itens", {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" }
      }).catch(function () { return null; }),
      fetch("/categorias", {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" }
      }).catch(function () { return null; }),
      fetch("/grupo-itens", {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" }
      }).catch(function () { return null; })
    ]);

    itensGlobais = resItens && resItens.ok
      ? extractListFromResponse(await lerJsonSeguro(resItens))
      : [];

    categoriasGlobais = resCategorias && resCategorias.ok
      ? extractListFromResponse(await lerJsonSeguro(resCategorias))
      : [];

    grupoItens = resGrupoItens && resGrupoItens.ok
      ? extractListFromResponse(await lerJsonSeguro(resGrupoItens))
      : [];
  }

  async function salvarItemFormulario() {
    limparMensagem();

    const nome = String(campoItem.value || "").trim();
    const quantidade = normalizeNumber(campoQuantidade.value);
    const valorUnitarioCentavos = normalizeMoneyToCents(campoValorUnitario.value);
    const categoria = obterCategoriaFormulario();

    if (!nome) {
      exibirMensagem("Informe o item.", "warning");
      campoItem.focus();
      return;
    }

    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      exibirMensagem("Informe uma quantidade válida.", "warning");
      campoQuantidade.focus();
      return;
    }

    if (!categoria) {
      exibirMensagem("Informe a categoria.", "warning");
      campoCategoria.focus();
      return;
    }

    if (!Number.isInteger(valorUnitarioCentavos) || valorUnitarioCentavos < 0) {
      exibirMensagem("Informe um valor unitário válido.", "warning");
      campoValorUnitario.focus();
      return;
    }

    const itemGlobal = buscarItemGlobalPorNome(nome);

    const itemCompra = {
      itemId: itemGlobal ? Number(itemGlobal.id) : null,
      nome: nome,
      quantidade: quantidade,
      categoria: categoria,
      valorUnitarioCentavos: valorUnitarioCentavos
    };

    try {
      definirEstadoSalvamento(true);

      if (indiceEdicao === null) {
        itensCompra.push(itemCompra);
        exibirMensagem("Item adicionado à compra.", "success");
      } else {
        itensCompra[indiceEdicao] = itemCompra;
        exibirMensagem("Item da compra atualizado.", "success");
      }

      indiceEdicao = null;
      limparFormulario();
      popularCategoriasDinamicas();
      renderizarTabela();

      if (modalBootstrap) {
        setTimeout(function () {
          modalBootstrap.hide();
        }, 250);
      }
    } finally {
      definirEstadoSalvamento(false);
    }
  }

  async function finalizarCompra() {
    limparMensagem();

    if (!Array.isArray(itensCompra) || itensCompra.length === 0) {
      exibirMensagem("Adicione ao menos um item antes de finalizar a compra.", "warning");
      return;
    }

    try {
      definirEstadoFinalizacao(true);

      const payload = {
        itens: itensCompra.map(function (item) {
          return {
            itemId: item.itemId || null,
            nome: item.nome,
            quantidade: Number(item.quantidade),
            valorUnitarioCentavos: Number(item.valorUnitarioCentavos),
            categoria: item.categoria
          };
        })
      };

      const resposta = await fetch("/compras", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      const dados = await lerJsonSeguro(resposta);

      if (!resposta.ok) {
        exibirMensagem(dados.erro || "Não foi possível finalizar a compra.", "danger");
        return;
      }

      itensCompra = [];
      indiceEdicao = null;
      limparFormulario();
      renderizarTabela();
      exibirMensagem("Compra finalizada com sucesso.", "success");

      await carregarDadosIniciais();
      popularCategoriasDinamicas();
    } catch (error) {
      console.error("Erro ao finalizar compra:", error);
      exibirMensagem("Erro de conexão ao finalizar a compra.", "danger");
    } finally {
      definirEstadoFinalizacao(false);
    }
  }

  function renderizarTabela() {
    compraTabela.textContent = "";

    const itensFiltrados = aplicarFiltros(itensCompra);
    const itensOrdenados = aplicarOrdenacao(itensFiltrados);

    atualizarResumoFiltros();
    atualizarIndicadoresOrdenacao();
    atualizarContadorItens(itensOrdenados.length);

    if (itensOrdenados.length === 0) {
      const linhaVazia = document.createElement("tr");
      linhaVazia.id = "compra-estado-vazio";

      const celula = document.createElement("td");
      celula.colSpan = 6;
      celula.className = "text-center text-muted empty-state";
      celula.textContent = itensCompra.length > 0
        ? "Nenhum item corresponde aos filtros aplicados."
        : "Nenhuma compra montada até o momento.";

      linhaVazia.appendChild(celula);
      compraTabela.appendChild(linhaVazia);

      atualizarTotalCompra();
      return;
    }

    itensOrdenados.forEach(function (item) {
      compraTabela.appendChild(criarLinhaTabela(item));
    });

    atualizarTotalCompra();
  }

  function criarLinhaTabela(item) {
    const subtotal = Math.round(Number(item.quantidade) * Number(item.valorUnitarioCentavos || 0));
    const indiceReal = encontrarIndiceRealDoItem(item);
    let linha;

    if (templateLinhaCompra) {
      const fragmento = templateLinhaCompra.content.cloneNode(true);
      linha = fragmento.querySelector("tr");
    } else {
      linha = document.createElement("tr");

      const celulaAcoes = document.createElement("td");
      celulaAcoes.className = "cell-acoes";
      const containerAcoes = document.createElement("div");
      containerAcoes.className = "d-flex gap-2 flex-wrap";

      const btnEditar = document.createElement("button");
      btnEditar.type = "button";
      btnEditar.className = "btn btn-outline-primary btn-sm btn-editar-compra";
      btnEditar.textContent = "Editar";

      const btnExcluir = document.createElement("button");
      btnExcluir.type = "button";
      btnExcluir.className = "btn btn-outline-danger btn-sm btn-excluir-compra";
      btnExcluir.textContent = "Excluir";

      containerAcoes.appendChild(btnEditar);
      containerAcoes.appendChild(btnExcluir);
      celulaAcoes.appendChild(containerAcoes);

      const celulaNome = document.createElement("td");
      celulaNome.className = "item-nome";

      const celulaQuantidade = document.createElement("td");
      celulaQuantidade.className = "item-quantidade cell-quantidade";

      const celulaCategoria = document.createElement("td");
      celulaCategoria.className = "item-categoria";

      const celulaValorUnitario = document.createElement("td");
      celulaValorUnitario.className = "item-valor-unitario";

      const celulaSubtotal = document.createElement("td");
      celulaSubtotal.className = "item-subtotal";

      linha.appendChild(celulaAcoes);
      linha.appendChild(celulaNome);
      linha.appendChild(celulaQuantidade);
      linha.appendChild(celulaCategoria);
      linha.appendChild(celulaValorUnitario);
      linha.appendChild(celulaSubtotal);
    }

    preencherLinhaTabela(linha, item, subtotal, indiceReal);
    return linha;
  }

  function preencherLinhaTabela(linha, item, subtotal, indiceReal) {
    linha.dataset.item = normalizeText(item.nome);
    linha.dataset.categoria = normalizeText(item.categoria);
    linha.dataset.quantidade = String(Number(item.quantidade) || 0);
    linha.dataset.valorUnitarioCentavos = String(Number(item.valorUnitarioCentavos) || 0);
    linha.dataset.subtotal = String(subtotal);

    const celulaNome = linha.querySelector(".item-nome");
    const celulaQuantidade = linha.querySelector(".item-quantidade");
    const celulaCategoria = linha.querySelector(".item-categoria");
    const celulaValorUnitario = linha.querySelector(".item-valor-unitario");
    const celulaSubtotal = linha.querySelector(".item-subtotal");

    if (celulaNome) {
      celulaNome.textContent = item.nome;
    }

    if (celulaQuantidade) {
      celulaQuantidade.textContent = formatNumber(item.quantidade);
    }

    if (celulaCategoria) {
      celulaCategoria.textContent = "";

      if (item.categoria) {
        const badge = document.createElement("span");
        badge.className = "badge-categoria";
        badge.textContent = item.categoria;
        celulaCategoria.appendChild(badge);
      } else {
        celulaCategoria.textContent = "—";
      }
    }

    if (celulaValorUnitario) {
      celulaValorUnitario.textContent = formatCurrency(item.valorUnitarioCentavos);
    }

    if (celulaSubtotal) {
      celulaSubtotal.textContent = formatCurrency(subtotal);
    }

    const btnEditar = linha.querySelector(".btn-editar-compra");
    const btnExcluir = linha.querySelector(".btn-excluir-compra");

    if (btnEditar) {
      btnEditar.addEventListener("click", function () {
        editarItem(indiceReal);
      });
    }

    if (btnExcluir) {
      btnExcluir.addEventListener("click", function () {
        excluirItem(indiceReal);
      });
    }
  }

  function editarItem(indice) {
    if (indice < 0 || !itensCompra[indice]) {
      return;
    }

    const item = itensCompra[indice];
    indiceEdicao = indice;

    campoItem.value = item.nome;
    campoQuantidade.value = formatFieldValue(item.quantidade);
    campoValorUnitario.value = formatFieldValueFromCents(item.valorUnitarioCentavos);

    preencherCampoCategoria(item.categoria);

    if (modalBootstrap) {
      modalBootstrap.show();
    }
  }

  function excluirItem(indice) {
    if (indice < 0 || !itensCompra[indice]) {
      return;
    }

    itensCompra.splice(indice, 1);
    indiceEdicao = null;
    renderizarTabela();
    exibirMensagem("Item removido da compra.", "success");
  }

  function aplicarFiltros(lista) {
    return lista.filter(function (item) {
      const correspondeItem =
        !filtrosAtivos.item ||
        normalizeText(item.nome).includes(normalizeText(filtrosAtivos.item));

      const correspondeCategoria =
        !filtrosAtivos.categoria ||
        normalizeText(item.categoria) === normalizeText(filtrosAtivos.categoria);

      return correspondeItem && correspondeCategoria;
    });
  }

  function aplicarOrdenacao(lista) {
    const listaOrdenada = lista.slice();

    listaOrdenada.sort(function (a, b) {
      let comparacao = 0;

      if (estadoOrdenacao.campo === "item") {
        comparacao = compareText(a.nome, b.nome);
      } else if (estadoOrdenacao.campo === "quantidade") {
        comparacao = compareNumber(a.quantidade, b.quantidade);
      } else if (estadoOrdenacao.campo === "categoria") {
        comparacao = compareText(a.categoria, b.categoria);
      }

      if (comparacao === 0) {
        comparacao = compareText(a.nome, b.nome);
      }

      return estadoOrdenacao.direcao === "desc" ? comparacao * -1 : comparacao;
    });

    return listaOrdenada;
  }

  function atualizarTotalCompra() {
    if (!totalCompraElement) {
      return;
    }

    const total = itensCompra.reduce(function (acumulado, item) {
      return acumulado + Math.round(Number(item.quantidade) * Number(item.valorUnitarioCentavos || 0));
    }, 0);

    totalCompraElement.textContent = formatCurrency(total);
  }

  function atualizarContadorItens(quantidade) {
    updateCountLabel(contadorItensCompra, quantidade, "item(ns) exibido(s)");
  }

  function atualizarResumoFiltros() {
    renderFilterSummary(resumoFiltrosCompra, [
      {
        label: "Item",
        value: filtrosAtivos.item,
        onRemove: function () {
          filtrosAtivos.item = "";
          if (filtroItemCompra) {
            filtroItemCompra.value = "";
          }
          renderizarTabela();
        }
      },
      {
        label: "Categoria",
        value: filtrosAtivos.categoria,
        onRemove: function () {
          filtrosAtivos.categoria = "";
          if (filtroCategoriaCompra) {
            filtroCategoriaCompra.value = "";
          }
          renderizarTabela();
        }
      }
    ]);
  }

  function sincronizarOrdenacaoPeloSelect() {
    if (!ordenacaoCompra || !ordenacaoCompra.value) {
      return;
    }

    const partes = ordenacaoCompra.value.split("-");
    estadoOrdenacao.campo = partes[0] || "item";
    estadoOrdenacao.direcao = partes[1] || "asc";
  }

  function sincronizarOrdenacaoComSelect() {
    if (!ordenacaoCompra) {
      return;
    }

    ordenacaoCompra.value = `${estadoOrdenacao.campo}-${estadoOrdenacao.direcao}`;
  }

  function configurarOrdenacaoPorCabecalho(elemento, campo) {
    if (!elemento || elemento.dataset.sortBound === "true") {
      return;
    }

    elemento.dataset.sortBound = "true";

    function alternarOrdenacao() {
      if (estadoOrdenacao.campo === campo) {
        estadoOrdenacao.direcao = estadoOrdenacao.direcao === "asc" ? "desc" : "asc";
      } else {
        estadoOrdenacao.campo = campo;
        estadoOrdenacao.direcao = "asc";
      }

      sincronizarOrdenacaoComSelect();
      renderizarTabela();
    }

    elemento.addEventListener("click", alternarOrdenacao);

    elemento.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        alternarOrdenacao();
      }
    });
  }

  function atualizarIndicadoresOrdenacao() {
    const cabecalhos = [
      { elemento: ordenarColunaItem, campo: "item" },
      { elemento: ordenarColunaQuantidade, campo: "quantidade" },
      { elemento: ordenarColunaCategoria, campo: "categoria" }
    ];

    cabecalhos.forEach(function (cabecalho) {
      if (!cabecalho.elemento) {
        return;
      }

      const indicador = cabecalho.elemento.querySelector(".sort-indicator");
      const ativo = estadoOrdenacao.campo === cabecalho.campo;

      cabecalho.elemento.setAttribute(
        "aria-sort",
        ativo
          ? estadoOrdenacao.direcao === "asc"
            ? "ascending"
            : "descending"
          : "none"
      );

      if (indicador) {
        indicador.textContent = !ativo ? "↕" : estadoOrdenacao.direcao === "asc" ? "↑" : "↓";
      }
    });
  }

  function popularCategoriasDinamicas() {
    const categorias = obterCategoriasDinamicas();
    preencherSelectCategorias(campoCategoria, categorias, true);
    preencherSelectCategorias(filtroCategoriaCompra, categorias, false);
  }

  function obterCategoriasDinamicas() {
    const categoriasSet = new Set();

    categoriasGlobais.forEach(function (categoria) {
      const nome = normalizeCategoryName(categoria.nome || categoria);
      if (nome) {
        categoriasSet.add(nome);
      }
    });

    itensGlobais.forEach(function (item) {
      const nomeCategoria = normalizeCategoryName(item.categoria?.nome || item.categoria || "");
      if (nomeCategoria) {
        categoriasSet.add(nomeCategoria);
      }
    });

    grupoItens.forEach(function (grupoItem) {
      const nomeCategoria = normalizeCategoryName(
        grupoItem.item?.categoria?.nome || grupoItem.categoria || ""
      );
      if (nomeCategoria) {
        categoriasSet.add(nomeCategoria);
      }
    });

    itensCompra.forEach(function (item) {
      const nomeCategoria = normalizeCategoryName(item.categoria || "");
      if (nomeCategoria) {
        categoriasSet.add(nomeCategoria);
      }
    });

    return Array.from(categoriasSet).sort(function (a, b) {
      return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
    });
  }

  function preencherSelectCategorias(selectElement, categorias, incluirOpcaoNova) {
    if (!selectElement) {
      return;
    }

    const valorAtual = selectElement.value;
    selectElement.textContent = "";

    if (selectElement === filtroCategoriaCompra) {
      selectElement.appendChild(criarOption("", "Todas as categorias"));
    } else {
      selectElement.appendChild(criarOption("", "Selecione a categoria"));
    }

    categorias.forEach(function (categoria) {
      selectElement.appendChild(criarOption(categoria, categoria));
    });

    if (incluirOpcaoNova) {
      selectElement.appendChild(criarOption("__nova__", "Outra categoria"));
    }

    const valorExiste = Array.from(selectElement.options).some(function (option) {
      return option.value === valorAtual;
    });

    selectElement.value = valorExiste ? valorAtual : "";
    alternarCampoCategoriaNova();
  }

  function criarOption(valor, texto) {
    const option = document.createElement("option");
    option.value = valor;
    option.textContent = texto;
    return option;
  }

  function alternarCampoCategoriaNova() {
    if (campoCategoria.value === "__nova__") {
      campoNovaCategoriaWrapper.classList.remove("d-none");
      campoNovaCategoria.required = true;
    } else {
      campoNovaCategoriaWrapper.classList.add("d-none");
      campoNovaCategoria.required = false;
      campoNovaCategoria.value = "";
    }
  }

  function obterCategoriaFormulario() {
    if (campoCategoria.value === "__nova__") {
      return normalizeCategoryName(campoNovaCategoria.value);
    }

    return normalizeCategoryName(campoCategoria.value);
  }

  function preencherCampoCategoria(valor) {
    const valorNormalizado = normalizeCategoryName(valor);
    const valorExisteNaLista = Array.from(campoCategoria.options).some(function (option) {
      return normalizeText(option.value) === normalizeText(valorNormalizado);
    });

    if (!valorNormalizado) {
      campoCategoria.value = "";
      alternarCampoCategoriaNova();
      return;
    }

    if (valorExisteNaLista) {
      campoCategoria.value = valorNormalizado;
      alternarCampoCategoriaNova();
      campoNovaCategoria.value = "";
      return;
    }

    campoCategoria.value = "__nova__";
    alternarCampoCategoriaNova();
    campoNovaCategoria.value = valorNormalizado;
  }

  function limparFormulario() {
    compraForm.reset();

    campoCategoria.value = "";
    campoNovaCategoriaWrapper.classList.add("d-none");
    campoNovaCategoria.required = false;
    campoNovaCategoria.value = "";

    indiceEdicao = null;
    limparSugestoes();
  }

  function atualizarCategoriaPeloNomeDigitado() {
    const nome = String(campoItem.value || "").trim();

    if (!nome) {
      if (indiceEdicao === null) {
        preencherCampoCategoria("");
      }
      return;
    }

    const itemCorrespondente = buscarItemGlobalPorNome(nome);

    if (itemCorrespondente && itemCorrespondente.categoria) {
      preencherCampoCategoria(itemCorrespondente.categoria.nome || itemCorrespondente.categoria);
    }
  }

  function buscarItemGlobalPorNome(nome) {
    const nomeNormalizado = normalizeText(nome);

    if (!nomeNormalizado) {
      return null;
    }

    return itensGlobais.find(function (item) {
      return normalizeText(item.nome) === nomeNormalizado;
    }) || null;
  }

  function renderizarSugestoesItem(texto) {
    if (!sugestoesItemContainer) {
      return;
    }

    const termo = normalizeText(texto);
    sugestoesItemContainer.textContent = "";

    if (!termo) {
      return;
    }

    const sugestoes = itensGlobais
      .filter(function (item) {
        return normalizeText(item.nome).includes(termo);
      })
      .slice(0, 8);

    sugestoes.forEach(function (item) {
      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = "list-group-item list-group-item-action";
      botao.textContent = item.nome;
      botao.addEventListener("click", function () {
        campoItem.value = item.nome;
        atualizarCategoriaPeloNomeDigitado();
          limparSugestoes();
      });
      sugestoesItemContainer.appendChild(botao);
    });
  }

  function limparSugestoes() {
    if (sugestoesItemContainer) {
      sugestoesItemContainer.textContent = "";
    }
  }

  function encontrarIndiceRealDoItem(itemOrdenado) {
    return itensCompra.findIndex(function (itemOriginal) {
      return (
        Number(itemOriginal.itemId || 0) === Number(itemOrdenado.itemId || 0) &&
        normalizeText(itemOriginal.nome) === normalizeText(itemOrdenado.nome) &&
        normalizeText(itemOriginal.categoria) === normalizeText(itemOrdenado.categoria) &&
        Number(itemOriginal.quantidade) === Number(itemOrdenado.quantidade) &&
        Number(itemOriginal.valorUnitarioCentavos) === Number(itemOrdenado.valorUnitarioCentavos)
      );
    });
  }


  function normalizarItemCompra(valor) {
    const valorUnitarioCentavos = Number.isInteger(Number(valor?.valorUnitarioCentavos))
      ? Number(valor.valorUnitarioCentavos)
      : decimalStringToCents(valor?.valorUnitario);

    return {
      ...valor,
      valorUnitarioCentavos: Number.isInteger(valorUnitarioCentavos) ? valorUnitarioCentavos : 0
    };
  }

  function exibirMensagem(mensagem, tipo) {
    setFeedbackMessage(campoMensagem, mensagem, tipo);
  }

  function limparMensagem() {
    clearFeedbackMessage(campoMensagem);
  }

  function definirEstadoFinalizacao(finalizando) {
    if (!btnFinalizarCompra) {
      return;
    }

    btnFinalizarCompra.disabled = finalizando;
    btnFinalizarCompra.textContent = finalizando ? "Finalizando..." : "Finalizar compra";
  }

  function definirEstadoSalvamento(salvando) {
    if (btnSalvarItem) {
      btnSalvarItem.disabled = salvando;
      btnSalvarItem.textContent = salvando ? "Salvando..." : "Salvar compra";
    }

    campoItem.disabled = salvando;
    campoQuantidade.disabled = salvando;
    campoCategoria.disabled = salvando;
    campoNovaCategoria.disabled = salvando;
    campoValorUnitario.disabled = salvando;
  }

});
