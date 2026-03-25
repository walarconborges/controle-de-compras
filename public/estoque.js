document.addEventListener("DOMContentLoaded", function () {
  const estoqueForm = document.getElementById("estoque-form");
  const estoqueTabela = document.getElementById("estoque-tabela");
  const templateLinhaEstoque = document.getElementById("template-linha-estoque");
  const campoMensagem = document.getElementById("estoque-mensagem");

  const campoNome = document.getElementById("item-nome");
  const campoQuantidadeCadastro = document.getElementById("item-quantidade");
  const campoUnidade = document.getElementById("item-unidade");
  const campoUnidadeOutraWrapper = document.getElementById("campo-unidade-outra-wrapper");
  const campoUnidadeOutra = document.getElementById("campo-unidade-outra");

  const campoCategoria = document.getElementById("item-categoria");
  const campoCategoriaOutraWrapper = document.getElementById("campo-categoria-outra-wrapper");
  const campoCategoriaOutra = document.getElementById("campo-categoria-outra");

  const filtroItemEstoque = document.getElementById("filtro-item-estoque");
  const filtroCategoriaEstoque = document.getElementById("filtro-categoria-estoque");
  const ordenacaoEstoque = document.getElementById("ordenacao-estoque");
  const resumoFiltrosEstoque = document.getElementById("resumo-filtros-estoque");
  const contadorItensEstoque = document.getElementById("contador-itens-estoque");

  const ordenarColunaItem = document.getElementById("ordenar-coluna-item-estoque");
  const ordenarColunaQuantidade = document.getElementById("ordenar-coluna-quantidade-estoque");
  const ordenarColunaCategoria = document.getElementById("ordenar-coluna-categoria-estoque");

  const btnSalvar = document.getElementById("btn-salvar-item-estoque");
  const btnLimpar = document.getElementById("btn-limpar-item-estoque");
  const btnLimparFiltros = document.getElementById("btn-limpar-filtros-estoque");

  const sugestoesItemContainer = document.getElementById("sugestoes-item-estoque");

  const menu = document.getElementById("menu-lateral-estoque");
  const menuContent = document.getElementById("menu-lateral-conteudo-estoque");
  const btnAbrirMenu = document.getElementById("btn-menu-mobile");
  const btnFecharMenu = document.getElementById("btn-fechar-menu-mobile");
  const backdrop = document.getElementById("menu-mobile-backdrop");

  const modalAdicionarItemElement = document.getElementById("modalAdicionarItem");
  const modalAdicionarItem = modalAdicionarItemElement
    ? bootstrap.Modal.getOrCreateInstance(modalAdicionarItemElement)
    : null;
  const tituloModal = document.getElementById("modalAdicionarItemLabel");

  let itensEstoque = [];
  let itensGlobais = [];
  let categoriasGlobais = [];
  let idEdicao = null;
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
    !estoqueForm ||
    !estoqueTabela ||
    !campoNome ||
    !campoQuantidadeCadastro ||
    !campoUnidade ||
    !campoCategoria ||
    !campoMensagem
  ) {
    console.error("Estrutura principal da página de estoque não encontrada.");
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
      console.error("Erro ao inicializar estoque.js:", error);
      exibirMensagem("Não foi possível carregar a página de estoque.", "danger");
    }
  }

  function configurarEventos() {
    configurarMenuMobile();

    estoqueForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      await salvarFormulario();
    });

    if (btnLimpar) {
      btnLimpar.addEventListener("click", function () {
        limparFormulario();
        limparMensagem();
        campoNome.focus();
      });
    }

    if (btnLimparFiltros) {
      btnLimparFiltros.addEventListener("click", function () {
        filtrosAtivos.item = "";
        filtrosAtivos.categoria = "";

        if (filtroItemEstoque) {
          filtroItemEstoque.value = "";
        }

        if (filtroCategoriaEstoque) {
          filtroCategoriaEstoque.value = "";
        }

        renderizarTabela();
      });
    }

    campoCategoria.addEventListener("change", alternarCampoCategoriaNova);

    campoUnidade.addEventListener("change", function () {
      alternarCampoOutro(campoUnidade, campoUnidadeOutraWrapper, campoUnidadeOutra);
    });

    campoNome.addEventListener("input", function () {
      atualizarCategoriaPeloNomeDigitado();
      atualizarUnidadePeloNomeDigitado();
      renderizarSugestoesItem(campoNome.value);
    });

    campoNome.addEventListener("blur", function () {
      setTimeout(limparSugestoes, 150);
    });

    if (filtroItemEstoque) {
      filtroItemEstoque.addEventListener("input", function () {
        filtrosAtivos.item = filtroItemEstoque.value.trim();
        renderizarTabela();
      });
    }

    if (filtroCategoriaEstoque) {
      filtroCategoriaEstoque.addEventListener("change", function () {
        filtrosAtivos.categoria = filtroCategoriaEstoque.value;
        renderizarTabela();
      });
    }

    if (ordenacaoEstoque) {
      ordenacaoEstoque.addEventListener("change", function () {
        sincronizarOrdenacaoPeloSelect();
        renderizarTabela();
      });
    }

    configurarOrdenacaoPorCabecalho(ordenarColunaItem, "item");
    configurarOrdenacaoPorCabecalho(ordenarColunaQuantidade, "quantidade");
    configurarOrdenacaoPorCabecalho(ordenarColunaCategoria, "categoria");

    if (modalAdicionarItemElement) {
      modalAdicionarItemElement.addEventListener("hidden.bs.modal", function () {
        limparFormulario();
        limparMensagem();
        limparSugestoes();
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

  async function carregarDados() {
    const [resGrupoItens, resItens, resCategorias] = await Promise.all([
      fetch("/grupo-itens", { method: "GET", credentials: "include", headers: { Accept: "application/json" } }).catch(() => null),
      fetch("/itens", { method: "GET", credentials: "include", headers: { Accept: "application/json" } }).catch(() => null),
      fetch("/categorias", { method: "GET", credentials: "include", headers: { Accept: "application/json" } }).catch(() => null)
    ]);

    itensEstoque = resGrupoItens && resGrupoItens.ok
      ? normalizarGrupoItens(await lerJsonSeguro(resGrupoItens))
      : [];

    itensGlobais = resItens && resItens.ok
      ? garantirArray(await lerJsonSeguro(resItens))
      : [];

    categoriasGlobais = resCategorias && resCategorias.ok
      ? garantirArray(await lerJsonSeguro(resCategorias))
      : [];
  }

  function normalizarGrupoItens(lista) {
    return garantirArray(lista).map(function (registro) {
      return {
        id: Number(registro.id),
        grupoId: Number(registro.grupoId),
        itemId: Number(registro.itemId),
        nome: String(registro.item?.nome || "").trim(),
        unidade: String(registro.item?.unidadePadrao || "").trim(),
        quantidade: Number(registro.quantidade) || 0,
        categoria: normalizarNomeCategoria(registro.item?.categoria?.nome || "")
      };
    });
  }

  async function salvarFormulario() {
    limparMensagem();

    const nome = String(campoNome.value || "").trim();
    const quantidade = normalizarNumero(campoQuantidadeCadastro.value);
    const unidade = obterUnidadeFormulario();
    const categoria = obterCategoriaFormulario();

    if (!nome) {
      exibirMensagem("Informe o item.", "warning");
      campoNome.focus();
      return;
    }

    if (!Number.isFinite(quantidade) || quantidade < 0) {
      exibirMensagem("Informe uma quantidade válida.", "warning");
      campoQuantidadeCadastro.focus();
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

    const itemGlobal = buscarItemGlobalPorNome(nome);

    try {
      definirEstadoSalvamento(true);

      if (idEdicao) {
        await atualizarQuantidade(idEdicao, quantidade);
        exibirMensagem("Quantidade do item atualizada com sucesso.", "success");
      } else {
        const itemJaExisteNoGrupo = itemGlobal
          ? itensEstoque.some(function (item) {
              return Number(item.itemId) === Number(itemGlobal.id);
            })
          : itensEstoque.some(function (item) {
              return normalizarTexto(item.nome) === normalizarTexto(nome);
            });

        if (itemJaExisteNoGrupo) {
          exibirMensagem("Esse item já está no estoque do grupo. Use Editar para alterar a quantidade.", "warning");
          return;
        }

        const corpo = {
          quantidade: quantidade,
          comprar: quantidade <= 0
        };

        if (itemGlobal && itemGlobal.id) {
          corpo.itemId = Number(itemGlobal.id);
        } else {
          corpo.nome = nome;
          corpo.unidade = unidade;
          corpo.categoria = categoria;
        }

        const resposta = await fetch("/grupo-itens", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          credentials: "include",
          body: JSON.stringify(corpo)
        });

        const dados = await lerJsonSeguro(resposta);

        if (!resposta.ok) {
          exibirMensagem(dados.erro || "Não foi possível adicionar o item ao estoque.", resposta.status === 409 ? "warning" : "danger");
          return;
        }

        exibirMensagem("Item adicionado ao estoque do grupo.", "success");
      }

      await carregarDados();
      popularCategoriasDinamicas();
      renderizarTabela();
      limparFormulario();

      if (modalAdicionarItem) {
        setTimeout(function () {
          modalAdicionarItem.hide();
        }, 250);
      }
    } catch (error) {
      console.error("Erro ao salvar item no estoque:", error);
      exibirMensagem("Erro de conexão ao salvar o item.", "danger");
    } finally {
      definirEstadoSalvamento(false);
    }
  }

  async function atualizarQuantidade(id, quantidade) {
    const resposta = await fetch(`/grupo-itens/${id}/quantidade`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        quantidade: quantidade
      })
    });

    const dados = await lerJsonSeguro(resposta);

    if (!resposta.ok) {
      throw new Error(dados.erro || "Falha ao atualizar quantidade.");
    }
  }

  async function excluirItem(id) {
    try {
      const resposta = await fetch(`/grupo-itens/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          Accept: "application/json"
        }
      });

      const dados = await lerJsonSeguro(resposta);

      if (!resposta.ok) {
        exibirMensagem(dados.erro || "Não foi possível excluir o item do estoque.", "danger");
        return;
      }

      await carregarDados();
      popularCategoriasDinamicas();
      renderizarTabela();
      exibirMensagem("Item removido do estoque do grupo.", "success");
    } catch (error) {
      console.error("Erro ao excluir item do estoque:", error);
      exibirMensagem("Erro de conexão ao excluir o item.", "danger");
    }
  }

  async function alterarQuantidadeRapida(id, quantidadeAtual, delta) {
    const novaQuantidade = Number(quantidadeAtual) + Number(delta);

    if (!Number.isFinite(novaQuantidade) || novaQuantidade < 0) {
      exibirMensagem("Quantidade inválida.", "warning");
      return;
    }

    try {
      await atualizarQuantidade(id, novaQuantidade);
      await carregarDados();
      renderizarTabela();
    } catch (error) {
      console.error("Erro ao alterar quantidade:", error);
      exibirMensagem("Não foi possível alterar a quantidade.", "danger");
    }
  }

  async function salvarQuantidadeDigitada(id, valorDigitado) {
    const quantidade = normalizarNumero(valorDigitado);

    if (!Number.isFinite(quantidade) || quantidade < 0) {
      exibirMensagem("Quantidade inválida.", "warning");
      await carregarDados();
      renderizarTabela();
      return;
    }

    try {
      await atualizarQuantidade(id, quantidade);
      await carregarDados();
      renderizarTabela();
    } catch (error) {
      console.error("Erro ao salvar quantidade digitada:", error);
      exibirMensagem("Não foi possível salvar a quantidade.", "danger");
    }
  }

  function renderizarTabela() {
    estoqueTabela.textContent = "";

    const itensFiltrados = aplicarFiltros(itensEstoque);
    const itensOrdenados = aplicarOrdenacao(itensFiltrados);

    atualizarResumoFiltros();
    atualizarIndicadoresOrdenacao();
    atualizarContadorItens(itensOrdenados.length);

    if (itensOrdenados.length === 0) {
      const linhaVazia = document.createElement("tr");
      linhaVazia.id = "estoque-estado-vazio";

      const celula = document.createElement("td");
      celula.colSpan = 5;
      celula.className = "text-center text-muted empty-state";
      celula.textContent = itensEstoque.length > 0
        ? "Nenhum item corresponde aos filtros aplicados."
        : "Nenhum item cadastrado até o momento.";

      linhaVazia.appendChild(celula);
      estoqueTabela.appendChild(linhaVazia);
      return;
    }

    itensOrdenados.forEach(function (item) {
      estoqueTabela.appendChild(criarLinhaTabela(item));
    });
  }

  function criarLinhaTabela(item) {
    let linha;

    if (templateLinhaEstoque) {
      const fragmento = templateLinhaEstoque.content.cloneNode(true);
      linha = fragmento.querySelector("tr");
    } else {
      linha = document.createElement("tr");

      const celulaAcoes = document.createElement("td");
      celulaAcoes.className = "cell-acoes";
      const containerAcoes = document.createElement("div");
      containerAcoes.className = "d-flex gap-2 flex-wrap";

      const botaoEditar = document.createElement("button");
      botaoEditar.type = "button";
      botaoEditar.className = "btn btn-outline-primary btn-sm btn-editar-estoque";
      botaoEditar.textContent = "Editar";

      const botaoExcluir = document.createElement("button");
      botaoExcluir.type = "button";
      botaoExcluir.className = "btn btn-outline-danger btn-sm btn-excluir-estoque";
      botaoExcluir.textContent = "Excluir";

      containerAcoes.appendChild(botaoEditar);
      containerAcoes.appendChild(botaoExcluir);
      celulaAcoes.appendChild(containerAcoes);

      const celulaNome = document.createElement("td");
      celulaNome.className = "item-nome";

      const celulaUnidade = document.createElement("td");
      celulaUnidade.className = "item-unidade";

      const celulaQuantidade = document.createElement("td");
      celulaQuantidade.className = "item-quantidade cell-quantidade";

      const celulaCategoria = document.createElement("td");
      celulaCategoria.className = "item-categoria";

      linha.appendChild(celulaAcoes);
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

    if (Number(item.quantidade) === 0) {
      linha.classList.add("is-zero", "status-danger");
    } else if (Number(item.quantidade) > 0 && Number(item.quantidade) <= 1) {
      linha.classList.add("is-baixo");
    }

    preencherLinhaTabela(linha, item);
    return linha;
  }

  function preencherLinhaTabela(linha, item) {
    const celulaNome = linha.querySelector(".item-nome");
    const celulaUnidade = linha.querySelector(".item-unidade");
    const celulaQuantidade = linha.querySelector(".item-quantidade");
    const celulaCategoria = linha.querySelector(".item-categoria");

    if (celulaNome) {
      celulaNome.textContent = item.nome;
    }

    if (celulaUnidade) {
      celulaUnidade.textContent = item.unidade || "—";
    }

    if (celulaQuantidade) {
      celulaQuantidade.textContent = "";

      const containerQuantidade = document.createElement("div");
      containerQuantidade.className = "d-flex align-items-center gap-2";

      const botaoDiminuir = document.createElement("button");
      botaoDiminuir.type = "button";
      botaoDiminuir.className = "btn btn-sm btn-outline-secondary btn-diminuir-estoque";
      botaoDiminuir.textContent = "-";

      const campoQuantidadeLinha = document.createElement("input");
      campoQuantidadeLinha.type = "text";
      campoQuantidadeLinha.inputMode = "decimal";
      campoQuantidadeLinha.className = "form-control form-control-sm campo-quantidade";
      campoQuantidadeLinha.value = formatarValorCampo(item.quantidade);
      campoQuantidadeLinha.setAttribute("aria-label", `Quantidade do item ${item.nome}`);

      const botaoAumentar = document.createElement("button");
      botaoAumentar.type = "button";
      botaoAumentar.className = "btn btn-sm btn-outline-secondary btn-aumentar-estoque";
      botaoAumentar.textContent = "+";

      containerQuantidade.appendChild(botaoDiminuir);
      containerQuantidade.appendChild(campoQuantidadeLinha);
      containerQuantidade.appendChild(botaoAumentar);
      celulaQuantidade.appendChild(containerQuantidade);

      botaoDiminuir.addEventListener("click", function () {
        alterarQuantidadeRapida(item.id, item.quantidade, -1);
      });

      botaoAumentar.addEventListener("click", function () {
        alterarQuantidadeRapida(item.id, item.quantidade, 1);
      });

      campoQuantidadeLinha.addEventListener("change", function () {
        salvarQuantidadeDigitada(item.id, campoQuantidadeLinha.value);
      });

      campoQuantidadeLinha.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          salvarQuantidadeDigitada(item.id, campoQuantidadeLinha.value);
        }
      });
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

    const botaoEditar = linha.querySelector(".btn-editar-estoque");
    const botaoExcluir = linha.querySelector(".btn-excluir-estoque");

    if (botaoEditar) {
      botaoEditar.addEventListener("click", function () {
        preencherFormulario(item);

        if (modalAdicionarItem) {
          modalAdicionarItem.show();
        }
      });
    }

    if (botaoExcluir) {
      botaoExcluir.addEventListener("click", function () {
        excluirItem(item.id);
      });
    }
  }

  function preencherFormulario(item) {
    campoNome.value = item.nome;
    campoQuantidadeCadastro.value = formatarValorCampo(item.quantidade);

    preencherSelectOuOutro(
      campoUnidade,
      campoUnidadeOutraWrapper,
      campoUnidadeOutra,
      item.unidade
    );

    preencherCampoCategoria(item.categoria || "");
    idEdicao = item.id;

    if (tituloModal) {
      tituloModal.textContent = "Editar item";
    }

    definirTextoBotaoSalvar();
  }

  function preencherCampoCategoria(categoria) {
    const categoriaNormalizada = normalizarNomeCategoria(categoria);

    if (!categoriaNormalizada) {
      campoCategoria.value = "";
      alternarCampoCategoriaNova();
      return;
    }

    const existeNaLista = Array.from(campoCategoria.options).some(function (option) {
      return normalizarTexto(option.value) === normalizarTexto(categoriaNormalizada);
    });

    if (existeNaLista) {
      campoCategoria.value = categoriaNormalizada;
      campoCategoriaOutra.value = "";
    } else {
      campoCategoria.value = "__nova__";
      campoCategoriaOutra.value = categoriaNormalizada;
    }

    alternarCampoCategoriaNova();
  }

  function preencherSelectOuOutro(selectElement, wrapperElement, inputElement, valor) {
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

  function limparFormulario() {
    estoqueForm.reset();

    campoUnidade.value = "unidade(s)";
    campoUnidadeOutraWrapper.classList.add("d-none");
    campoUnidadeOutra.required = false;
    campoUnidadeOutra.value = "";

    campoCategoria.value = "";
    campoCategoriaOutraWrapper.classList.add("d-none");
    campoCategoriaOutra.required = false;
    campoCategoriaOutra.value = "";

    idEdicao = null;
    limparSugestoes();

    if (tituloModal) {
      tituloModal.textContent = "Adicionar item";
    }

    definirTextoBotaoSalvar();
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

  function sincronizarOrdenacaoPeloSelect() {
    if (!ordenacaoEstoque) {
      return;
    }

    const valor = ordenacaoEstoque.value || "item-asc";
    const partes = valor.split("-");

    estadoOrdenacao.campo = partes[0] || "item";
    estadoOrdenacao.direcao = partes[1] || "asc";
  }

  function sincronizarOrdenacaoComSelect() {
    if (!ordenacaoEstoque) {
      return;
    }

    ordenacaoEstoque.value = `${estadoOrdenacao.campo}-${estadoOrdenacao.direcao}`;
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
        ativo ? (estadoOrdenacao.direcao === "asc" ? "ascending" : "descending") : "none"
      );

      if (indicador) {
        indicador.textContent = !ativo ? "↕" : estadoOrdenacao.direcao === "asc" ? "↑" : "↓";
      }
    });
  }

  function atualizarResumoFiltros() {
    if (!resumoFiltrosEstoque) {
      return;
    }

    resumoFiltrosEstoque.textContent = "";

    if (filtrosAtivos.item) {
      resumoFiltrosEstoque.appendChild(
        criarChipFiltro("Item: " + filtrosAtivos.item, function () {
          filtrosAtivos.item = "";
          if (filtroItemEstoque) {
            filtroItemEstoque.value = "";
          }
          renderizarTabela();
        })
      );
    }

    if (filtrosAtivos.categoria) {
      resumoFiltrosEstoque.appendChild(
        criarChipFiltro("Categoria: " + filtrosAtivos.categoria, function () {
          filtrosAtivos.categoria = "";
          if (filtroCategoriaEstoque) {
            filtroCategoriaEstoque.value = "";
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
    if (!contadorItensEstoque) {
      return;
    }

    contadorItensEstoque.textContent = `${quantidade} item(ns) exibido(s)`;
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

    itensEstoque.forEach(function (item) {
      const nomeCategoria = normalizarNomeCategoria(item.categoria || "");
      if (nomeCategoria) {
        categoriasSet.add(nomeCategoria);
      }
    });

    const categorias = Array.from(categoriasSet).sort(function (a, b) {
      return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
    });

    preencherSelectCategorias(campoCategoria, categorias, true);
    preencherSelectCategorias(filtroCategoriaEstoque, categorias, false);
  }

  function preencherSelectCategorias(selectElement, categorias, incluirOutra) {
    if (!selectElement) {
      return;
    }

    const valorAtual = selectElement.value;
    selectElement.textContent = "";

    if (selectElement === filtroCategoriaEstoque) {
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
    if (campoCategoria.value === "__nova__") {
      return normalizarNomeCategoria(campoCategoriaOutra.value);
    }

    return normalizarNomeCategoria(campoCategoria.value);
  }

  function obterUnidadeFormulario() {
    if (campoUnidade.value === "outro(s)") {
      return String(campoUnidadeOutra.value || "").trim();
    }

    return String(campoUnidade.value || "").trim();
  }

  function atualizarCategoriaPeloNomeDigitado() {
    const nome = String(campoNome.value || "").trim();

    if (!nome || idEdicao) {
      return;
    }

    const item = buscarItemGlobalPorNome(nome);
    if (item && item.categoria) {
      preencherCampoCategoria(item.categoria.nome || item.categoria);
    }
  }

  function atualizarUnidadePeloNomeDigitado() {
    const nome = String(campoNome.value || "").trim();

    if (!nome || idEdicao) {
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

  function buscarItemGlobalPorNome(nome) {
    const nomeNormalizado = normalizarTexto(nome);

    return itensGlobais.find(function (item) {
      return normalizarTexto(item.nome) === nomeNormalizado;
    }) || null;
  }

  function renderizarSugestoesItem(texto) {
    if (!sugestoesItemContainer || idEdicao) {
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
        campoNome.value = item.nome;
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

  function compararTexto(a, b) {
    return String(a || "").localeCompare(String(b || ""), "pt-BR", {
      sensitivity: "base"
    });
  }

  function compararNumero(a, b) {
    return (Number(a) || 0) - (Number(b) || 0);
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

  function definirEstadoSalvamento(salvando) {
    if (btnSalvar) {
      btnSalvar.disabled = salvando;
      btnSalvar.textContent = salvando
        ? (idEdicao ? "Salvando..." : "Salvando...")
        : (idEdicao ? "Salvar alterações" : "Salvar item");
    }

    campoNome.disabled = salvando || Boolean(idEdicao);
    campoUnidade.disabled = salvando || Boolean(idEdicao);
    campoUnidadeOutra.disabled = salvando || Boolean(idEdicao);
    campoCategoria.disabled = salvando || Boolean(idEdicao);
    campoCategoriaOutra.disabled = salvando || Boolean(idEdicao);
    campoQuantidadeCadastro.disabled = salvando;
  }

  function definirTextoBotaoSalvar() {
    if (!btnSalvar) {
      return;
    }

    btnSalvar.textContent = idEdicao ? "Salvar alterações" : "Salvar item";
    campoNome.disabled = Boolean(idEdicao);
    campoUnidade.disabled = Boolean(idEdicao);
    campoUnidadeOutra.disabled = Boolean(idEdicao);
    campoCategoria.disabled = Boolean(idEdicao);
    campoCategoriaOutra.disabled = Boolean(idEdicao);
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