document.addEventListener("DOMContentLoaded", function () {
  const CHAVE_ESTOQUE = "controleComprasEstoque";
  const CHAVE_MOVIMENTACOES_ESTOQUE = "controleComprasMovimentacoesEstoque";

  const estoqueForm = document.getElementById("estoque-form");
  const estoqueTabela = document.getElementById("estoque-tabela");
  const campoUnidade = document.getElementById("item-unidade");
  const campoUnidadeOutraWrapper = document.getElementById("campo-unidade-outra-wrapper");
  const campoUnidadeOutra = document.getElementById("campo-unidade-outra");
  const campoCategoria = document.getElementById("item-categoria");
  const campoCategoriaOutraWrapper = document.getElementById("campo-categoria-outra-wrapper");
  const campoCategoriaOutra = document.getElementById("campo-categoria-outra");
  const campoMensagem = document.getElementById("estoque-mensagem");
  const modalElement = document.getElementById("modalAdicionarItem");

  const modalItemRepetidoElement = document.getElementById("modalItemRepetido");
  const btnCancelarItemRepetido = document.getElementById("btn-cancelar-item-repetido");
  const btnEditarItemRepetido = document.getElementById("btn-editar-item-repetido");
  const btnSubstituirItemRepetido = document.getElementById("btn-substituir-item-repetido");

  const modalBootstrap = bootstrap.Modal.getOrCreateInstance(modalElement);
  const modalItemRepetidoBootstrap = bootstrap.Modal.getOrCreateInstance(modalItemRepetidoElement);

  let indiceEdicao = null;
  let itemPendente = null;
  let indiceItemRepetido = null;

  let itensEstoque = carregarEstoque();
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
    alternarCampoOutro(campoCategoria, campoCategoriaOutraWrapper, campoCategoriaOutra);
  });

  estoqueForm.addEventListener("submit", function (event) {
    event.preventDefault();
    campoMensagem.textContent = "";

    const nome = document.getElementById("item-nome").value.trim();
    let unidade = campoUnidade.value;
    let categoria = campoCategoria.value;
    const quantidade = normalizarQuantidade(document.getElementById("item-quantidade").value);

    if (unidade === "outro(s)") {
      unidade = campoUnidadeOutra.value.trim();
    }

    if (categoria === "outro(s)") {
      categoria = campoCategoriaOutra.value.trim();
    }

    if (!nome || !unidade || isNaN(quantidade)) {
      campoMensagem.textContent = "Preencha todos os campos corretamente.";
      return;
    }

    if (quantidade < 0) {
      campoMensagem.textContent = "A quantidade não pode ser negativa.";
      return;
    }

    removerLinhaVazia();

    const novoItem = {
      nome: nome,
      unidade: unidade,
      quantidade: quantidade,
      categoria: categoria
    };

    if (indiceEdicao !== null) {
      const itemAnterior = itensEstoque[indiceEdicao];
      const quantidadeAnterior = Number(itemAnterior.quantidade);

      itensEstoque[indiceEdicao] = novoItem;

      if (
        houveMudancaRelevante(itemAnterior, novoItem) ||
        quantidadeAnterior !== Number(novoItem.quantidade)
      ) {
        registrarMovimentacaoEstoque("edicao", novoItem, quantidadeAnterior, novoItem.quantidade);
      }

      indiceEdicao = null;
      salvarEstoque();
      renderizarTabela();
    } else {
      const indiceExistente = itensEstoque.findIndex(function (item) {
        return (
          item.nome.trim().toLowerCase() === nome.trim().toLowerCase() &&
          item.unidade.trim().toLowerCase() === unidade.trim().toLowerCase()
        );
      });

      if (indiceExistente !== -1) {
        itemPendente = novoItem;
        indiceItemRepetido = indiceExistente;
        modalItemRepetidoBootstrap.show();
        return;
      }

      itensEstoque.push(novoItem);
      registrarMovimentacaoEstoque("cadastro", novoItem, 0, novoItem.quantidade);
      salvarEstoque();
      renderizarTabela();
    }

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

    const quantidadeAnterior = Number(itensEstoque[indiceItemRepetido].quantidade);
    itensEstoque[indiceItemRepetido] = itemPendente;

    registrarMovimentacaoEstoque(
      "substituicao",
      itemPendente,
      quantidadeAnterior,
      itemPendente.quantidade
    );

    salvarEstoque();
    renderizarTabela();

    itemPendente = null;
    indiceItemRepetido = null;

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
  });

  function carregarEstoque() {
    const dadosSalvos = localStorage.getItem(CHAVE_ESTOQUE);

    if (!dadosSalvos) {
      return [];
    }

    try {
      return JSON.parse(dadosSalvos);
    } catch (erro) {
      console.error("Erro ao carregar estoque:", erro);
      return [];
    }
  }

  function salvarEstoque() {
    localStorage.setItem(CHAVE_ESTOQUE, JSON.stringify(itensEstoque));
  }

  function renderizarTabela() {
    estoqueTabela.innerHTML = "";

    if (itensEstoque.length === 0) {
      estoqueTabela.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted">
            Nenhum item cadastrado até o momento.
          </td>
        </tr>
      `;
      return;
    }

    itensEstoque.forEach(function (item, indice) {
      const novaLinha = document.createElement("tr");

      if (Number(item.quantidade) === 0) {
        novaLinha.classList.add("status-danger");
      }

      if (!item.categoria || item.categoria.trim() === "") {
        novaLinha.classList.add("status-location-empty");
      }

      novaLinha.innerHTML = `
        <td>
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-sm btn-warning btn-editar" data-indice="${indice}">
              Editar
            </button>
            <button type="button" class="btn btn-sm btn-danger btn-remover" data-indice="${indice}">
              Remover
            </button>
          </div>
        </td>
        <td>${item.nome}</td>
        <td>${item.unidade}</td>
        <td>
          <div class="d-flex align-items-center gap-2">
            <button type="button" class="btn btn-sm btn-outline-secondary btn-diminuir" data-indice="${indice}">
              -
            </button>

            <input
              type="text"
              inputmode="decimal"
              class="form-control form-control-sm campo-quantidade"
              data-indice="${indice}"
              value="${item.quantidade}"
            >

            <button type="button" class="btn btn-sm btn-outline-secondary btn-aumentar" data-indice="${indice}">
              +
            </button>
          </div>
        </td>
        <td>${item.categoria|| ""}</td>
      `;

      estoqueTabela.appendChild(novaLinha);

      const botaoEditar = novaLinha.querySelector(".btn-editar");
      const botaoRemover = novaLinha.querySelector(".btn-remover");
      const botaoDiminuir = novaLinha.querySelector(".btn-diminuir");
      const botaoAumentar = novaLinha.querySelector(".btn-aumentar");
      const campoQuantidade = novaLinha.querySelector(".campo-quantidade");

      botaoEditar.addEventListener("click", function () {
        preencherFormulario(itensEstoque[indice]);
        indiceEdicao = indice;
        modalBootstrap.show();
      });

      botaoRemover.addEventListener("click", function () {
        const desejaRemover = confirm("Deseja remover este item do estoque?");

        if (!desejaRemover) {
          return;
        }

        const itemRemovido = itensEstoque[indice];
        registrarMovimentacaoEstoque("remocao", itemRemovido, itemRemovido.quantidade, 0);

        itensEstoque.splice(indice, 1);
        salvarEstoque();
        renderizarTabela();
      });

      botaoDiminuir.addEventListener("click", function () {
        let quantidadeAnterior = Number(itensEstoque[indice].quantidade);

        if (isNaN(quantidadeAnterior)) {
          quantidadeAnterior = 0;
        }

        const quantidadeNova = Math.max(0, quantidadeAnterior - 1);

        if (quantidadeNova === quantidadeAnterior) {
          return;
        }

        itensEstoque[indice].quantidade = quantidadeNova;
        registrarMovimentacaoEstoque("ajuste", itensEstoque[indice], quantidadeAnterior, quantidadeNova);
        salvarEstoque();
        renderizarTabela();
      });

      botaoAumentar.addEventListener("click", function () {
        let quantidadeAnterior = Number(itensEstoque[indice].quantidade);

        if (isNaN(quantidadeAnterior)) {
          quantidadeAnterior = 0;
        }

        const quantidadeNova = quantidadeAnterior + 1;

        if (quantidadeNova === quantidadeAnterior) {
          return;
        }

        itensEstoque[indice].quantidade = quantidadeNova;
        registrarMovimentacaoEstoque("ajuste", itensEstoque[indice], quantidadeAnterior, quantidadeNova);
        salvarEstoque();
        renderizarTabela();
      });

      campoQuantidade.addEventListener("change", function () {
        const quantidadeAnterior = Number(itensEstoque[indice].quantidade);
        let novaQuantidade = normalizarQuantidade(campoQuantidade.value);

        if (isNaN(novaQuantidade) || novaQuantidade < 0) {
          novaQuantidade = 0;
        }

        if (novaQuantidade === quantidadeAnterior) {
          renderizarTabela();
          return;
        }

        itensEstoque[indice].quantidade = novaQuantidade;
        registrarMovimentacaoEstoque("ajuste", itensEstoque[indice], quantidadeAnterior, novaQuantidade);
        salvarEstoque();
        renderizarTabela();
      });
    });
  }

  function carregarMovimentacoesEstoque() {
    const dadosSalvos = localStorage.getItem(CHAVE_MOVIMENTACOES_ESTOQUE);

    if (!dadosSalvos) {
      return [];
    }

    try {
      return JSON.parse(dadosSalvos);
    } catch (erro) {
      console.error("Erro ao carregar movimentações do estoque:", erro);
      return [];
    }
  }

  function salvarMovimentacoesEstoque(movimentacoes) {
    localStorage.setItem(CHAVE_MOVIMENTACOES_ESTOQUE, JSON.stringify(movimentacoes));
  }

  function registrarMovimentacaoEstoque(tipo, item, quantidadeAnterior, quantidadeNova) {
    const anterior = Number(quantidadeAnterior);
    const nova = Number(quantidadeNova);
    const variacao = nova - anterior;

    const movimentacoes = carregarMovimentacoesEstoque();

    movimentacoes.push({
      data: new Date().toISOString(),
      tipo: tipo,
      nome: item.nome,
      unidade: item.unidade,
      categoria: item.categoria || "",
      quantidadeAnterior: anterior,
      quantidadeNova: nova,
      variacao: variacao,
      saldoResultante: nova
    });

    salvarMovimentacoesEstoque(movimentacoes);
  }

  function normalizarQuantidade(valor) {
    return parseFloat(String(valor).trim().replace(",", "."));
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

  function preencherFormulario(item) {
    document.getElementById("item-nome").value = item.nome;
    document.getElementById("item-quantidade").value = item.quantidade;

    preencherSelectOuOutro(
      campoUnidade,
      campoUnidadeOutraWrapper,
      campoUnidadeOutra,
      item.unidade
    );

    preencherSelectOuOutro(
      campoCategoria,
      campoCategoriaOutraWrapper,
      campoCategoriaOutra,
      item.categoria || ""
    );
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

    campoUnidadeOutraWrapper.classList.add("d-none");
    campoUnidadeOutra.required = false;
    campoUnidadeOutra.value = "";

    campoCategoriaOutraWrapper.classList.add("d-none");
    campoCategoriaOutra.required = false;
    campoCategoriaOutra.value = "";
  }

  function removerLinhaVazia() {
    const linhaVazia = estoqueTabela.querySelector("td[colspan='5']");
    if (linhaVazia) {
      linhaVazia.parentElement.remove();
    }
  }

  function houveMudancaRelevante(itemAnterior, itemNovo) {
    return (
      itemAnterior.nome !== itemNovo.nome ||
      itemAnterior.unidade !== itemNovo.unidade ||
      (itemAnterior.categoria || "") !== (itemNovo.categoria || "")
    );
  }
});
