document.addEventListener("DOMContentLoaded", function () {
  const CHAVE_ESTOQUE = "controleComprasEstoque";
  const CHAVE_CATEGORIAS = "controleComprasCategorias";
  const CHAVE_LISTA_COMPRAR = "controleComprasListaComprar";

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

  const filtroItemLista = document.getElementById("filtro-item-lista");
  const filtroCategoriaLista = document.getElementById("filtro-categoria-lista");
  const ordenacaoLista = document.getElementById("ordenacao-lista");
  const resumoFiltrosLista = document.getElementById("resumo-filtros-lista");
  const btnLimparFiltrosLista = document.getElementById("btn-limpar-filtros-lista");

  const ordenarColunaComprar = document.getElementById("ordenar-coluna-comprar-lista");
  const ordenarColunaItem = document.getElementById("ordenar-coluna-item-lista");
  const ordenarColunaQuantidade = document.getElementById("ordenar-coluna-quantidade-lista");
  const ordenarColunaCategoria = document.getElementById("ordenar-coluna-categoria-lista");

  const modalBootstrap = modalElement
    ? bootstrap.Modal.getOrCreateInstance(modalElement)
    : null;

  let itensEstoque = carregarEstoqueNormalizado();
  let mapaComprar = carregarMapaComprar();

  let filtrosAtivos = {
    item: "",
    categoria: ""
  };

  let estadoOrdenacao = {
    campo: "comprar",
    direcao: "desc"
  };

  if (!listaTabela) {
    return;
  }

  sincronizarOrdenacaoComSelect();
  popularCategoriasDinamicas();
  sincronizarMapaComprarComEstoque();
  renderizarTabela();

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

  if (modalElement) {
    modalElement.addEventListener("hidden.bs.modal", function () {
      limparFormulario();
      if (campoMensagem) {
        campoMensagem.textContent = "";
      }
    });
  }

  if (listaForm) {
    listaForm.addEventListener("submit", function (event) {
      event.preventDefault();

      if (campoMensagem) {
        campoMensagem.textContent = "";
      }

      const nome = campoNome ? campoNome.value.trim() : "";
      let unidade = campoUnidade ? campoUnidade.value : "";
      let categoria = campoCategoria ? campoCategoria.value : "";

      if (unidade === "outro(s)") {
        unidade = campoUnidadeOutra ? campoUnidadeOutra.value.trim() : "";
      }

      if (categoria === "__nova__") {
        categoria = campoCategoriaOutra ? campoCategoriaOutra.value.trim() : "";
      }

      if (!nome || !unidade) {
        if (campoMensagem) {
          campoMensagem.textContent = "Preencha todos os campos corretamente.";
        }
        return;
      }

      categoria = normalizarNomeCategoria(categoria);

      const indiceExistente = itensEstoque.findIndex(function (item) {
        return (
          normalizarTexto(item.nome) === normalizarTexto(nome) &&
          normalizarTexto(item.unidade) === normalizarTexto(unidade)
        );
      });

      if (indiceExistente !== -1) {
        if (campoMensagem) {
          campoMensagem.textContent = "Este item já existe na lista.";
        }
        return;
      }

      const novoItem = {
        nome: nome,
        unidade: unidade,
        quantidade: 0,
        categoria: categoria
      };

      itensEstoque.push(novoItem);
      persistirCategoriasDoItem(novoItem);

      const chave = criarChaveItem(novoItem);
      mapaComprar[chave] = true;

      salvarEstoque();
      salvarMapaComprar();

      popularCategoriasDinamicas();
      sincronizarMapaComprarComEstoque();
      renderizarTabela();

      limparFormulario();

      if (modalBootstrap) {
        modalBootstrap.hide();
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

  function carregarMapaComprar() {
    const dadosSalvos = localStorage.getItem(CHAVE_LISTA_COMPRAR);

    if (!dadosSalvos) {
      return {};
    }

    try {
      const dados = JSON.parse(dadosSalvos);
      return dados && typeof dados === "object" && !Array.isArray(dados) ? dados : {};
    } catch (erro) {
      console.error("Erro ao carregar mapa de compra:", erro);
      return {};
    }
  }

  function salvarMapaComprar() {
    localStorage.setItem(CHAVE_LISTA_COMPRAR, JSON.stringify(mapaComprar));
  }

  function sincronizarMapaComprarComEstoque() {
    const novoMapa = {};

    itensEstoque.forEach(function (item) {
      const chave = criarChaveItem(item);
      const quantidade = Number(item.quantidade) || 0;

      if (Object.prototype.hasOwnProperty.call(mapaComprar, chave)) {
        novoMapa[chave] = Boolean(mapaComprar[chave]);
      } else {
        novoMapa[chave] = quantidade <= 0;
      }
    });

    mapaComprar = novoMapa;
    salvarMapaComprar();
  }

  function itemMarcadoParaCompra(item) {
    const chave = criarChaveItem(item);

    if (Object.prototype.hasOwnProperty.call(mapaComprar, chave)) {
      return Boolean(mapaComprar[chave]);
    }

    return (Number(item.quantidade) || 0) <= 0;
  }

  function definirStatusComprar(item, valor) {
    const chave = criarChaveItem(item);
    mapaComprar[chave] = Boolean(valor);
    salvarMapaComprar();
  }

  function criarChaveItem(item) {
    return [
      normalizarTexto(item.nome),
      normalizarTexto(item.unidade)
    ].join("||");
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
    const valorAtualFiltro = filtroCategoriaLista ? filtroCategoriaLista.value : "";

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

    if (filtroCategoriaLista) {
      filtroCategoriaLista.innerHTML = "";
      filtroCategoriaLista.appendChild(criarOption("", "Todas as categorias"));

      categorias.forEach(function (categoria) {
        filtroCategoriaLista.appendChild(criarOption(categoria, categoria));
      });

      if (
        valorAtualFiltro &&
        Array.from(filtroCategoriaLista.options).some(function (option) {
          return option.value === valorAtualFiltro;
        })
      ) {
        filtroCategoriaLista.value = valorAtualFiltro;
      } else {
        filtroCategoriaLista.value = "";
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

  function limparFormulario() {
    if (!listaForm) {
      return;
    }

    listaForm.reset();

    if (campoNome) {
      campoNome.value = "";
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
  }

  function renderizarTabela() {
    listaTabela.innerHTML = "";

    itensEstoque = carregarEstoqueNormalizado();
    sincronizarMapaComprarComEstoque();

    const itensFiltrados = aplicarFiltros(itensEstoque);
    const itensOrdenados = aplicarOrdenacao(itensFiltrados);

    atualizarResumoFiltros();
    atualizarIndicadoresOrdenacao();
    atualizarContadorItens(itensOrdenados.length);

    if (itensOrdenados.length === 0) {
      const haItens = itensEstoque.length > 0;

      listaTabela.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted empty-state">
            ${haItens ? "Nenhum item corresponde aos filtros aplicados." : "Nenhum item disponível na lista até o momento."}
          </td>
        </tr>
      `;
      return;
    }

    itensOrdenados.forEach(function (item) {
      listaTabela.appendChild(criarLinhaTabela(item));
    });
  }

  function criarLinhaTabela(item) {
    const indiceReal = encontrarIndiceRealDoItem(item);
    const marcadoComprar = itemMarcadoParaCompra(item);

    let linha = null;

    if (templateLinhaLista) {
      const fragmento = templateLinhaLista.content.cloneNode(true);
      linha = fragmento.querySelector("tr");
    } else {
      linha = document.createElement("tr");
      linha.innerHTML = `
        <td class="cell-checkbox"></td>
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

    preencherLinhaTabela(linha, item, indiceReal, marcadoComprar);
    return linha;
  }

  function preencherLinhaTabela(linha, item, indiceReal, marcadoComprar) {
    const celulaCheckbox = linha.children[0] || linha.querySelector(".cell-checkbox");
    const celulaNome = linha.querySelector(".item-nome") || linha.children[1];
    const celulaUnidade = linha.querySelector(".item-unidade") || linha.children[2];
    const celulaQuantidade = linha.querySelector(".item-quantidade") || linha.children[3];
    const celulaCategoria = linha.querySelector(".item-categoria") || linha.children[4];

    if (celulaCheckbox) {
      const idCheckbox = "lista-comprar-" + Math.random().toString(36).slice(2, 10);

      celulaCheckbox.innerHTML = `
        <input
          type="checkbox"
          class="form-check-input checkbox-comprar lista-checkbox-comprar"
          id="${idCheckbox}"
          ${marcadoComprar ? "checked" : ""}
          aria-label="Marcar ${escaparAtributo(item.nome)} para compra"
        >
      `;
    }

    if (celulaNome) {
      celulaNome.textContent = item.nome;
      celulaNome.classList.add("item-nome");
    }

    if (celulaUnidade) {
      celulaUnidade.textContent = item.unidade;
      celulaUnidade.classList.add("item-unidade");
    }

    if (celulaQuantidade) {
      celulaQuantidade.textContent = formatarNumero(item.quantidade);
      celulaQuantidade.classList.add("item-quantidade", "cell-quantidade");
    }

    if (celulaCategoria) {
      celulaCategoria.classList.add("item-categoria");
      celulaCategoria.innerHTML = item.categoria
        ? `<span class="badge-categoria">${escaparHtml(item.categoria)}</span>`
        : "—";
    }

    const checkboxComprar = linha.querySelector(".lista-checkbox-comprar");

    if (checkboxComprar) {
      checkboxComprar.addEventListener("change", function () {
        if (indiceReal < 0) {
          return;
        }

        definirStatusComprar(itensEstoque[indiceReal], checkboxComprar.checked);
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

      if (estadoOrdenacao.campo === "comprar") {
        comparacao = compararNumero(
          itemMarcadoParaCompra(a) ? 1 : 0,
          itemMarcadoParaCompra(b) ? 1 : 0
        );
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

  function sincronizarOrdenacaoPeloSelect() {
    if (!ordenacaoLista) {
      return;
    }

    const valor = ordenacaoLista.value || "comprar-desc";
    const partes = valor.split("-");

    estadoOrdenacao.campo = partes[0] || "comprar";
    estadoOrdenacao.direcao = partes[1] || "desc";
  }

  function sincronizarOrdenacaoComSelect() {
    if (!ordenacaoLista) {
      return;
    }

    ordenacaoLista.value = `${estadoOrdenacao.campo}-${estadoOrdenacao.direcao}`;
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
        ativo ? (estadoOrdenacao.direcao === "asc" ? "ascending" : "descending") : "none"
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

    resumoFiltrosLista.innerHTML = "";

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
    botao.innerHTML = "&times;";
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

  function formatarNumero(valor) {
    return Number(valor).toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
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

  function escaparAtributo(valor) {
    return escaparHtml(valor);
  }
});
