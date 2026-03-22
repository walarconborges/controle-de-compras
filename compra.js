document.addEventListener("DOMContentLoaded", function () {
  const CHAVE_COMPRA = "controleComprasCompraAtual";
  const CHAVE_ESTOQUE = "controleComprasEstoque";
  const CHAVE_HISTORICO_COMPRAS = "controleComprasHistoricoCompras";
  const CHAVE_MOVIMENTACOES_ESTOQUE = "controleComprasMovimentacoesEstoque";

  const compraForm = document.getElementById("compra-form");
  const compraTabela = document.getElementById("compra-tabela");
  const totalCompra = document.getElementById("total-compra");

  const campoUnidade = document.getElementById("compra-unidade");
  const campoUnidadeOutraWrapper = document.getElementById("campo-compra-unidade-outra-wrapper");
  const campoUnidadeOutra = document.getElementById("campo-compra-unidade-outra");

  const campoMensagem = document.getElementById("compra-mensagem");
  const modalElement = document.getElementById("modalAdicionarCompra");
  const btnFinalizarCompra = document.getElementById("btn-finalizar-compra");

  const modalItemRepetidoElement = document.getElementById("modalItemRepetidoCompra");
  const btnCancelarItemRepetido = document.getElementById("btn-cancelar-item-repetido-compra");
  const btnEditarItemRepetido = document.getElementById("btn-editar-item-repetido-compra");
  const btnSubstituirItemRepetido = document.getElementById("btn-substituir-item-repetido-compra");

  const modalBootstrap = bootstrap.Modal.getOrCreateInstance(modalElement);
  const modalItemRepetidoBootstrap = bootstrap.Modal.getOrCreateInstance(modalItemRepetidoElement);

  let itensCompra = carregarCompra();
  let indiceEdicao = null;
  let itemPendente = null;
  let indiceItemRepetido = null;

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

  compraForm.addEventListener("submit", function (event) {
    event.preventDefault();
    campoMensagem.textContent = "";

    const nome = document.getElementById("compra-item").value.trim();
    const quantidade = normalizarNumero(document.getElementById("compra-quantidade").value);
    const valorUnitario = normalizarNumero(document.getElementById("compra-valor-unitario").value);
    let unidade = campoUnidade.value;

    if (unidade === "outro(s)") {
      unidade = campoUnidadeOutra.value.trim();
    }

    if (!nome || !unidade || isNaN(quantidade) || isNaN(valorUnitario)) {
      campoMensagem.textContent = "Preencha todos os campos corretamente.";
      return;
    }

    if (quantidade < 0 || valorUnitario < 0) {
      campoMensagem.textContent = "Quantidade e valor não podem ser negativos.";
      return;
    }

    const novoItem = {
      nome: nome,
      quantidade: quantidade,
      unidade: unidade,
      valorUnitario: valorUnitario
    };

    if (indiceEdicao !== null) {
      itensCompra[indiceEdicao] = novoItem;
      indiceEdicao = null;
      salvarCompra();
      renderizarTabela();
      limparFormularioFecharModal();
      return;
    }

    const indiceExistente = itensCompra.findIndex(function (itemExistente) {
      return (
        itemExistente.nome.trim().toLowerCase() === nome.trim().toLowerCase() &&
        itemExistente.unidade.trim().toLowerCase() === unidade.trim().toLowerCase()
      );
    });

    if (indiceExistente !== -1) {
      itemPendente = novoItem;
      indiceItemRepetido = indiceExistente;
      modalItemRepetidoBootstrap.show();
      return;
    }

    itensCompra.push(novoItem);
    salvarCompra();
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
    salvarCompra();
    renderizarTabela();

    itemPendente = null;
    indiceItemRepetido = null;

    modalItemRepetidoBootstrap.hide();
    limparFormularioFecharModal();
  });

  btnEditarItemRepetido.addEventListener("click", function () {
    if (indiceItemRepetido === null) {
      return;
    }

    preencherFormulario(itensCompra[indiceItemRepetido]);
    indiceEdicao = indiceItemRepetido;

    itemPendente = null;
    indiceItemRepetido = null;
    modalItemRepetidoBootstrap.hide();
  });

  btnFinalizarCompra.addEventListener("click", function () {
    if (itensCompra.length === 0) {
      campoMensagem.textContent = "Não há itens para finalizar a compra.";
      return;
    }

    const estoqueAtual = carregarEstoque();
    const movimentacoesEstoque = carregarMovimentacoesEstoque();

    itensCompra.forEach(function (itemCompra) {
      const indiceExistenteNoEstoque = estoqueAtual.findIndex(function (itemEstoque) {
        return (
          itemEstoque.nome.trim().toLowerCase() === itemCompra.nome.trim().toLowerCase() &&
          itemEstoque.unidade.trim().toLowerCase() === itemCompra.unidade.trim().toLowerCase()
        );
      });

      if (indiceExistenteNoEstoque !== -1) {
        const itemEstoque = estoqueAtual[indiceExistenteNoEstoque];
        const quantidadeAnterior = Number(itemEstoque.quantidade) || 0;
        const quantidadeNova = quantidadeAnterior + Number(itemCompra.quantidade);

        itemEstoque.quantidade = quantidadeNova;

        movimentacoesEstoque.push(criarMovimentacaoEstoque(
          "entrada_compra",
          {
            nome: itemEstoque.nome,
            unidade: itemEstoque.unidade,
            localizacao: itemEstoque.localizacao || ""
          },
          quantidadeAnterior,
          quantidadeNova
        ));
      } else {
        const novoItemEstoque = {
          nome: itemCompra.nome,
          unidade: itemCompra.unidade,
          quantidade: Number(itemCompra.quantidade),
          localizacao: ""
        };

        estoqueAtual.push(novoItemEstoque);

        movimentacoesEstoque.push(criarMovimentacaoEstoque(
          "entrada_compra",
          {
            nome: novoItemEstoque.nome,
            unidade: novoItemEstoque.unidade,
            localizacao: novoItemEstoque.localizacao || ""
          },
          0,
          novoItemEstoque.quantidade
        ));
      }
    });

    salvarEstoque(estoqueAtual);
    salvarMovimentacoesEstoque(movimentacoesEstoque);

    const historicoCompras = carregarHistoricoCompras();

    const totalCompraFinalizada = itensCompra.reduce(function (total, item) {
      return total + (Number(item.quantidade) * Number(item.valorUnitario));
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
          subtotal: Number(item.quantidade) * Number(item.valorUnitario)
        };
      })
    };

    historicoCompras.push(registroCompra);
    salvarHistoricoCompras(historicoCompras);

    itensCompra = [];
    salvarCompra();
    renderizarTabela();
    campoMensagem.textContent = "Compra finalizada e estoque atualizado.";
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

  function salvarEstoque(estoque) {
    localStorage.setItem(CHAVE_ESTOQUE, JSON.stringify(estoque));
  }

  function carregarCompra() {
    const dadosSalvos = localStorage.getItem(CHAVE_COMPRA);

    if (!dadosSalvos) {
      return [];
    }

    try {
      return JSON.parse(dadosSalvos);
    } catch (erro) {
      console.error("Erro ao carregar compra:", erro);
      return [];
    }
  }

  function carregarHistoricoCompras() {
    const dadosSalvos = localStorage.getItem(CHAVE_HISTORICO_COMPRAS);

    if (!dadosSalvos) {
      return [];
    }

    try {
      return JSON.parse(dadosSalvos);
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
      return JSON.parse(dadosSalvos);
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
      localizacao: item.localizacao || "",
      quantidadeAnterior: anterior,
      quantidadeNova: nova,
      variacao: nova - anterior,
      saldoResultante: nova
    };
  }

  function renderizarTabela() {
    compraTabela.innerHTML = "";

    if (itensCompra.length === 0) {
      compraTabela.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted">
            Nenhuma compra registrada até o momento.
          </td>
        </tr>
      `;
      totalCompra.textContent = "0,00";
      return;
    }

    let totalAcumulado = 0;

    itensCompra.forEach(function (item, indice) {
      const subtotal = Number(item.quantidade) * Number(item.valorUnitario);
      totalAcumulado += subtotal;

      const novaLinha = document.createElement("tr");
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
        <td>${formatarNumero(item.quantidade)}</td>
        <td>${item.unidade}</td>
        <td>R$ ${formatarMoeda(item.valorUnitario)}</td>
        <td>R$ ${formatarMoeda(subtotal)}</td>
      `;

      compraTabela.appendChild(novaLinha);

      const botaoEditar = novaLinha.querySelector(".btn-editar");
      const botaoRemover = novaLinha.querySelector(".btn-remover");

      botaoEditar.addEventListener("click", function () {
        preencherFormulario(itensCompra[indice]);
        indiceEdicao = indice;
        modalBootstrap.show();
      });

      botaoRemover.addEventListener("click", function () {
        const desejaRemover = confirm("Deseja remover este item da compra?");

        if (!desejaRemover) {
          return;
        }

        itensCompra.splice(indice, 1);
        salvarCompra();
        renderizarTabela();
      });
    });

    totalCompra.textContent = formatarMoeda(totalAcumulado);
  }

  function preencherFormulario(item) {
    document.getElementById("compra-item").value = item.nome;
    document.getElementById("compra-quantidade").value = item.quantidade;
    document.getElementById("compra-valor-unitario").value = item.valorUnitario;

    preencherSelectOuOutro(
      campoUnidade,
      campoUnidadeOutraWrapper,
      campoUnidadeOutra,
      item.unidade
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
    campoUnidadeOutraWrapper.classList.add("d-none");
    campoUnidadeOutra.required = false;
    campoUnidadeOutra.value = "";
  }

  function limparFormularioFecharModal() {
    limparFormulario();
    modalBootstrap.hide();
  }

  function normalizarNumero(valor) {
    return parseFloat(String(valor).trim().replace(",", "."));
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
});
