document.addEventListener("DOMContentLoaded", function () {
  const CHAVE_COMPRA = "controleComprasCompraAtual";
  const CHAVE_ESTOQUE = "controleComprasEstoque";
  const CHAVE_HISTORICO_COMPRAS = "controleComprasHistoricoCompras";
  const CHAVE_MOVIMENTACOES_ESTOQUE = "controleComprasMovimentacoesEstoque";

  const compraForm = document.getElementById("compra-form");
  const compraTabela = document.getElementById("compra-tabela");
  const totalCompra = document.getElementById("total-compra");
  const campoItem = document.getElementById("compra-item");
  const sugestoesCompra = document.getElementById("sugestoes-compra");

  const campoQuantidade = document.getElementById("compra-quantidade");
  const campoValorUnitario = document.getElementById("compra-valor-unitario");

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
  let categoriaSelecionadaDoEstoque = "";

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

  campoItem.addEventListener("input", function () {
    atualizarCategoriaPeloNomeDigitado();
    renderizarSugestoesDoEstoque();
  });

  campoItem.addEventListener("blur", function () {
    setTimeout(function () {
      limparSugestoes();
    }, 150);
  });

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

    if (!nome || !unidade || Number.isNaN(quantidade) || Number.isNaN(valorUnitario)) {
      campoMensagem.textContent = "Preencha todos os campos corretamente.";
      return;
    }

    if (quantidade <= 0 || valorUnitario < 0) {
      campoMensagem.textContent = "Quantidade deve ser maior que zero e o valor não pode ser negativo.";
      return;
    }

    const itemCorrespondenteNoEstoque = buscarItemNoEstoquePorNome(nome);

    const novoItem = {
      nome: nome,
      quantidade: quantidade,
      unidade: unidade,
      valorUnitario: valorUnitario,
      categoria: itemCorrespondenteNoEstoque
        ? itemCorrespondenteNoEstoque.categoria || ""
        : categoriaSelecionadaDoEstoque || ""
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
      indiceEdicao = null;
      salvarCompra();
      renderizarTabela();
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

    const estoqueAtual = carregarEstoque();
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

        if (!itemEstoque.categoria && itemCompra.categoria) {
          itemEstoque.categoria = itemCompra.categoria;
        }

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
          categoria: itemCompra.categoria || ""
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
          categoria: item.categoria || ""
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
      const dados = JSON.parse(dadosSalvos);
      return Array.isArray(dados) ? dados : [];
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
      const dados = JSON.parse(dadosSalvos);
      return Array.isArray(dados) ? dados : [];
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
      categoria: item.categoria || "",
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
        <td>${escaparHtml(item.nome)}</td>
        <td>${formatarNumero(item.quantidade)}</td>
        <td>${escaparHtml(item.unidade)}</td>
        <td>R$ ${formatarMoeda(item.valorUnitario)}</td>
        <td>R$ ${formatarMoeda(subtotal)}</td>
      `;

      compraTabela.appendChild(novaLinha);

      const botaoEditar = novaLinha.querySelector(".btn-editar");
      const botaoRemover = novaLinha.querySelector(".btn-remover");

      botaoEditar.addEventListener("click", function () {
        preencherFormulario(itensCompra[indice]);
        indiceEdicao = indice;
        campoMensagem.textContent = "";
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
    campoItem.value = item.nome;
    campoQuantidade.value = item.quantidade;
    campoValorUnitario.value = item.valorUnitario;
    categoriaSelecionadaDoEstoque = item.categoria || "";

    preencherSelectOuOutro(
      campoUnidade,
      campoUnidadeOutraWrapper,
      campoUnidadeOutra,
      item.unidade
    );
  }

  function renderizarSugestoesDoEstoque() {
    const termoDigitado = normalizarTexto(campoItem.value);

    limparSugestoes();

    if (!termoDigitado) {
      categoriaSelecionadaDoEstoque = "";
      return;
    }

    const estoqueAtual = carregarEstoque();

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
        categoriaSelecionadaDoEstoque = item.categoria || "";

        preencherSelectOuOutro(
          campoUnidade,
          campoUnidadeOutraWrapper,
          campoUnidadeOutra,
          item.unidade || ""
        );

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
    categoriaSelecionadaDoEstoque = "";
    limparSugestoes();
  }

  function limparFormularioFecharModal() {
    limparFormulario();
    modalBootstrap.hide();
  }

  function atualizarCategoriaPeloNomeDigitado() {
    const nome = campoItem.value.trim();

    if (!nome) {
      categoriaSelecionadaDoEstoque = "";
      return;
    }

    const itemCorrespondente = buscarItemNoEstoquePorNome(nome);
    categoriaSelecionadaDoEstoque = itemCorrespondente ? itemCorrespondente.categoria || "" : "";
  }

  function buscarItemNoEstoquePorNome(nome) {
    const nomeNormalizado = normalizarTexto(nome);

    if (!nomeNormalizado) {
      return null;
    }

    const estoqueAtual = carregarEstoque();

    return (
      estoqueAtual.find(function (item) {
        return normalizarTexto(item.nome) === nomeNormalizado;
      }) || null
    );
  }

  function normalizarNumero(valor) {
    const texto = String(valor || "").trim().replace(/\s+/g, "").replace(",", ".");
    return parseFloat(texto);
  }

  function normalizarTexto(valor) {
    return String(valor || "").trim().toLowerCase();
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

  function escaparHtml(valor) {
    return String(valor || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
