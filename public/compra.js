document.addEventListener("DOMContentLoaded", function () {
  const compraForm = document.getElementById("compra-form");
  const compraTabela = document.getElementById("compra-tabela");
  const templateLinhaCompra = document.getElementById("template-linha-compra");
  const campoMensagem = document.getElementById("compra-mensagem");

  const campoItem = document.getElementById("item-compra");
  const campoQuantidade = document.getElementById("quantidade-compra");
  const campoUnidade = document.getElementById("unidade-compra");
  const campoUnidadeOutraWrapper = document.getElementById("unidade-outra-wrapper");
  const campoUnidadeOutra = document.getElementById("unidade-outra-compra");

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
  let ultimoElementoFocado = null;

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
    !campoUnidade ||
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
    configurarMenuMobile();

    campoItem.addEventListener("input", function () {
      atualizarCategoriaPeloNomeDigitado();
      atualizarUnidadePeloNomeDigitado();
      renderizarSugestoesItem(campoItem.value);
    });

    campoItem.addEventListener("blur", function () {
      setTimeout(function () {
        limparSugestoes();
      }, 150);
    });

    campoCategoria.addEventListener("change", alternarCampoCategoriaNova);

    campoUnidade.addEventListener("change", function () {
      alternarCampoOutro(campoUnidade, campoUnidadeOutraWrapper, campoUnidadeOutra);
    });

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
      ? extrairListaResposta(await lerJsonSeguro(resItens))
      : [];

    categoriasGlobais = resCategorias && resCategorias.ok
      ? extrairListaResposta(await lerJsonSeguro(resCategorias))
      : [];

    grupoItens = resGrupoItens && resGrupoItens.ok
      ? extrairListaResposta(await lerJsonSeguro(resGrupoItens))
      : [];
  }

  async function salvarItemFormulario() {
    limparMensagem();

    const nome = String(campoItem.value || "").trim();
    const quantidade = normalizarNumero(campoQuantidade.value);
    const valorUnitario = normalizarNumero(campoValorUnitario.value);
    const unidade = obterUnidadeFormulario();
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

    if (!unidade) {
      exibirMensagem("Informe a unidade.", "warning");
      campoUnidade.focus();
      return;
    }

    if (!categoria) {
      exibirMensagem("Informe a categoria.", "warning");
      campoCategoria.focus();
      return;
    }

    if (!Number.isFinite(valorUnitario) || valorUnitario < 0) {
      exibirMensagem("Informe um valor unitário válido.", "warning");
      campoValorUnitario.focus();
      return;
    }

    const itemGlobal = buscarItemGlobalPorNome(nome);

    const itemCompra = {
      itemId: itemGlobal ? Number(itemGlobal.id) : null,
      nome: nome,
      quantidade: quantidade,
      unidade: unidade,
      categoria: categoria,
      valorUnitario: valorUnitario
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
            unidade: item.unidade,
            valorUnitario: Number(item.valorUnitario),
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
      celula.colSpan = 7;
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
    const subtotal = Number(item.quantidade) * Number(item.valorUnitario);
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

      const celulaUnidade = document.createElement("td");
      celulaUnidade.className = "item-unidade";

      const celulaCategoria = document.createElement("td");
      celulaCategoria.className = "item-categoria";

      const celulaValorUnitario = document.createElement("td");
      celulaValorUnitario.className = "item-valor-unitario";

      const celulaSubtotal = document.createElement("td");
      celulaSubtotal.className = "item-subtotal";

      linha.appendChild(celulaAcoes);
      linha.appendChild(celulaNome);
      linha.appendChild(celulaQuantidade);
      linha.appendChild(celulaUnidade);
      linha.appendChild(celulaCategoria);
      linha.appendChild(celulaValorUnitario);
      linha.appendChild(celulaSubtotal);
    }

    preencherLinhaTabela(linha, item, subtotal, indiceReal);
    return linha;
  }

  function preencherLinhaTabela(linha, item, subtotal, indiceReal) {
    linha.dataset.item = normalizarTexto(item.nome);
    linha.dataset.categoria = normalizarTexto(item.categoria);
    linha.dataset.quantidade = String(Number(item.quantidade) || 0);
    linha.dataset.unidade = normalizarTexto(item.unidade);
    linha.dataset.valorUnitario = String(Number(item.valorUnitario) || 0);
    linha.dataset.subtotal = String(subtotal);

    const celulaNome = linha.querySelector(".item-nome");
    const celulaQuantidade = linha.querySelector(".item-quantidade");
    const celulaUnidade = linha.querySelector(".item-unidade");
    const celulaCategoria = linha.querySelector(".item-categoria");
    const celulaValorUnitario = linha.querySelector(".item-valor-unitario");
    const celulaSubtotal = linha.querySelector(".item-subtotal");

    if (celulaNome) {
      celulaNome.textContent = item.nome;
    }

    if (celulaQuantidade) {
      celulaQuantidade.textContent = formatarNumero(item.quantidade);
    }

    if (celulaUnidade) {
      celulaUnidade.textContent = item.unidade || "—";
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
      celulaValorUnitario.textContent = formatarMoeda(item.valorUnitario);
    }

    if (celulaSubtotal) {
      celulaSubtotal.textContent = formatarMoeda(subtotal);
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
    campoQuantidade.value = formatarValorCampo(item.quantidade);
    campoValorUnitario.value = formatarValorCampo(item.valorUnitario);

    preencherCampoUnidade(item.unidade);
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
        normalizarTexto(item.nome).includes(normalizarTexto(filtrosAtivos.item));

      const correspondeCategoria =
        !filtrosAtivos.categoria ||
        normalizarTexto(item.categoria) === normalizarTexto(filtrosAtivos.categoria);

      return correspondeItem && correspondeCategoria;
    });
  }

  function aplicarOrdenacao(lista) {
    const listaOrdenada = lista.slice();

    listaOrdenada.sort(function (a, b) {
      let comparacao = 0;

      if (estadoOrdenacao.campo === "item") {
        comparacao = compararTexto(a.nome, b.nome);
      } else if (estadoOrdenacao.campo === "quantidade") {
        comparacao = compararNumero(a.quantidade, b.quantidade);
      } else if (estadoOrdenacao.campo === "categoria") {
        comparacao = compararTexto(a.categoria, b.categoria);
      }

      if (comparacao === 0) {
        comparacao = compararTexto(a.nome, b.nome);
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
      return acumulado + Number(item.quantidade) * Number(item.valorUnitario);
    }, 0);

    totalCompraElement.textContent = formatarMoeda(total);
  }

  function atualizarContadorItens(quantidade) {
    if (!contadorItensCompra) {
      return;
    }

    contadorItensCompra.textContent = `${quantidade} item(ns) exibido(s)`;
  }

  function atualizarResumoFiltros() {
    if (!resumoFiltrosCompra) {
      return;
    }

    resumoFiltrosCompra.textContent = "";

    if (filtrosAtivos.item) {
      resumoFiltrosCompra.appendChild(
        criarChipFiltro("Item: " + filtrosAtivos.item, function () {
          filtrosAtivos.item = "";
          if (filtroItemCompra) {
            filtroItemCompra.value = "";
          }
          renderizarTabela();
        })
      );
    }

    if (filtrosAtivos.categoria) {
      resumoFiltrosCompra.appendChild(
        criarChipFiltro("Categoria: " + filtrosAtivos.categoria, function () {
          filtrosAtivos.categoria = "";
          if (filtroCategoriaCompra) {
            filtroCategoriaCompra.value = "";
          }
          renderizarTabela();
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
    botao.textContent = "×";
    botao.addEventListener("click", aoRemover);

    chip.appendChild(textoChip);
    chip.appendChild(botao);
    return chip;
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
      const nome = normalizarNomeCategoria(categoria.nome || categoria);
      if (nome) {
        categoriasSet.add(nome);
      }
    });

    itensGlobais.forEach(function (item) {
      const nomeCategoria = normalizarNomeCategoria(item.categoria?.nome || item.categoria || "");
      if (nomeCategoria) {
        categoriasSet.add(nomeCategoria);
      }
    });

    grupoItens.forEach(function (grupoItem) {
      const nomeCategoria = normalizarNomeCategoria(
        grupoItem.item?.categoria?.nome || grupoItem.categoria || ""
      );
      if (nomeCategoria) {
        categoriasSet.add(nomeCategoria);
      }
    });

    itensCompra.forEach(function (item) {
      const nomeCategoria = normalizarNomeCategoria(item.categoria || "");
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
      return normalizarNomeCategoria(campoNovaCategoria.value);
    }

    return normalizarNomeCategoria(campoCategoria.value);
  }

  function obterUnidadeFormulario() {
    if (campoUnidade.value === "outro(s)") {
      return String(campoUnidadeOutra.value || "").trim();
    }

    return String(campoUnidade.value || "").trim();
  }

  function preencherCampoCategoria(valor) {
    const valorNormalizado = normalizarNomeCategoria(valor);
    const valorExisteNaLista = Array.from(campoCategoria.options).some(function (option) {
      return normalizarTexto(option.value) === normalizarTexto(valorNormalizado);
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

  function preencherCampoUnidade(valor) {
    const valorNormalizado = String(valor || "").trim();
    const valorExisteNaLista = Array.from(campoUnidade.options).some(function (option) {
      return normalizarTexto(option.value) === normalizarTexto(valorNormalizado);
    });

    if (!valorNormalizado) {
      campoUnidade.value = "";
      campoUnidadeOutraWrapper.classList.add("d-none");
      campoUnidadeOutra.required = false;
      campoUnidadeOutra.value = "";
      return;
    }

    if (valorExisteNaLista) {
      campoUnidade.value = valorNormalizado;
      campoUnidadeOutraWrapper.classList.add("d-none");
      campoUnidadeOutra.required = false;
      campoUnidadeOutra.value = "";
      return;
    }

    campoUnidade.value = "outro(s)";
    campoUnidadeOutraWrapper.classList.remove("d-none");
    campoUnidadeOutra.required = true;
    campoUnidadeOutra.value = valorNormalizado;
  }

  function alternarCampoOutro(selectElement, wrapperElement, inputElement) {
    if (selectElement.value === "outro(s)") {
      wrapperElement.classList.remove("d-none");
      inputElement.required = true;
    } else {
      wrapperElement.classList.add("d-none");
      inputElement.required = false;
      inputElement.value = "";
    }
  }

  function limparFormulario() {
    compraForm.reset();

    campoUnidade.value = "unidade(s)";
    campoUnidadeOutraWrapper.classList.add("d-none");
    campoUnidadeOutra.required = false;
    campoUnidadeOutra.value = "";

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

  function atualizarUnidadePeloNomeDigitado() {
    const nome = String(campoItem.value || "").trim();

    if (!nome) {
      return;
    }

    const itemCorrespondente = buscarItemGlobalPorNome(nome);

    if (itemCorrespondente && itemCorrespondente.unidadePadrao) {
      preencherCampoUnidade(itemCorrespondente.unidadePadrao);
    }
  }

  function buscarItemGlobalPorNome(nome) {
    const nomeNormalizado = normalizarTexto(nome);

    if (!nomeNormalizado) {
      return null;
    }

    return itensGlobais.find(function (item) {
      return normalizarTexto(item.nome) === nomeNormalizado;
    }) || null;
  }

  function renderizarSugestoesItem(texto) {
    if (!sugestoesItemContainer) {
      return;
    }

    const termo = normalizarTexto(texto);
    sugestoesItemContainer.textContent = "";

    if (!termo) {
      return;
    }

    const sugestoes = itensGlobais
      .filter(function (item) {
        return normalizarTexto(item.nome).includes(termo);
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
        atualizarUnidadePeloNomeDigitado();
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
        normalizarTexto(itemOriginal.nome) === normalizarTexto(itemOrdenado.nome) &&
        normalizarTexto(itemOriginal.unidade) === normalizarTexto(itemOrdenado.unidade) &&
        normalizarTexto(itemOriginal.categoria) === normalizarTexto(itemOrdenado.categoria) &&
        Number(itemOriginal.quantidade) === Number(itemOrdenado.quantidade) &&
        Number(itemOriginal.valorUnitario) === Number(itemOrdenado.valorUnitario)
      );
    });
  }

  function extrairListaResposta(valor) {
    if (Array.isArray(valor)) {
      return valor;
    }

    if (!valor || typeof valor !== "object") {
      return [];
    }

    const chavesPossiveis = [
      "data",
      "items",
      "resultado",
      "resultados",
      "lista",
      "itens",
      "categorias",
      "grupoItens",
      "grupo_itens"
    ];

    for (const chave of chavesPossiveis) {
      if (Array.isArray(valor[chave])) {
        return valor[chave];
      }
    }

    return [];
  }

  function normalizarNumero(valor) {
    const texto = String(valor || "")
      .trim()
      .replace(/\s+/g, "")
      .replace(/\./g, "")
      .replace(",", ".");

    return parseFloat(texto);
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

  function compararTexto(a, b) {
    return String(a || "").localeCompare(String(b || ""), "pt-BR", {
      sensitivity: "base"
    });
  }

  function compararNumero(a, b) {
    return Number(a || 0) - Number(b || 0);
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

  function formatarValorCampo(valor) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
      return "";
    }

    return numero.toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  function exibirMensagem(mensagem, tipo) {
    campoMensagem.textContent = mensagem;
    campoMensagem.className = `small text-${tipo}`;
    campoMensagem.setAttribute("role", tipo === "danger" || tipo === "warning" ? "alert" : "status");
  }

  function limparMensagem() {
    campoMensagem.textContent = "";
    campoMensagem.className = "small";
    campoMensagem.setAttribute("role", "status");
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
    campoUnidade.disabled = salvando;
    campoUnidadeOutra.disabled = salvando;
    campoCategoria.disabled = salvando;
    campoNovaCategoria.disabled = salvando;
    campoValorUnitario.disabled = salvando;
  }

  async function lerJsonSeguro(resposta) {
    try {
      return await resposta.json();
    } catch {
      return {};
    }
  }
});
