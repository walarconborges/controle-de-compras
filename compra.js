// Espera o HTML carregar completamente antes de executar o código
document.addEventListener("DOMContentLoaded", function () {
  const CHAVE_COMPRA = "controleComprasCompraAtual";
  const CHAVE_ESTOQUE = "controleComprasEstoque";

  // Seleciona os elementos principais da página
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

  // Cria instâncias dos modais do Bootstrap
  const modalBootstrap = bootstrap.Modal.getOrCreateInstance(modalElement);

  modalElement.addEventListener("hidden.bs.modal", function () {
    compraForm.reset();
    
    campoUnidadeOutraWrapper.classList.add("d-none");
    campoUnidadeOutra.required = false;
    campoUnidadeOutra.value = "";
    
    campoMensagem.textContent = "";
    indiceEdicao = null;
    itemPendente = null;
    indiceItemRepetido = null;
  });
    
  const modalItemRepetidoBootstrap = bootstrap.Modal.getOrCreateInstance(modalItemRepetidoElement);

  let itensCompra = carregarCompra();
  let indiceEdicao = null;
  let itemPendente = null;
  let indiceItemRepetido = null;

  renderizarTabela();

  // Observa mudanças no campo de unidade
  campoUnidade.addEventListener("change", function () {
    if (campoUnidade.value === "outro(s)") {
      campoUnidadeOutraWrapper.classList.remove("d-none");
      campoUnidadeOutra.required = true;
    } else {
      campoUnidadeOutraWrapper.classList.add("d-none");
      campoUnidadeOutra.required = false;
      campoUnidadeOutra.value = "";
    }
  });

  // Escuta o envio do formulário
  compraForm.addEventListener("submit", function (event) {
    event.preventDefault();

    campoMensagem.textContent = "";

    const item = document.getElementById("compra-item").value.trim();
    const quantidadeTexto = document.getElementById("compra-quantidade").value.trim();
    let unidade = campoUnidade.value;
    const valorUnitarioTexto = document.getElementById("compra-valor-unitario").value.trim();

    if (unidade === "outro(s)") {
      unidade = campoUnidadeOutra.value.trim();
    }

    const quantidadeNormalizada = quantidadeTexto.replace(",", ".");
    const valorUnitarioNormalizado = valorUnitarioTexto.replace(",", ".");

    const quantidade = parseFloat(quantidadeNormalizada);
    const valorUnitario = parseFloat(valorUnitarioNormalizado);

    if (!item || !unidade || isNaN(quantidade) || isNaN(valorUnitario)) {
      campoMensagem.textContent = "Preencha todos os campos corretamente.";
      return;
    }

    if (quantidade < 0 || valorUnitario < 0) {
      campoMensagem.textContent = "Quantidade e valor não podem ser negativos.";
      return;
    }

    const novoItem = {
      item: item,
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
        itemExistente.item.trim().toLowerCase() === item.trim().toLowerCase() &&
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

    const itemExistente = itensCompra[indiceItemRepetido];

    document.getElementById("compra-item").value = itemExistente.item;
    document.getElementById("compra-quantidade").value = itemExistente.quantidade;
    document.getElementById("compra-valor-unitario").value = itemExistente.valorUnitario;

    const unidadeExisteNaLista = Array.from(campoUnidade.options).some(function (option) {
      return option.value === itemExistente.unidade;
    });

    if (unidadeExisteNaLista) {
      campoUnidade.value = itemExistente.unidade;
      campoUnidadeOutraWrapper.classList.add("d-none");
      campoUnidadeOutra.required = false;
      campoUnidadeOutra.value = "";
    } else {
      campoUnidade.value = "outro(s)";
      campoUnidadeOutraWrapper.classList.remove("d-none");
      campoUnidadeOutra.required = true;
      campoUnidadeOutra.value = "";
    }

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
    
    itensCompra.forEach(function (itemCompra) {
      const indiceExistenteNoEstoque = estoqueAtual.findIndex(function (itemEstoque) {
        return (
          itemEstoque.nome.trim().toLowerCase() === itemCompra.item.trim().toLowerCase() &&
          itemEstoque.unidade.trim().toLowerCase() === itemCompra.unidade.trim().toLowerCase()
        );
      });
      
      if (indiceExistenteNoEstoque !== -1) {
        estoqueAtual[indiceExistenteNoEstoque].quantidade += itemCompra.quantidade;
      } else {
        estoqueAtual.push({
          nome: itemCompra.item,
          unidade: itemCompra.unidade,
          quantidade: itemCompra.quantidade,
          localizacao: ""
        });
      }
    });
    
    localStorage.setItem(CHAVE_ESTOQUE, JSON.stringify(estoqueAtual));
    
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

  function salvarCompra() {
    localStorage.setItem(CHAVE_COMPRA, JSON.stringify(itensCompra));
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
      const subtotal = item.quantidade * item.valorUnitario;
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
        <td>${item.item}</td>
        <td>${formatarNumero(item.quantidade)}</td>
        <td>${item.unidade}</td>
        <td>R$ ${formatarMoeda(item.valorUnitario)}</td>
        <td>R$ ${formatarMoeda(subtotal)}</td>
      `;

      compraTabela.appendChild(novaLinha);
      
      const botaoEditar = novaLinha.querySelector(".btn-editar");
      const botaoRemover = novaLinha.querySelector(".btn-remover");
      
      botaoEditar.addEventListener("click", function () {
        const itemExistente = itensCompra[indice];
        
        document.getElementById("compra-item").value = itemExistente.item;
        document.getElementById("compra-quantidade").value = itemExistente.quantidade;
        document.getElementById("compra-valor-unitario").value = itemExistente.valorUnitario;
        
        const unidadeExisteNaLista = Array.from(campoUnidade.options).some(function (option) {
          return option.value === itemExistente.unidade;
        });
        
        if (unidadeExisteNaLista) {
          campoUnidade.value = itemExistente.unidade;
          campoUnidadeOutraWrapper.classList.add("d-none");
          campoUnidadeOutra.required = false;
          campoUnidadeOutra.value = "";
        } else {
          campoUnidade.value = "outro(s)";
          campoUnidadeOutraWrapper.classList.remove("d-none");
          campoUnidadeOutra.required = true;
          campoUnidadeOutra.value = "";
        }
        
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
  
  function limparFormularioFecharModal() {
    compraForm.reset();
    campoUnidadeOutraWrapper.classList.add("d-none");
    campoUnidadeOutra.required = false;
    campoUnidadeOutra.value = "";
    modalBootstrap.hide();
  }

  function formatarNumero(valor) {
    return valor.toLocaleString("pt-BR");
  }

  function formatarMoeda(valor) {
    return valor.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
});
