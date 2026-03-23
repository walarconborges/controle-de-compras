document.addEventListener("DOMContentLoaded", function () {
  const CHAVE_COMPRA = "controleComprasCompraAtual";
  const CHAVE_ESTOQUE = "controleComprasEstoque";
  const CHAVE_HISTORICO_COMPRAS = "controleComprasHistoricoCompras";
  const CHAVE_MOVIMENTACOES_ESTOQUE = "controleComprasMovimentacoesEstoque";
  const CHAVE_CATEGORIAS = "controleComprasCategorias";

  const compraForm = document.getElementById("compra-form");
  const compraTabela = document.getElementById("compra-tabela");
  const totalCompra = document.getElementById("total-compra");
  const contadorItensCompra = document.getElementById("contador-itens-compra");
  const templateLinhaCompra = document.getElementById("template-linha-compra");

  const campoItem = document.getElementById("compra-item");
  const sugestoesCompra = document.getElementById("sugestoes-compra");
  const campoCategoria = document.getElementById("compra-categoria");
  const campoNovaCategoriaWrapper = document.getElementById("campo-compra-nova-categoria-wrapper");
  const campoNovaCategoria = document.getElementById("campo-compra-nova-categoria");

  const campoQuantidade = document.getElementById("compra-quantidade");
  const campoValorUnitario = document.getElementById("compra-valor-unitario");

  const campoUnidade = document.getElementById("compra-unidade");
  const campoUnidadeOutraWrapper = document.getElementById("campo-compra-unidade-outra-wrapper");
  const campoUnidadeOutra = document.getElementById("campo-compra-unidade-outra");

  const campoMensagem = document.getElementById("compra-mensagem");
  const modalElement = document.getElementById("modalAdicionarCompra");
  const btnFinalizarCompra = document.getElementById("btn-finalizar-compra");

  const filtroItemCompra = document.getElementById("filtro-item-compra");
  const filtroCategoriaCompra = document.getElementById("filtro-categoria-compra");
  const ordenacaoCompra = document.getElementById("ordenacao-compra");
  const resumoFiltrosCompra = document.getElementById("resumo-filtros-compra");
  const btnLimparFiltrosCompra = document.getElementById("btn-limpar-filtros-compra");

  const ordenarColunaItem = document.getElementById("ordenar-coluna-item-compra");
  const ordenarColunaQuantidade = document.getElementById("ordenar-coluna-quantidade-compra");
  const ordenarColunaCategoria = document.getElementById("ordenar-coluna-categoria-compra");

  const modalItemRepetidoElement = document.getElementById("modalItemRepetidoCompra");
  const btnCancelarItemRepetido = document.getElementById("btn-cancelar-item-repetido-compra");
  const btnEditarItemRepetido = document.getElementById("btn-editar-item-repetido-compra");
  const btnSubstituirItemRepetido = document.getElementById("btn-substituir-item-repetido-compra");

  const modalBootstrap = bootstrap.Modal.getOrCreateInstance(modalElement);
  const modalItemRepetidoBootstrap = bootstrap.Modal.getOrCreateInstance(modalItemRepetidoElement);

  let itensCompra = carregarCompraNormalizada();
  let indiceEdicao = null;
  let itemPendente = null;
  let indiceItemRepetido = null;

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

  campoItem.addEventListener("input", function () {
    atualizarCategoriaPeloNomeDigitado();
    renderizarSugestoesDoEstoque();
  });

  campoItem.addEventListener("blur", function () {
    setTimeout(function () {
      limparSugestoes();
    }, 150);
  });

  filtroItemCompra.addEventListener("input", function () {
    filtrosAtivos.item = filtroItemCompra.value.trim();
    renderizarTabela();
  });

  filtroCategoriaCompra.addEventListener("change", function () {
    filtrosAtivos.categoria = filtroCategoriaCompra.value;
    renderizarTabela();
  });

  ordenacaoCompra.addEventListener("change", function () {
    sincronizarOrdenacaoPeloSelect();
    renderizarTabela();
  });

  btnLimparFiltrosCompra.addEventListener("click", function () {
    filtrosAtivos.item = "";
    filtrosAtivos.categoria = "";
    filtroItemCompra.value = "";
    filtroCategoriaCompra.value = "";
    renderizarTabela();
  });

  configurarOrdenacaoPorCabecalho(ordenarColunaItem, "item");
  configurarOrdenacaoPorCabecalho(ordenarColunaQuantidade, "quantidade");
  configurarOrdenacaoPorCabecalho(ordenarColunaCategoria, "categoria");

  compraForm.addEventListener("submit", function (event) {
    event.preventDefault();
    campoMensagem.textContent = "";

    const nome = campoItem.value.trim();
    const quantidade = normalizarNumero(campoQuantidade.value);
    const valorUnitario = normalizarNumero(campoValorUnitario.value);

    let unidade = campoUnidade.value;
    if (unidade === "outro(s)") {
      unidade = campoUnidadeOutra.value.trim();
    }

    let categoria = campoCategoria.value;
    if (categoria === "__nova__") {
      categoria = campoNovaCategoria.value.trim();
    }

    if (
      !nome ||
      !unidade ||
      !categoria ||
      Number.isNaN(quantidade) ||
      Number.isNaN(valorUnitario)
    ) {
      campoMensagem.textContent = "Preencha todos os campos corretamente.";
      return;
    }

    if (quantidade <= 0 || valorUnitario < 0) {
      campoMensagem.textContent = "Quantidade deve ser maior que zero e o valor não pode ser negativo.";
      return;
    }

    categoria = normalizarNomeCategoria(categoria);

    const novoItem = {
      nome: nome,
      quantidade: quantidade,
      unidade: unidade,
      valorUnitario: valorUnitario,
      categoria: categoria
    };

    const indiceExistente = itensCompra.findIndex(function (itemExistente, indice) {
      if (indiceEdicao !== null && indice === indiceEdicao) {
        return false;
      }

      return (
        normalizarTexto(itemExistente.nome) === normalizarTexto(nome) &&
        normalizarTexto(itemExistente.unidade) === normalizarTexto(unidade)
      );
    });

    if (indiceEdicao !== null) {
      if (indiceExistente !== -1) {
        itemPendente = novoItem;
        indiceItemRepetido = indiceExistente;
        modalItemRepetidoBootstrap.show();
        return;
      }

      itensCompra[indiceEdicao] = novoItem;
      persistirCategoriasDoItem(novoItem);
      salvarCompra();
      popularCategoriasDinamicas();
      renderizarTabela();
      indiceEdicao = null;
      limparFormularioFecharModal();
      return;
    }

    if (indiceExistente !== -1) {
      itemPendente = novoItem;
      indiceItemRepetido = indiceExistente;
      modalItemRepetidoBootstrap.show();
      return;
    }

    itensCompra.push(novoItem);
    persistirCategoriasDoItem(novoItem);
    salvarCompra();
    popularCategoriasDinamicas();
    renderizarTabela();
    limparFormularioFecharModal();
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

    itensCompra[indiceItemRepetido] = itemPendente;
    persistirCategoriasDoItem(itemPendente);
    salvarCompra();
    popularCategoriasDinamicas();
    renderizarTabela();

    itemPendente = null;
    indiceItemRepetido = null;
    indiceEdicao = null;

    modalItemRepetidoBootstrap.hide();
    limparFormularioFecharModal();
  });

  btnEditarItemRepetido.addEventListener("click", function () {
    if (!itemPendente) {
      return;
    }

    preencherFormulario(itemPendente);
    indiceEdicao = indiceItemRepetido;

    itemPendente = null;
    indiceItemRepetido = null;
    modalItemRepetidoBootstrap.hide();
    modalBootstrap.show();
  });

  btnFinalizarCompra.addEventListener("click", function () {
    campoMensagem.textContent = "";

    if (itensCompra.length === 0) {
      campoMensagem.textContent = "Não há itens para finalizar a compra.";
      return;
    }

    const estoqueAtual = carregarEstoqueNormalizado();
    const movimentacoesEstoque = carregarMovimentacoesEstoque();

    itensCompra.forEach(function (itemCompra) {
      const indiceExistenteNoEstoque = estoqueAtual.findIndex(function (itemEstoque) {
        return (
          normalizarTexto(itemEstoque.nome) === normalizarTexto(itemCompra.nome) &&
          normalizarTexto(itemEstoque.unidade) === normalizarTexto(itemCompra.unidade)
        );
      });

      if (indiceExistenteNoEstoque !== -1) {
        const itemEstoque = estoqueAtual[indiceExistenteNoEstoque];
        const quantidadeAnterior = Number(itemEstoque.quantidade) || 0;
        const quantidadeNova = quantidadeAnterior + Number(itemCompra.quantidade);

        itemEstoque.quantidade = quantidadeNova;
        itemEstoque.categoria = normalizarNomeCategoria(itemCompra.categoria || itemEstoque.categoria || "");

        movimentacoesEstoque.push(
          criarMovimentacaoEstoque(
            "entrada_compra",
            {
              nome: itemEstoque.nome,
              unidade: itemEstoque.unidade,
              categoria: itemEstoque.categoria || ""
            },
            quantidadeAnterior,
            quantidadeNova
          )
        );
      } else {
        const novoItemEstoque = {
          nome: itemCompra.nome,
          unidade: itemCompra.unidade,
          quantidade: Number(itemCompra.quantidade),
          categoria: normalizarNomeCategoria(itemCompra.categoria || "")
        };

        estoqueAtual.push(novoItemEstoque);

        movimentacoesEstoque.push(
          criarMovimentacaoEstoque(
            "entrada_compra",
            {
              nome: novoItemEstoque.nome,
              unidade: novoItemEstoque.unidade,
              categoria: novoItemEstoque.categoria || ""
            },
            0,
            novoItemEstoque.quantidade
          )
        );
      }

      persistirCategoriasDoItem(itemCompra);
    });

    salvarEstoque(estoqueAtual);
    salvarMovimentacoesEstoque(movimentacoesEstoque);

    const historicoCompras = carregarHistoricoCompras();

    const totalCompraFinalizada = itensCompra.reduce(function (total, item) {
      return total + Number(item.quantidade) * Number(item.valorUnitario);
    }, 0);

    const registroCompra = {
      data: new Date().toISOString(),
      total: totalCompraFinalizada,
      quantidadeItens: itensCompra.length,
      itens: itensCompra.map(function (item) {
        return {
          nome: item.nome,
          quantidade: Number(item.quantidade),
          unidade: item.unidade,
          valorUnitario: Number(item.valorUnitario),
          subtotal: Number(item.quantidade) * Number(item.valorUnitario),
          categoria: normalizarNomeCategoria(item.categoria || "")
        };
      })
    };

    historicoCompras.push(registroCompra);
    salvarHistoricoCompras(historicoCompras);

    itensCompra = [];
    salvarCompra();
    popularCategoriasDinamicas();
    renderizarTabela();
    campoMensagem.textContent = "Compra finalizada e estoque atualizado.";
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

  function salvarEstoque(estoque) {
    localStorage.setItem(CHAVE_ESTOQUE, JSON.stringify(estoque));
  }

  function carregarCompra() {
    const dadosSalvos = localStorage.getItem(CHAVE_COMPRA);

    if (!dadosSalvos) {
      return [];
    }

    try {
      const dados = JSON.parse(dadosSalvos);
      return Array.isArray(dados) ? dados : [];
    } catch (erro) {
      console.error("Erro ao carregar compra:", erro);
      return [];
    }
  }

  function carregarCompraNormalizada() {
    return carregarCompra().map(function (item) {
      return {
        nome: String(item.nome || "").trim(),
        quantidade: Number(item.quantidade) || 0,
        unidade: String(item.unidade || "").trim(),
        valorUnitario: Number(item.valorUnitario) || 0,
        categoria: normalizarNomeCategoria(item.categoria || "")
      };
    });
  }

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

  function salvarHistoricoCompras(historico) {
    localStorage.setItem(CHAVE_HISTORICO_COMPRAS, JSON.stringify(historico));
  }

  function salvarCompra() {
    localStorage.setItem(CHAVE_COMPRA, JSON.stringify(itensCompra));
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

  function criarMovimentacaoEstoque(tipo, item, quantidadeAnterior, quantidadeNova) {
    const anterior = Number(quantidadeAnterior) || 0;
    const nova = Number(quantidadeNova) || 0;

    return {
      data: new Date().toISOString(),
      tipo: tipo,
      nome: item.nome,
      unidade: item.unidade,
      categoria: normalizarNomeCategoria(item.categoria || ""),
      quantidadeAnterior: anterior,
      quantidadeNova: nova,
      variacao: nova - anterior,
      saldoResultante: nova
    };
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

    carregarEstoque().forEach(function (item) {
      const valor = normalizarNomeCategoria(item.categoria || "");
      if (valor) {
        categoriasSet.add(valor);
      }
    });

    itensCompra.forEach(function (item) {
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
    const valorAtualFiltro = filtroCategoriaCompra ? filtroCategoriaCompra.value : "";

    if (campoCategoria) {
      campoCategoria.innerHTML = "";
      campoCategoria.appendChild(criarOption("", "Selecione a categoria"));
      categorias.forEach(function (categoria) {
        campoCategoria.appendChild(criarOption(categoria, categoria));
      });
      campoCategoria.appendChild(criarOption("__nova__", "Nova categoria"));

      if (valorAtualCategoria && Array.from(campoCategoria.options).some(function (option) { return option.value === valorAtualCategoria; })) {
        campoCategoria.value = valorAtualCategoria;
      } else {
        campoCategoria.value = "";
      }

      alternarCampoCategoriaNova();
    }

    if (filtroCategoriaCompra) {
      filtroCategoriaCompra.innerHTML = "";
      filtroCategoriaCompra.appendChild(criarOption("", "Todas as categorias"));
      categorias.forEach(function (categoria) {
        filtroCategoriaCompra.appendChild(criarOption(categoria, categoria));
      });

      if (valorAtualFiltro && Array.from(filtroCategoriaCompra.options).some(function (option) { return option.value === valorAtualFiltro; })) {
        filtroCategoriaCompra.value = valorAtualFiltro;
      } else {
        filtroCategoriaCompra.value = "";
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

  function alternarCampoCategoriaNova() {
    if (!campoCategoria || !campoNovaCategoriaWrapper || !campoNovaCategoria) {
      return;
    }

    if (campoCategoria.value === "__nova__") {
      campoNovaCategoriaWrapper.classList.remove("d-none");
      campoNovaCategoria.required = true;
    } else {
      campoNovaCategoriaWrapper.classList.add("d-none");
      campoNovaCategoria.required = false;
      campoNovaCategoria.value = "";
    }
  }

  function renderizarTabela() {
    compraTabela.innerHTML = "";

    const itensFiltrados = aplicarFiltros(itensCompra);
    const itensOrdenados = aplicarOrdenacao(itensFiltrados);

    atualizarResumoFiltros();
    atualizarIndicadoresOrdenacao();
    atualizarContadorItens(itensOrdenados.length);

    if (itensOrdenados.length === 0) {
      const haItensCadastrados = itensCompra.length > 0;
      compraTabela.innerHTML = `
        <tr id="compra-estado-vazio">
          <td colspan="7" class="text-center text-muted empty-state">
            ${haItensCadastrados ? "Nenhum item corresponde aos filtros aplicados." : "Nenhuma compra registrada até o momento."}
          </td>
        </tr>
      `;
      atualizarTotalCompra();
      return;
    }

    itensOrdenados.forEach(function (item) {
      const linha = criarLinhaTabela(item);
      compraTabela.appendChild(linha);
    });

    atualizarTotalCompra();
  }

  function criarLinhaTabela(item) {
    const subtotal = Number(item.quantidade) * Number(item.valorUnitario);
    const indiceReal = encontrarIndiceRealDoItem(item);

    if (!templateLinhaCompra) {
      const linhaFallback = document.createElement("tr");
      linhaFallback.innerHTML = `
        <td class="cell-acoes">
          <div class="d-flex gap-2 flex-wrap">
            <button type="button" class="btn btn-outline-primary btn-sm btn-editar-compra">Editar</button>
            <button type="button" class="btn btn-outline-danger btn-sm btn-excluir-compra">Excluir</button>
          </div>
        </td>
        <td class="item-nome"></td>
        <td class="item-quantidade cell-quantidade"></td>
        <td class="item-unidade"></td>
        <td class="item-categoria"></td>
        <td class="item-valor-unitario"></td>
        <td class="item-subtotal"></td>
      `;
      preencherLinhaTabela(linhaFallback, item, subtotal, indiceReal);
      return linhaFallback;
    }

    const fragmento = templateLinhaCompra.content.cloneNode(true);
    const linha = fragmento.querySelector("tr");
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
      celulaUnidade.textContent = item.unidade;
    }

    if (celulaCategoria) {
      celulaCategoria.innerHTML = item.categoria
        ? `<span class="badge-categoria">${escaparHtml(item.categoria)}</span>`
        : "—";
    }

    if (celulaValorUnitario) {
      celulaValorUnitario.textContent = "R$ " + formatarMoeda(item.valorUnitario);
    }

    if (celulaSubtotal) {
      celulaSubtotal.textContent = "R$ " + formatarMoeda(subtotal);
    }

    const botaoEditar = linha.querySelector(".btn-editar-compra");
    const botaoExcluir = linha.querySelector(".btn-excluir-compra");

    if (botaoEditar) {
      botaoEditar.addEventListener("click", function () {
        if (indiceReal < 0) {
          return;
        }

        preencherFormulario(itensCompra[indiceReal]);
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

        const desejaRemover = confirm("Deseja remover este item da compra?");
        if (!desejaRemover) {
          return;
        }

        itensCompra.splice(indiceReal, 1);
        salvarCompra();
        popularCategoriasDinamicas();
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

  function compararTexto(a, b) {
    return String(a || "").localeCompare(String(b || ""), "pt-BR", {
      sensitivity: "base"
    });
  }

  function compararNumero(a, b) {
    return (Number(a) || 0) - (Number(b) || 0);
  }

  function sincronizarOrdenacaoPeloSelect() {
    const valor = ordenacaoCompra.value || "item-asc";
    const partes = valor.split("-");

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

      cabecalho.elemento.setAttribute("aria-sort", ativo ? (estadoOrdenacao.direcao === "asc" ? "ascending" : "descending") : "none");

      if (indicador) {
        indicador.textContent = !ativo ? "↕" : estadoOrdenacao.direcao === "asc" ? "↑" : "↓";
      }
    });
  }

  function atualizarResumoFiltros() {
    if (!resumoFiltrosCompra) {
      return;
    }

    resumoFiltrosCompra.innerHTML = "";

    if (filtrosAtivos.item) {
      resumoFiltrosCompra.appendChild(
        criarChipFiltro("Item: " + filtrosAtivos.item, function () {
          filtrosAtivos.item = "";
          filtroItemCompra.value = "";
          renderizarTabela();
        })
      );
    }

    if (filtrosAtivos.categoria) {
      resumoFiltrosCompra.appendChild(
        criarChipFiltro("Categoria: " + filtrosAtivos.categoria, function () {
          filtrosAtivos.categoria = "";
          filtroCategoriaCompra.value = "";
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

  function atualizarContadorItens(quantidadeExibida) {
    if (!contadorItensCompra) {
      return;
    }

    contadorItensCompra.textContent = `${quantidadeExibida} item(ns) exibido(s)`;
  }

  function atualizarTotalCompra() {
    const totalAcumulado = itensCompra.reduce(function (total, item) {
      return total + Number(item.quantidade) * Number(item.valorUnitario);
    }, 0);

    totalCompra.textContent = formatarMoeda(totalAcumulado);
  }

  function preencherFormulario(item) {
    campoItem.value = item.nome;
    campoQuantidade.value = formatarValorCampo(item.quantidade);
    campoValorUnitario.value = formatarValorCampo(item.valorUnitario);

    preencherSelectOuOutro(
      campoUnidade,
      campoUnidadeOutraWrapper,
      campoUnidadeOutra,
      item.unidade
    );

    preencherCampoCategoria(item.categoria || "");
    renderizarSugestoesDoEstoque();
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
      campoNovaCategoria.value = "";
    } else {
      campoCategoria.value = "__nova__";
      campoNovaCategoria.value = categoriaNormalizada;
    }

    alternarCampoCategoriaNova();
  }

  function renderizarSugestoesDoEstoque() {
    const termoDigitado = normalizarTexto(campoItem.value);
    limparSugestoes();

    if (!termoDigitado) {
      return;
    }

    const estoqueAtual = carregarEstoqueNormalizado();

    const sugestoes = estoqueAtual
      .filter(function (item) {
        return normalizarTexto(item.nome).includes(termoDigitado);
      })
      .slice(0, 5);

    if (sugestoes.length === 0) {
      return;
    }

    sugestoes.forEach(function (item) {
      const botaoSugestao = document.createElement("button");
      botaoSugestao.type = "button";
      botaoSugestao.className = "list-group-item list-group-item-action";
      botaoSugestao.textContent = `${item.nome} (${item.unidade})`;

      botaoSugestao.addEventListener("click", function () {
        campoItem.value = item.nome;

        preencherSelectOuOutro(
          campoUnidade,
          campoUnidadeOutraWrapper,
          campoUnidadeOutra,
          item.unidade || ""
        );

        preencherCampoCategoria(item.categoria || "");
        limparSugestoes();
      });

      sugestoesCompra.appendChild(botaoSugestao);
    });
  }

  function limparSugestoes() {
    sugestoesCompra.innerHTML = "";
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

    limparSugestoes();
  }

  function limparFormularioFecharModal() {
    limparFormulario();
    modalBootstrap.hide();
  }

  function atualizarCategoriaPeloNomeDigitado() {
    const nome = campoItem.value.trim();

    if (!nome) {
      if (indiceEdicao === null) {
        campoCategoria.value = "";
        alternarCampoCategoriaNova();
      }
      return;
    }

    const itemCorrespondente = buscarItemNoEstoquePorNome(nome);

    if (itemCorrespondente && itemCorrespondente.categoria) {
      preencherCampoCategoria(itemCorrespondente.categoria);
    }
  }

  function buscarItemNoEstoquePorNome(nome) {
    const nomeNormalizado = normalizarTexto(nome);

    if (!nomeNormalizado) {
      return null;
    }

    const estoqueAtual = carregarEstoqueNormalizado();

    return (
      estoqueAtual.find(function (item) {
        return normalizarTexto(item.nome) === nomeNormalizado;
      }) || null
    );
  }

  function encontrarIndiceRealDoItem(itemOrdenado) {
    return itensCompra.findIndex(function (itemOriginal) {
      return (
        normalizarTexto(itemOriginal.nome) === normalizarTexto(itemOrdenado.nome) &&
        normalizarTexto(itemOriginal.unidade) === normalizarTexto(itemOrdenado.unidade) &&
        normalizarTexto(itemOriginal.categoria) === normalizarTexto(itemOrdenado.categoria) &&
        Number(itemOriginal.quantidade) === Number(itemOrdenado.quantidade) &&
        Number(itemOriginal.valorUnitario) === Number(itemOrdenado.valorUnitario)
      );
    });
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

  function formatarNumero(valor) {
    return Number(valor).toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  function formatarMoeda(valor) {
    return Number(valor).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
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
});
