document.addEventListener("DOMContentLoaded", function () {
  const CHAVE_ESTOQUE = "controleComprasEstoque";
  const CHAVE_MOVIMENTACOES_ESTOQUE = "controleComprasMovimentacoesEstoque";
  const CHAVE_CATEGORIAS = "controleComprasCategorias";

  const estoqueForm = document.getElementById("estoque-form");
  const estoqueTabela = document.getElementById("estoque-tabela");
  const templateLinhaEstoque = document.getElementById("template-linha-estoque");
  const contadorItensEstoque = document.getElementById("contador-itens-estoque");

  const campoNome = document.getElementById("item-nome");
  const campoQuantidadeCadastro = document.getElementById("item-quantidade");

  const campoUnidade = document.getElementById("item-unidade");
  const campoUnidadeOutraWrapper = document.getElementById("campo-unidade-outra-wrapper");
  const campoUnidadeOutra = document.getElementById("campo-unidade-outra");

  const campoCategoria = document.getElementById("item-categoria");
  const campoCategoriaOutraWrapper = document.getElementById("campo-categoria-outra-wrapper");
  const campoCategoriaOutra = document.getElementById("campo-categoria-outra");

  const campoMensagem = document.getElementById("estoque-mensagem");
  const modalElement = document.getElementById("modalAdicionarItem");

  const filtroItemEstoque = document.getElementById("filtro-item-estoque");
  const filtroCategoriaEstoque = document.getElementById("filtro-categoria-estoque");
  const ordenacaoEstoque = document.getElementById("ordenacao-estoque");
  const resumoFiltrosEstoque = document.getElementById("resumo-filtros-estoque");
  const btnLimparFiltrosEstoque = document.getElementById("btn-limpar-filtros-estoque");

  const ordenarColunaItem = document.getElementById("ordenar-coluna-item-estoque");
  const ordenarColunaQuantidade = document.getElementById("ordenar-coluna-quantidade-estoque");
  const ordenarColunaCategoria = document.getElementById("ordenar-coluna-categoria-estoque");

  const modalItemRepetidoElement = document.getElementById("modalItemRepetido");
  const btnCancelarItemRepetido = document.getElementById("btn-cancelar-item-repetido");
  const btnEditarItemRepetido = document.getElementById("btn-editar-item-repetido");
  const btnSubstituirItemRepetido = document.getElementById("btn-substituir-item-repetido");

  const modalBootstrap = bootstrap.Modal.getOrCreateInstance(modalElement);
  const modalItemRepetidoBootstrap = bootstrap.Modal.getOrCreateInstance(modalItemRepetidoElement);

  let indiceEdicao = null;
  let itemPendente = null;
  let indiceItemRepetido = null;

  let itensEstoque = carregarEstoqueNormalizado();

  let filtrosAtivos = {
    item: "",
    categoria: ""
  };

  let estadoOrdenacao = {
    campo: "item",
    direcao: "asc"
  };

  sincronizarOrdenacaoComSelect();
  popularCategoriasDinamicas();
  renderizarTabela();

  modalElement.addEventListener("hidden.bs.modal", function () {
    limparFormulario();
    campoMensagem.textContent = "";
    indiceEdicao = null;
    itemPendente = null;
    indiceItemRepetido = null;
  });

  campoUnidade.addEventListener("change", function () {
    alternarCampoOutro(campoUnidade, campoUnidadeOutraWrapper, campoUnidadeOutra);
  });

  campoCategoria.addEventListener("change", function () {
    alternarCampoCategoriaNova();
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

  if (btnLimparFiltrosEstoque) {
    btnLimparFiltrosEstoque.addEventListener("click", function () {
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

  configurarOrdenacaoPorCabecalho(ordenarColunaItem, "item");
  configurarOrdenacaoPorCabecalho(ordenarColunaQuantidade, "quantidade");
  configurarOrdenacaoPorCabecalho(ordenarColunaCategoria, "categoria");

  estoqueForm.addEventListener("submit", function (event) {
    event.preventDefault();
    campoMensagem.textContent = "";

    const nome = campoNome.value.trim();
    const quantidade = normalizarNumero(campoQuantidadeCadastro.value);

    let unidade = campoUnidade.value;
    if (unidade === "outro(s)") {
      unidade = campoUnidadeOutra.value.trim();
    }

    let categoria = campoCategoria.value;
    if (categoria === "__nova__") {
      categoria = campoCategoriaOutra.value.trim();
    }

    if (!nome || !unidade || Number.isNaN(quantidade)) {
      campoMensagem.textContent = "Preencha todos os campos corretamente.";
      return;
    }

    if (quantidade < 0) {
      campoMensagem.textContent = "A quantidade não pode ser negativa.";
      return;
    }

    categoria = normalizarNomeCategoria(categoria);

    const novoItem = {
      nome: nome,
      unidade: unidade,
      quantidade: quantidade,
      categoria: categoria
    };

    if (indiceEdicao !== null) {
      const itemAnterior = itensEstoque[indiceEdicao];
      const quantidadeAnterior = Number(itemAnterior.quantidade) || 0;

      const indiceDuplicado = itensEstoque.findIndex(function (item, indice) {
        if (indice === indiceEdicao) {
          return false;
        }

        return (
          normalizarTexto(item.nome) === normalizarTexto(novoItem.nome) &&
          normalizarTexto(item.unidade) === normalizarTexto(novoItem.unidade)
        );
      });

      if (indiceDuplicado !== -1) {
        itemPendente = novoItem;
        indiceItemRepetido = indiceDuplicado;
        modalItemRepetidoBootstrap.show();
        return;
      }

      itensEstoque[indiceEdicao] = novoItem;
      persistirCategoriasDoItem(novoItem);

      if (
        houveMudancaRelevante(itemAnterior, novoItem) ||
        quantidadeAnterior !== Number(novoItem.quantidade)
      ) {
        registrarMovimentacaoEstoque("edicao", novoItem, quantidadeAnterior, novoItem.quantidade);
      }

      indiceEdicao = null;
      salvarEstoque();
      popularCategoriasDinamicas();
      renderizarTabela();
      limparFormulario();
      modalBootstrap.hide();
      return;
    }

    const indiceExistente = itensEstoque.findIndex(function (item) {
      return (
        normalizarTexto(item.nome) === normalizarTexto(novoItem.nome) &&
        normalizarTexto(item.unidade) === normalizarTexto(novoItem.unidade)
      );
    });

    if (indiceExistente !== -1) {
      itemPendente = novoItem;
      indiceItemRepetido = indiceExistente;
      modalItemRepetidoBootstrap.show();
      return;
    }

    itensEstoque.push(novoItem);
    persistirCategoriasDoItem(novoItem);
    registrarMovimentacaoEstoque("cadastro", novoItem, 0, novoItem.quantidade);

    salvarEstoque();
    popularCategoriasDinamicas();
    renderizarTabela();

    limparFormulario();
    modalBootstrap.hide();
  });

  btnCancelarItemRepetido.addEventListener("click", function () {
    itemPendente = null;
    indiceItemRepetido = null;
    campoMensagem.textContent = "Operação cancelada.";
    modalItemRepetidoBootstrap.hide();
  });

  btnSubstituirItemRepetido.addEventListener("click", function () {
    if (indiceItemRepetido === null || !itemPendente) {
      return;
    }

    const quantidadeAnterior = Number(itensEstoque[indiceItemRepetido].quantidade) || 0;
    itensEstoque[indiceItemRepetido] = itemPendente;

    persistirCategoriasDoItem(itemPendente);
    registrarMovimentacaoEstoque(
      "substituicao",
      itemPendente,
      quantidadeAnterior,
      itemPendente.quantidade
    );

    salvarEstoque();
    popularCategoriasDinamicas();
    renderizarTabela();

    itemPendente = null;
    indiceItemRepetido = null;
    indiceEdicao = null;

    modalItemRepetidoBootstrap.hide();
    modalBootstrap.hide();
    limparFormulario();
  });

  btnEditarItemRepetido.addEventListener("click", function () {
    if (indiceItemRepetido === null) {
      return;
    }

    preencherFormulario(itensEstoque[indiceItemRepetido]);
    indiceEdicao = indiceItemRepetido;

    itemPendente = null;
    indiceItemRepetido = null;
    modalItemRepetidoBootstrap.hide();
    modalBootstrap.show();
  });

  function carregarEstoque() {
    const dadosSalvos = localStorage.getItem(CHAVE_ESTOQUE);

    if (!dadosSalvos) {
      return [];
    }

    try {
      const dados = JSON.parse(dadosSalvos);
      return Array.isArray(dados) ? dados : [];
    } catch (erro) {
      console.error("Erro ao carregar estoque:", erro);
      return [];
    }
  }

  function carregarEstoqueNormalizado() {
    return carregarEstoque().map(function (item) {
      return {
        nome: String(item.nome || "").trim(),
        unidade: String(item.unidade || "").trim(),
        quantidade: Number(item.quantidade) || 0,
        categoria: normalizarNomeCategoria(item.categoria || "")
      };
    });
  }

  function salvarEstoque() {
    localStorage.setItem(CHAVE_ESTOQUE, JSON.stringify(itensEstoque));
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

  function salvarMovimentacoesEstoque(movimentacoes) {
    localStorage.setItem(CHAVE_MOVIMENTACOES_ESTOQUE, JSON.stringify(movimentacoes));
  }

  function registrarMovimentacaoEstoque(tipo, item, quantidadeAnterior, quantidadeNova) {
    const anterior = Number(quantidadeAnterior) || 0;
    const nova = Number(quantidadeNova) || 0;
    const variacao = nova - anterior;

    const movimentacoes = carregarMovimentacoesEstoque();

    movimentacoes.push({
      data: new Date().toISOString(),
      tipo: tipo,
      nome: item.nome,
      unidade: item.unidade,
      categoria: normalizarNomeCategoria(item.categoria || ""),
      quantidadeAnterior: anterior,
      quantidadeNova: nova,
      variacao: variacao,
      saldoResultante: nova
    });

    salvarMovimentacoesEstoque(movimentacoes);
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

  function salvarCategorias(categorias) {
    localStorage.setItem(CHAVE_CATEGORIAS, JSON.stringify(categorias));
  }

  function persistirCategoriasDoItem(item) {
    const categoria = normalizarNomeCategoria(item && item.categoria ? item.categoria : "");

    if (!categoria) {
      return;
    }

    const categoriasAtuais = carregarCategoriasSalvas();
    const existe = categoriasAtuais.some(function (categoriaAtual) {
      return normalizarTexto(categoriaAtual) === normalizarTexto(categoria);
    });

    if (!existe) {
      categoriasAtuais.push(categoria);
      categoriasAtuais.sort(function (a, b) {
        return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
      });
      salvarCategorias(categoriasAtuais);
    }
  }

  function obterCategoriasDinamicas() {
    const categoriasSet = new Set();

    carregarCategoriasSalvas().forEach(function (categoria) {
      const valor = normalizarNomeCategoria(categoria);
      if (valor) {
        categoriasSet.add(valor);
      }
    });

    itensEstoque.forEach(function (item) {
      const valor = normalizarNomeCategoria(item.categoria || "");
      if (valor) {
        categoriasSet.add(valor);
      }
    });

    return Array.from(categoriasSet).sort(function (a, b) {
      return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
    });
  }

  function popularCategoriasDinamicas() {
    const categorias = obterCategoriasDinamicas();
    const valorAtualCategoria = campoCategoria ? campoCategoria.value : "";
    const valorAtualFiltro = filtroCategoriaEstoque ? filtroCategoriaEstoque.value : "";

    if (campoCategoria) {
      campoCategoria.innerHTML = "";
      campoCategoria.appendChild(criarOption("", "Selecione a categoria"));
      categorias.forEach(function (categoria) {
        campoCategoria.appendChild(criarOption(categoria, categoria));
      });
      campoCategoria.appendChild(criarOption("__nova__", "Nova categoria"));

      if (
        valorAtualCategoria &&
        Array.from(campoCategoria.options).some(function (option) {
          return option.value === valorAtualCategoria;
        })
      ) {
        campoCategoria.value = valorAtualCategoria;
      } else {
        campoCategoria.value = "";
      }

      alternarCampoCategoriaNova();
    }

    if (filtroCategoriaEstoque) {
      filtroCategoriaEstoque.innerHTML = "";
      filtroCategoriaEstoque.appendChild(criarOption("", "Todas as categorias"));

      categorias.forEach(function (categoria) {
        filtroCategoriaEstoque.appendChild(criarOption(categoria, categoria));
      });

      if (
        valorAtualFiltro &&
        Array.from(filtroCategoriaEstoque.options).some(function (option) {
          return option.value === valorAtualFiltro;
        })
      ) {
        filtroCategoriaEstoque.value = valorAtualFiltro;
      } else {
        filtroCategoriaEstoque.value = "";
        filtrosAtivos.categoria = "";
      }
    }
  }

  function criarOption(valor, texto) {
    const option = document.createElement("option");
    option.value = valor;
    option.textContent = texto;
    return option;
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
  }

  function renderizarTabela() {
    estoqueTabela.innerHTML = "";

    const itensFiltrados = aplicarFiltros(itensEstoque);
    const itensOrdenados = aplicarOrdenacao(itensFiltrados);

    atualizarResumoFiltros();
    atualizarIndicadoresOrdenacao();
    atualizarContadorItens(itensOrdenados.length);

    if (itensOrdenados.length === 0) {
      const haItensCadastrados = itensEstoque.length > 0;

      estoqueTabela.innerHTML = `
        <tr id="estoque-estado-vazio">
          <td colspan="5" class="text-center text-muted empty-state">
            ${haItensCadastrados ? "Nenhum item corresponde aos filtros aplicados." : "Nenhum item cadastrado até o momento."}
          </td>
        </tr>
      `;
      return;
    }

    itensOrdenados.forEach(function (item) {
      estoqueTabela.appendChild(criarLinhaTabela(item));
    });
  }

  function criarLinhaTabela(item) {
    const indiceReal = encontrarIndiceRealDoItem(item);
    let linha = null;

    if (templateLinhaEstoque) {
      const fragmento = templateLinhaEstoque.content.cloneNode(true);
      linha = fragmento.querySelector("tr");
    } else {
      linha = document.createElement("tr");
      linha.innerHTML = `
        <td class="cell-acoes">
          <div class="d-flex gap-2 flex-wrap">
            <button type="button" class="btn btn-outline-primary btn-sm btn-editar-estoque">Editar</button>
            <button type="button" class="btn btn-outline-danger btn-sm btn-excluir-estoque">Excluir</button>
          </div>
        </td>
        <td class="item-nome"></td>
        <td class="item-unidade"></td>
        <td class="item-quantidade cell-quantidade"></td>
        <td class="item-categoria"></td>
      `;
    }

    linha.classList.add("item-row");
    linha.dataset.item = normalizarTexto(item.nome);
    linha.dataset.categoria = normalizarTexto(item.categoria);
    linha.dataset.quantidade = String(Number(item.quantidade) || 0);
    linha.dataset.unidade = normalizarTexto(item.unidade);

    if (Number(item.quantidade) === 0) {
      linha.classList.add("is-zero", "status-danger");
    }

    if (Number(item.quantidade) > 0 && Number(item.quantidade) <= 1) {
      linha.classList.add("is-baixo");
    }

    preencherLinhaTabela(linha, item, indiceReal);
    return linha;
  }

  function preencherLinhaTabela(linha, item, indiceReal) {
    const celulaNome = linha.querySelector(".item-nome");
    const celulaUnidade = linha.querySelector(".item-unidade");
    const celulaQuantidade = linha.querySelector(".item-quantidade");
    const celulaCategoria = linha.querySelector(".item-categoria");

    if (celulaNome) {
      celulaNome.textContent = item.nome;
    }

    if (celulaUnidade) {
      celulaUnidade.textContent = item.unidade;
    }

    if (celulaQuantidade) {
      celulaQuantidade.innerHTML = `
        <div class="d-flex align-items-center gap-2">
          <button type="button" class="btn btn-sm btn-outline-secondary btn-diminuir-estoque">
            -
          </button>

          <input
            type="text"
            inputmode="decimal"
            class="form-control form-control-sm campo-quantidade"
            value="${escaparAtributo(formatarValorCampo(item.quantidade))}"
          >

          <button type="button" class="btn btn-sm btn-outline-secondary btn-aumentar-estoque">
            +
          </button>
        </div>
      `;
    }

    if (celulaCategoria) {
      celulaCategoria.innerHTML = item.categoria
        ? `<span class="badge-categoria">${escaparHtml(item.categoria)}</span>`
        : "—";
    }

    const botaoEditar = linha.querySelector(".btn-editar-estoque");
    const botaoExcluir = linha.querySelector(".btn-excluir-estoque");
    const botaoDiminuir = linha.querySelector(".btn-diminuir-estoque");
    const botaoAumentar = linha.querySelector(".btn-aumentar-estoque");
    const campoQuantidade = linha.querySelector(".campo-quantidade");

    if (botaoEditar) {
      botaoEditar.addEventListener("click", function () {
        if (indiceReal < 0) {
          return;
        }

        preencherFormulario(itensEstoque[indiceReal]);
        indiceEdicao = indiceReal;
        campoMensagem.textContent = "";
        modalBootstrap.show();
      });
    }

    if (botaoExcluir) {
      botaoExcluir.addEventListener("click", function () {
        if (indiceReal < 0) {
          return;
        }

        const desejaRemover = confirm("Deseja remover este item do estoque?");
        if (!desejaRemover) {
          return;
        }

        const itemRemovido = itensEstoque[indiceReal];
        registrarMovimentacaoEstoque("remocao", itemRemovido, itemRemovido.quantidade, 0);

        itensEstoque.splice(indiceReal, 1);
        salvarEstoque();
        popularCategoriasDinamicas();
        renderizarTabela();
      });
    }

    if (botaoDiminuir) {
      botaoDiminuir.addEventListener("click", function () {
        if (indiceReal < 0) {
          return;
        }

        const quantidadeAnterior = Number(itensEstoque[indiceReal].quantidade) || 0;
        const quantidadeNova = Math.max(0, quantidadeAnterior - 1);

        if (quantidadeNova === quantidadeAnterior) {
          return;
        }

        itensEstoque[indiceReal].quantidade = quantidadeNova;
        registrarMovimentacaoEstoque("ajuste", itensEstoque[indiceReal], quantidadeAnterior, quantidadeNova);
        salvarEstoque();
        renderizarTabela();
      });
    }

    if (botaoAumentar) {
      botaoAumentar.addEventListener("click", function () {
        if (indiceReal < 0) {
          return;
        }

        const quantidadeAnterior = Number(itensEstoque[indiceReal].quantidade) || 0;
        const quantidadeNova = quantidadeAnterior + 1;

        if (quantidadeNova === quantidadeAnterior) {
          return;
        }

        itensEstoque[indiceReal].quantidade = quantidadeNova;
        registrarMovimentacaoEstoque("ajuste", itensEstoque[indiceReal], quantidadeAnterior, quantidadeNova);
        salvarEstoque();
        renderizarTabela();
      });
    }

    if (campoQuantidade) {
      campoQuantidade.addEventListener("change", function () {
        if (indiceReal < 0) {
          return;
        }

        const quantidadeAnterior = Number(itensEstoque[indiceReal].quantidade) || 0;
        let quantidadeNova = normalizarNumero(campoQuantidade.value);

        if (Number.isNaN(quantidadeNova) || quantidadeNova < 0) {
          quantidadeNova = 0;
        }

        if (quantidadeNova === quantidadeAnterior) {
          renderizarTabela();
          return;
        }

        itensEstoque[indiceReal].quantidade = quantidadeNova;
        registrarMovimentacaoEstoque("ajuste", itensEstoque[indiceReal], quantidadeAnterior, quantidadeNova);
        salvarEstoque();
        renderizarTabela();
      });
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

      if (estadoOrdenacao.campo === "item") {
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

    resumoFiltrosEstoque.innerHTML = "";

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
    botao.innerHTML = "&times;";
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

  function encontrarIndiceRealDoItem(itemOrdenado) {
    return itensEstoque.findIndex(function (itemOriginal) {
      return (
        normalizarTexto(itemOriginal.nome) === normalizarTexto(itemOrdenado.nome) &&
        normalizarTexto(itemOriginal.unidade) === normalizarTexto(itemOrdenado.unidade) &&
        normalizarTexto(itemOriginal.categoria) === normalizarTexto(itemOrdenado.categoria) &&
        Number(itemOriginal.quantidade) === Number(itemOrdenado.quantidade)
      );
    });
  }

  function houveMudancaRelevante(itemAnterior, itemNovo) {
    return (
      normalizarTexto(itemAnterior.nome) !== normalizarTexto(itemNovo.nome) ||
      normalizarTexto(itemAnterior.unidade) !== normalizarTexto(itemNovo.unidade) ||
      normalizarTexto(itemAnterior.categoria || "") !== normalizarTexto(itemNovo.categoria || "")
    );
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

    if (Number.isInteger(numero)) {
      return String(numero);
    }

    return String(numero).replace(".", ",");
  }

  function escaparHtml(valor) {
    return String(valor || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escaparAtributo(valor) {
    return escaparHtml(valor);
  }
});
