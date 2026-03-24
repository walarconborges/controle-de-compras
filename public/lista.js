document.addEventListener("DOMContentLoaded", function () {
  const listaForm = document.getElementById("lista-form");
  const listaTabela = document.getElementById("lista-tabela");
  const templateLinhaLista = document.getElementById("template-linha-lista");
  const contadorItensLista = document.getElementById("contador-itens-lista");

  const campoNome = document.getElementById("lista-item-nome");
  const campoUnidade = document.getElementById("lista-item-unidade");
  const campoUnidadeOutraWrapper = document.getElementById("campo-lista-unidade-outra-wrapper");
  const campoUnidadeOutra = document.getElementById("campo-lista-unidade-outra");

  const campoCategoria = document.getElementById("lista-item-categoria");
  const campoCategoriaOutraWrapper = document.getElementById("campo-lista-categoria-outra-wrapper");
  const campoCategoriaOutra = document.getElementById("campo-lista-categoria-outra");

  const campoMensagem = document.getElementById("lista-mensagem");
  const modalElement = document.getElementById("modalAdicionarItemLista");
  const btnSalvar = document.getElementById("btn-salvar-item-lista");
  const btnLimpar = document.getElementById("btn-limpar-item-lista");

  const filtroItemLista = document.getElementById("filtro-item-lista");
  const filtroCategoriaLista = document.getElementById("filtro-categoria-lista");
  const ordenacaoLista = document.getElementById("ordenacao-lista");
  const resumoFiltrosLista = document.getElementById("resumo-filtros-lista");
  const btnLimparFiltrosLista = document.getElementById("btn-limpar-filtros-lista");

  const ordenarColunaComprar = document.getElementById("ordenar-coluna-comprar-lista");
  const ordenarColunaItem = document.getElementById("ordenar-coluna-item-lista");
  const ordenarColunaQuantidade = document.getElementById("ordenar-coluna-quantidade-lista");
  const ordenarColunaCategoria = document.getElementById("ordenar-coluna-categoria-lista");

  const sugestoesItemContainer = document.getElementById("sugestoes-item-lista");

  const menu = document.getElementById("menu-lateral-lista");
  const menuContent = document.getElementById("menu-lateral-conteudo-lista");
  const btnAbrirMenu = document.getElementById("btn-menu-mobile");
  const btnFecharMenu = document.getElementById("btn-fechar-menu-mobile");
  const backdrop = document.getElementById("menu-mobile-backdrop");

  const modalBootstrap =
    modalElement && window.bootstrap && window.bootstrap.Modal
      ? window.bootstrap.Modal.getOrCreateInstance(modalElement)
      : null;

  let itensLista = [];
  let itensGlobais = [];
  let categoriasGlobais = [];
  let ultimoElementoFocado = null;

  const filtrosAtivos = {
    item: "",
    categoria: ""
  };

  const estadoOrdenacao = {
    campo: "comprar",
    direcao: "desc"
  };

  if (!listaTabela) {
    return;
  }

  sincronizarOrdenacaoComSelect();
  configurarEventos();
  inicializar();

  async function inicializar() {
    try {
      await verificarSessao();
      await carregarDados();
      popularCategoriasDinamicas();
      renderizarTabela();
      limparFormulario();
    } catch (error) {
      console.error("Erro ao inicializar lista.js:", error);
      exibirMensagem("Não foi possível carregar a página de lista.", "danger");
    }
  }

  function configurarEventos() {
    configurarMenuMobile();

    if (campoUnidade) {
      campoUnidade.addEventListener("change", function () {
        alternarCampoOutro(campoUnidade, campoUnidadeOutraWrapper, campoUnidadeOutra);
      });
    }

    if (campoCategoria) {
      campoCategoria.addEventListener("change", function () {
        alternarCampoCategoriaNova();
      });
    }

    if (campoNome) {
      campoNome.addEventListener("input", function () {
        atualizarCategoriaPeloNomeDigitado();
        atualizarUnidadePeloNomeDigitado();
        renderizarSugestoesItem(campoNome.value);
      });

      campoNome.addEventListener("blur", function () {
        setTimeout(function () {
          limparSugestoes();
        }, 150);
      });
    }

    if (modalElement) {
      modalElement.addEventListener("hidden.bs.modal", function () {
        limparFormulario();
        limparMensagem();
      });
    }

    if (listaForm) {
      listaForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        await salvarItemNaLista();
      });
    }

    if (btnLimpar) {
      btnLimpar.addEventListener("click", function () {
        limparFormulario();
        limparMensagem();
        if (campoNome) {
          campoNome.focus();
        }
      });
    }

    if (filtroItemLista) {
      filtroItemLista.addEventListener("input", function () {
        filtrosAtivos.item = filtroItemLista.value.trim();
        renderizarTabela();
      });
    }

    if (filtroCategoriaLista) {
      filtroCategoriaLista.addEventListener("change", function () {
        filtrosAtivos.categoria = filtroCategoriaLista.value;
        renderizarTabela();
      });
    }

    if (ordenacaoLista) {
      ordenacaoLista.addEventListener("change", function () {
        sincronizarOrdenacaoPeloSelect();
        renderizarTabela();
      });
    }

    if (btnLimparFiltrosLista) {
      btnLimparFiltrosLista.addEventListener("click", function () {
        filtrosAtivos.item = "";
        filtrosAtivos.categoria = "";

        if (filtroItemLista) {
          filtroItemLista.value = "";
        }

        if (filtroCategoriaLista) {
          filtroCategoriaLista.value = "";
        }

        renderizarTabela();
      });
    }

    configurarOrdenacaoPorCabecalho(ordenarColunaComprar, "comprar");
    configurarOrdenacaoPorCabecalho(ordenarColunaItem, "item");
    configurarOrdenacaoPorCabecalho(ordenarColunaQuantidade, "quantidade");
    configurarOrdenacaoPorCabecalho(ordenarColunaCategoria, "categoria");
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
    } catch (error) {
      window.location.replace("index.html");
      throw error;
    }
  }

  async function carregarDados() {
    const [resGrupoItens, resItens, resCategorias] = await Promise.all([
      fetch("/grupo-itens", {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" }
      }).catch(() => null),
      fetch("/itens", {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" }
      }).catch(() => null),
      fetch("/categorias", {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" }
      }).catch(() => null)
    ]);

    itensLista = resGrupoItens && resGrupoItens.ok
      ? normalizarGrupoItens(await lerJsonSeguro(resGrupoItens))
      : [];

    itensGlobais = resItens && resItens.ok
      ? extrairListaResposta(await lerJsonSeguro(resItens))
      : [];

    categoriasGlobais = resCategorias && resCategorias.ok
      ? extrairListaResposta(await lerJsonSeguro(resCategorias))
      : [];
  }

  function normalizarGrupoItens(lista) {
    return extrairListaResposta(lista).map(function (registro) {
      return {
        id: Number(registro.id),
        grupoId: Number(registro.grupoId),
        itemId: Number(registro.itemId),
        nome: String(registro.item?.nome || "").trim(),
        unidade: String(registro.item?.unidadePadrao || "").trim(),
        quantidade: Number(registro.quantidade) || 0,
        categoria: normalizarNomeCategoria(registro.item?.categoria?.nome || ""),
        comprar: Boolean(registro.comprar)
      };
    });
  }

  async function salvarItemNaLista() {
    limparMensagem();

    const nome = String(campoNome ? campoNome.value : "").trim();
    const unidade = obterUnidadeFormulario();
    const categoria = obterCategoriaFormulario();

    if (!nome) {
      exibirMensagem("Informe o item.", "warning");
      if (campoNome) {
        campoNome.focus();
      }
      return;
    }

    if (!unidade) {
      exibirMensagem("Informe a unidade.", "warning");
      if (campoUnidade) {
        campoUnidade.focus();
      }
      return;
    }

    if (!categoria) {
      exibirMensagem("Informe a categoria.", "warning");
      if (campoCategoria) {
        campoCategoria.focus();
      }
      return;
    }

    const itemGlobal = await garantirItemGlobal({
      nome: nome,
      unidade: unidade,
      categoria: categoria
    });

    if (!itemGlobal || !itemGlobal.id) {
      exibirMensagem("Não foi possível preparar o item global para a lista.", "danger");
      return;
    }

    const itemJaExisteNoGrupo = itensLista.some(function (item) {
      return Number(item.itemId) === Number(itemGlobal.id);
    });

    if (itemJaExisteNoGrupo) {
      exibirMensagem("Esse item já existe na lista do grupo.", "warning");
      return;
    }

    try {
      definirEstadoSalvamento(true);

      const resposta = await fetch("/grupo-itens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          itemId: Number(itemGlobal.id),
          quantidade: 0,
          comprar: true
        })
      });

      const dados = await lerJsonSeguro(resposta);

      if (!resposta.ok) {
        exibirMensagem(dados.erro || "Não foi possível adicionar o item à lista.", "danger");
        return;
      }

      await carregarDados();
      popularCategoriasDinamicas();
      renderizarTabela();
      limparFormulario();
      exibirMensagem("Item adicionado à lista com sucesso.", "success");

      if (modalBootstrap) {
        setTimeout(function () {
          modalBootstrap.hide();
        }, 250);
      }
    } catch (error) {
      console.error("Erro ao salvar item na lista:", error);
      exibirMensagem("Erro de conexão ao salvar o item.", "danger");
    } finally {
      definirEstadoSalvamento(false);
    }
  }

  async function atualizarStatusComprar(id, status) {
    try {
      const resposta = await fetch(`/grupo-itens/${id}/comprar`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          comprar: status
        })
      });

      const dados = await lerJsonSeguro(resposta);

      if (!resposta.ok) {
        exibirMensagem(dados.erro || "Não foi possível atualizar o status de compra.", "danger");
        return false;
      }

      return true;
    } catch (error) {
      console.error("Erro ao atualizar status comprar:", error);
      exibirMensagem("Erro de conexão ao atualizar o status.", "danger");
      return false;
    }
  }

  function renderizarTabela() {
    listaTabela.textContent = "";

    const itensFiltrados = aplicarFiltros(itensLista);
    const itensOrdenados = aplicarOrdenacao(itensFiltrados);

    atualizarResumoFiltros();
    atualizarIndicadoresOrdenacao();
    atualizarContadorItens(itensOrdenados.length);

    if (itensOrdenados.length === 0) {
      const linhaVazia = document.createElement("tr");
      const celula = document.createElement("td");
      celula.colSpan = 5;
      celula.className = "text-center text-muted empty-state";
      celula.textContent = itensLista.length > 0
        ? "Nenhum item corresponde aos filtros aplicados."
        : "Nenhum item disponível na lista até o momento.";

      linhaVazia.appendChild(celula);
      listaTabela.appendChild(linhaVazia);
      return;
    }

    itensOrdenados.forEach(function (item) {
      listaTabela.appendChild(criarLinhaTabela(item));
    });
  }

  function criarLinhaTabela(item) {
    const marcadoComprar = Boolean(item.comprar);
    let linha = null;

    if (templateLinhaLista) {
      const fragmento = templateLinhaLista.content.cloneNode(true);
      linha = fragmento.querySelector("tr");
    } else {
      linha = document.createElement("tr");

      const celulaCheckbox = document.createElement("td");
      celulaCheckbox.className = "cell-checkbox";

      const celulaNome = document.createElement("td");
      celulaNome.className = "item-nome";

      const celulaUnidade = document.createElement("td");
      celulaUnidade.className = "item-unidade";

      const celulaQuantidade = document.createElement("td");
      celulaQuantidade.className = "item-quantidade cell-quantidade";

      const celulaCategoria = document.createElement("td");
      celulaCategoria.className = "item-categoria";

      linha.appendChild(celulaCheckbox);
      linha.appendChild(celulaNome);
      linha.appendChild(celulaUnidade);
      linha.appendChild(celulaQuantidade);
      linha.appendChild(celulaCategoria);
    }

    linha.classList.add("item-row");
    linha.dataset.item = normalizarTexto(item.nome);
    linha.dataset.categoria = normalizarTexto(item.categoria);
    linha.dataset.quantidade = String(Number(item.quantidade) || 0);
    linha.dataset.unidade = normalizarTexto(item.unidade);
    linha.dataset.comprar = marcadoComprar ? "1" : "0";

    const quantidadeAtual = Number(item.quantidade) || 0;

    if (quantidadeAtual === 0) {
      linha.classList.add("status-danger", "is-zero");
    }

    if (quantidadeAtual > 0 && quantidadeAtual <= 1) {
      linha.classList.add("is-baixo");
    }

    if (marcadoComprar) {
      linha.classList.add("is-comprado");
    }

    preencherLinhaTabela(linha, item, marcadoComprar);
    return linha;
  }

  function preencherLinhaTabela(linha, item, marcadoComprar) {
    const celulaCheckbox = linha.querySelector(".cell-checkbox");
    const celulaNome = linha.querySelector(".item-nome");
    const celulaUnidade = linha.querySelector(".item-unidade");
    const celulaQuantidade = linha.querySelector(".item-quantidade");
    const celulaCategoria = linha.querySelector(".item-categoria");

    if (celulaCheckbox) {
      celulaCheckbox.textContent = "";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "form-check-input checkbox-comprar lista-checkbox-comprar";
      checkbox.id = "lista-comprar-" + String(item.id);
      checkbox.checked = marcadoComprar;
      checkbox.setAttribute("aria-label", `Marcar ${item.nome} para compra`);

      celulaCheckbox.appendChild(checkbox);

      checkbox.addEventListener("change", async function () {
        checkbox.disabled = true;

        const ok = await atualizarStatusComprar(item.id, checkbox.checked);

        if (ok) {
          await carregarDados();
          renderizarTabela();
        } else {
          checkbox.checked = !checkbox.checked;
          checkbox.disabled = false;
        }
      });
    }

    if (celulaNome) {
      celulaNome.textContent = item.nome;
    }

    if (celulaUnidade) {
      celulaUnidade.textContent = item.unidade || "—";
    }

    if (celulaQuantidade) {
      celulaQuantidade.textContent = formatarNumero(item.quantidade);
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

      if (estadoOrdenacao.campo === "comprar") {
        comparacao = compararNumero(a.comprar ? 1 : 0, b.comprar ? 1 : 0);
      } else if (estadoOrdenacao.campo === "item") {
        comparacao = compararTexto(a.nome, b.nome);
      } else if (estadoOrdenacao.campo === "categoria") {
        comparacao = compararTexto(a.categoria, b.categoria);
      } else if (estadoOrdenacao.campo === "quantidade") {
        comparacao = compararNumero(a.quantidade, b.quantidade);
      }

      if (comparacao === 0) {
        comparacao = compararTexto(a.nome, b.nome);
      }

      return estadoOrdenacao.direcao === "desc" ? comparacao * -1 : comparacao;
    });

    return listaOrdenada;
  }

  function configurarOrdenacaoPorCabecalho(elemento, campo) {
    if (!elemento) {
      return;
    }

    function alternarOrdenacao() {
      if (estadoOrdenacao.campo === campo) {
        estadoOrdenacao.direcao = estadoOrdenacao.direcao === "asc" ? "desc" : "asc";
      } else {
        estadoOrdenacao.campo = campo;
        estadoOrdenacao.direcao = campo === "comprar" ? "desc" : "asc";
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

  function sincronizarOrdenacaoComSelect() {
    if (!ordenacaoLista) {
      return;
    }

    ordenacaoLista.value = `${estadoOrdenacao.campo}-${estadoOrdenacao.direcao}`;
  }

  function sincronizarOrdenacaoPeloSelect() {
    if (!ordenacaoLista || !ordenacaoLista.value) {
      return;
    }

    const partes = ordenacaoLista.value.split("-");
    estadoOrdenacao.campo = partes[0] || "comprar";
    estadoOrdenacao.direcao = partes[1] || "desc";
  }

  function atualizarIndicadoresOrdenacao() {
    const cabecalhos = [
      { elemento: ordenarColunaComprar, campo: "comprar" },
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

  function atualizarResumoFiltros() {
    if (!resumoFiltrosLista) {
      return;
    }

    resumoFiltrosLista.textContent = "";

    if (filtrosAtivos.item) {
      resumoFiltrosLista.appendChild(
        criarChipFiltro("Item: " + filtrosAtivos.item, function () {
          filtrosAtivos.item = "";
          if (filtroItemLista) {
            filtroItemLista.value = "";
          }
          renderizarTabela();
        })
      );
    }

    if (filtrosAtivos.categoria) {
      resumoFiltrosLista.appendChild(
        criarChipFiltro("Categoria: " + filtrosAtivos.categoria, function () {
          filtrosAtivos.categoria = "";
          if (filtroCategoriaLista) {
            filtroCategoriaLista.value = "";
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

  function atualizarContadorItens(quantidade) {
    if (!contadorItensLista) {
      return;
    }

    contadorItensLista.textContent = `${quantidade} item(ns) exibido(s)`;
  }

  function popularCategoriasDinamicas() {
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

    itensLista.forEach(function (item) {
      const nomeCategoria = normalizarNomeCategoria(item.categoria || "");
      if (nomeCategoria) {
        categoriasSet.add(nomeCategoria);
      }
    });

    const categorias = Array.from(categoriasSet).sort(function (a, b) {
      return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
    });

    preencherSelectCategorias(campoCategoria, categorias, true);
    preencherSelectCategorias(filtroCategoriaLista, categorias, false);
  }

  function preencherSelectCategorias(selectElement, categorias, incluirOutra) {
    if (!selectElement) {
      return;
    }

    const valorAtual = selectElement.value;
    selectElement.textContent = "";

    if (selectElement === filtroCategoriaLista) {
      selectElement.appendChild(criarOption("", "Todas as categorias"));
    } else {
      selectElement.appendChild(criarOption("", "Selecione a categoria"));
    }

    categorias.forEach(function (categoria) {
      selectElement.appendChild(criarOption(categoria, categoria));
    });

    if (incluirOutra) {
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
    if (!campoCategoria || !campoCategoriaOutraWrapper || !campoCategoriaOutra) {
      return;
    }

    if (campoCategoria.value === "__nova__") {
      campoCategoriaOutraWrapper.classList.remove("d-none");
      campoCategoriaOutra.required = true;
    } else {
      campoCategoriaOutraWrapper.classList.add("d-none");
      campoCategoriaOutra.required = false;
      campoCategoriaOutra.value = "";
    }
  }

  function alternarCampoOutro(selectElement, wrapperElement, inputElement) {
    if (!selectElement || !wrapperElement || !inputElement) {
      return;
    }

    if (selectElement.value === "outro(s)") {
      wrapperElement.classList.remove("d-none");
      inputElement.required = true;
    } else {
      wrapperElement.classList.add("d-none");
      inputElement.required = false;
      inputElement.value = "";
    }
  }

  function obterCategoriaFormulario() {
    if (!campoCategoria) {
      return "";
    }

    if (campoCategoria.value === "__nova__") {
      return normalizarNomeCategoria(campoCategoriaOutra ? campoCategoriaOutra.value : "");
    }

    return normalizarNomeCategoria(campoCategoria.value);
  }

  function obterUnidadeFormulario() {
    if (!campoUnidade) {
      return "";
    }

    if (campoUnidade.value === "outro(s)") {
      return String(campoUnidadeOutra ? campoUnidadeOutra.value : "").trim();
    }

    return String(campoUnidade.value || "").trim();
  }

  function atualizarCategoriaPeloNomeDigitado() {
    const nome = String(campoNome ? campoNome.value : "").trim();

    if (!nome) {
      return;
    }

    const item = buscarItemGlobalPorNome(nome);
    if (item && item.categoria) {
      preencherCampoCategoria(item.categoria.nome || item.categoria);
    }
  }

  function atualizarUnidadePeloNomeDigitado() {
    const nome = String(campoNome ? campoNome.value : "").trim();

    if (!nome) {
      return;
    }

    const item = buscarItemGlobalPorNome(nome);
    if (item && item.unidadePadrao) {
      preencherSelectOuOutro(
        campoUnidade,
        campoUnidadeOutraWrapper,
        campoUnidadeOutra,
        item.unidadePadrao
      );
    }
  }

  function preencherCampoCategoria(categoria) {
    const categoriaNormalizada = normalizarNomeCategoria(categoria);

    if (!categoriaNormalizada || !campoCategoria) {
      if (campoCategoria) {
        campoCategoria.value = "";
      }
      alternarCampoCategoriaNova();
      return;
    }

    const existeNaLista = Array.from(campoCategoria.options).some(function (option) {
      return normalizarTexto(option.value) === normalizarTexto(categoriaNormalizada);
    });

    if (existeNaLista) {
      campoCategoria.value = categoriaNormalizada;
      if (campoCategoriaOutra) {
        campoCategoriaOutra.value = "";
      }
    } else {
      campoCategoria.value = "__nova__";
      if (campoCategoriaOutra) {
        campoCategoriaOutra.value = categoriaNormalizada;
      }
    }

    alternarCampoCategoriaNova();
  }

  function preencherSelectOuOutro(selectElement, wrapperElement, inputElement, valor) {
    if (!selectElement || !wrapperElement || !inputElement) {
      return;
    }

    const valorExisteNaLista = Array.from(selectElement.options).some(function (option) {
      return option.value === valor;
    });

    if (!valor) {
      selectElement.value = "";
      wrapperElement.classList.add("d-none");
      inputElement.required = false;
      inputElement.value = "";
      return;
    }

    if (valorExisteNaLista) {
      selectElement.value = valor;
      wrapperElement.classList.add("d-none");
      inputElement.required = false;
      inputElement.value = "";
      return;
    }

    selectElement.value = "outro(s)";
    wrapperElement.classList.remove("d-none");
    inputElement.required = true;
    inputElement.value = valor;
  }


  async function garantirItemGlobal({ nome, unidade, categoria }) {
    let itemExistente = buscarItemGlobalPorNome(nome);

    if (itemExistente) {
      return itemExistente;
    }

    const categoriaExistente = buscarCategoriaGlobalPorNome(categoria);
    let categoriaId = categoriaExistente ? Number(categoriaExistente.id) : null;

    if (!categoriaId) {
      const categoriaCriada = await criarCategoriaGlobal(categoria);
      categoriaId = categoriaCriada ? Number(categoriaCriada.id) : null;
    }

    if (!categoriaId) {
      throw new Error("Não foi possível resolver a categoria global.");
    }

    const itemCriado = await criarItemGlobal({
      nome: nome,
      categoriaId: categoriaId,
      unidadePadrao: unidade
    });

    if (itemCriado && itemCriado.id) {
      return itemCriado;
    }

    itemExistente = buscarItemGlobalPorNome(nome);

    if (itemExistente) {
      return itemExistente;
    }

    throw new Error("Não foi possível resolver o item global.");
  }

  function buscarCategoriaGlobalPorNome(nome) {
    const nomeNormalizado = normalizarTexto(nome);

    if (!nomeNormalizado) {
      return null;
    }

    return categoriasGlobais.find(function (categoria) {
      return normalizarTexto(categoria.nome || categoria) === nomeNormalizado;
    }) || null;
  }

  async function criarCategoriaGlobal(nome) {
    const resposta = await fetch("/categorias", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        nome: nome
      })
    });

    const dados = await lerJsonSeguro(resposta);

    if (resposta.ok) {
      categoriasGlobais.push(dados);
      return dados;
    }

    if (resposta.status === 409) {
      await recarregarCatalogoGlobal();
      return buscarCategoriaGlobalPorNome(nome);
    }

    throw new Error(dados.erro || "Não foi possível criar a categoria global.");
  }

  async function criarItemGlobal({ nome, categoriaId, unidadePadrao }) {
    const resposta = await fetch("/itens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        nome: nome,
        categoriaId: Number(categoriaId),
        unidadePadrao: unidadePadrao
      })
    });

    const dados = await lerJsonSeguro(resposta);

    if (resposta.ok) {
      itensGlobais.push(dados);
      return dados;
    }

    if (resposta.status === 409) {
      await recarregarCatalogoGlobal();
      return buscarItemGlobalPorNome(nome);
    }

    throw new Error(dados.erro || "Não foi possível criar o item global.");
  }

  async function recarregarCatalogoGlobal() {
    const [resItens, resCategorias] = await Promise.all([
      fetch("/itens", {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" }
      }).catch(() => null),
      fetch("/categorias", {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" }
      }).catch(() => null)
    ]);

    itensGlobais = resItens && resItens.ok
      ? extrairListaResposta(await lerJsonSeguro(resItens))
      : itensGlobais;

    categoriasGlobais = resCategorias && resCategorias.ok
      ? extrairListaResposta(await lerJsonSeguro(resCategorias))
      : categoriasGlobais;
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

  function buscarItemGlobalPorNome(nome) {
    const nomeNormalizado = normalizarTexto(nome);

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
        if (campoNome) {
          campoNome.value = item.nome;
        }
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

  function limparFormulario() {
    if (listaForm) {
      listaForm.reset();
    }

    if (campoUnidade) {
      campoUnidade.value = "unidade(s)";
    }

    if (campoUnidadeOutraWrapper) {
      campoUnidadeOutraWrapper.classList.add("d-none");
    }

    if (campoUnidadeOutra) {
      campoUnidadeOutra.required = false;
      campoUnidadeOutra.value = "";
    }

    if (campoCategoria) {
      campoCategoria.value = "";
    }

    if (campoCategoriaOutraWrapper) {
      campoCategoriaOutraWrapper.classList.add("d-none");
    }

    if (campoCategoriaOutra) {
      campoCategoriaOutra.required = false;
      campoCategoriaOutra.value = "";
    }

    limparSugestoes();
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
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function normalizarNomeCategoria(valor) {
    return String(valor || "").trim().replace(/\s+/g, " ");
  }

  function formatarNumero(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  function exibirMensagem(mensagem, tipo) {
    if (!campoMensagem) {
      return;
    }

    campoMensagem.textContent = mensagem;
    campoMensagem.className = `small text-${tipo}`;
    campoMensagem.setAttribute("role", tipo === "danger" || tipo === "warning" ? "alert" : "status");
  }

  function limparMensagem() {
    if (!campoMensagem) {
      return;
    }

    campoMensagem.textContent = "";
    campoMensagem.className = "small";
    campoMensagem.setAttribute("role", "status");
  }

  function definirEstadoSalvamento(salvando) {
    if (btnSalvar) {
      btnSalvar.disabled = salvando;
      btnSalvar.textContent = salvando ? "Salvando..." : "Salvar item";
    }

    if (campoNome) {
      campoNome.disabled = salvando;
    }

    if (campoUnidade) {
      campoUnidade.disabled = salvando;
    }

    if (campoUnidadeOutra) {
      campoUnidadeOutra.disabled = salvando;
    }

    if (campoCategoria) {
      campoCategoria.disabled = salvando;
    }

    if (campoCategoriaOutra) {
      campoCategoriaOutra.disabled = salvando;
    }
  }

  async function lerJsonSeguro(resposta) {
    try {
      return await resposta.json();
    } catch {
      return {};
    }
  }

  function garantirArray(valor) {
    return Array.isArray(valor) ? valor : [];
  }
});