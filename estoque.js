// Espera o HTML carregar completamente antes de executar o código
document.addEventListener("DOMContentLoaded", function () {
  const CHAVE_ESTOQUE = "controleComprasEstoque";
  // Seleciona os elementos principais da página
  const estoqueForm = document.getElementById("estoque-form");
  const estoqueTabela = document.getElementById("estoque-tabela");
  const campoUnidade = document.getElementById("item-unidade");
  const campoUnidadeOutraWrapper = document.getElementById("campo-unidade-outra-wrapper");
  const campoUnidadeOutra = document.getElementById("campo-unidade-outra");
  const campoLocalizacao = document.getElementById("item-localizacao");
  const campoLocalizacaoOutraWrapper = document.getElementById("campo-localizacao-outra-wrapper");
  const campoLocalizacaoOutra = document.getElementById("campo-localizacao-outra");
  const campoMensagem = document.getElementById("estoque-mensagem");
  const modalElement = document.getElementById("modalAdicionarItem");

  const modalItemRepetidoElement = document.getElementById("modalItemRepetido");
  const btnCancelarItemRepetido = document.getElementById("btn-cancelar-item-repetido");
  const btnEditarItemRepetido = document.getElementById("btn-editar-item-repetido");
  const btnSubstituirItemRepetido = document.getElementById("btn-substituir-item-repetido");

  // Cria uma instância do modal do Bootstrap para poder fechá-lo via JavaScript
  const modalBootstrap = bootstrap.Modal.getOrCreateInstance(modalElement);
  
  modalElement.addEventListener("hidden.bs.modal", function () {
    estoqueForm.reset();
    
    campoUnidadeOutraWrapper.classList.add("d-none");
    campoUnidadeOutra.required = false;
    campoUnidadeOutra.value = "";
    
    campoLocalizacaoOutraWrapper.classList.add("d-none");
    campoLocalizacaoOutra.required = false;
    campoLocalizacaoOutra.value = "";
    
    campoMensagem.textContent = "";
    indiceEdicao = null;
    itemPendente = null;
    indiceItemRepetido = null;
  });
  
  const modalItemRepetidoBootstrap = bootstrap.Modal.getOrCreateInstance(modalItemRepetidoElement);
  
  let indiceEdicao = null;
  let itemPendente = null;
  let indiceItemRepetido = null;
  
  let itensEstoque = carregarEstoque();
  renderizarTabela();
  
  // Observa mudanças no campo de unidade
  campoUnidade.addEventListener("change", function () {
    // Se a pessoa escolher "outro(s)", mostra o campo manual
    if (campoUnidade.value === "outro(s)") {
      campoUnidadeOutraWrapper.classList.remove("d-none");
      campoUnidadeOutra.required = true;
    } else {
      // Se escolher qualquer outra opção, esconde o campo manual
      campoUnidadeOutraWrapper.classList.add("d-none");
      campoUnidadeOutra.required = false;
      campoUnidadeOutra.value = "";
    }
  });
  
  // Observa mudanças no campo de localização
  campoLocalizacao.addEventListener("change", function () {
    // Se a pessoa escolher "outro(s)", mostra o campo manual
    if (campoLocalizacao.value === "outro(s)") {
      campoLocalizacaoOutraWrapper.classList.remove("d-none");
      campoLocalizacaoOutra.required = true;
    } else {
      // Se escolher qualquer outra opção, esconde o campo manual
      campoLocalizacaoOutraWrapper.classList.add("d-none");
      campoLocalizacaoOutra.required = false;
      campoLocalizacaoOutra.value = "";
    }
  });

  // Escuta o envio do formulário
  estoqueForm.addEventListener("submit", function (event) {
    // Impede o recarregamento da página
    event.preventDefault();

    // Limpa mensagem antiga
    campoMensagem.textContent = "";

    // Captura os valores digitados/selecionados
    const nome = document.getElementById("item-nome").value.trim();
    let unidade = campoUnidade.value;
    const quantidadeTexto = document.getElementById("item-quantidade").value.trim();
    let localizacao = campoLocalizacao.value;

    // Se a unidade for "outro(s)", usa o valor digitado manualmente
    if (unidade === "outro(s)") {
      unidade = campoUnidadeOutra.value.trim();
    }

    // Se a localização for "outro(s)", usa o valor digitado manualmente
    if (localizacao === "outro(s)") {
      localizacao = campoLocalizacaoOutra.value.trim();
    }

    // Troca vírgula por ponto para aceitar os dois formatos
    const quantidadeNormalizada = quantidadeTexto.replace(",", ".");
    
    // Converte para número
    const quantidade = parseFloat(quantidadeNormalizada);

    // Validação básica
    if (!nome || !unidade || isNaN(quantidade)) {
      campoMensagem.textContent = "Preencha todos os campos corretamente.";
      return;
    }

    if (quantidade < 0) {
      campoMensagem.textContent = "A quantidade não pode ser negativa.";
      return;
    }

    // Remove a mensagem de tabela vazia, se ela ainda existir
    const linhaVazia = estoqueTabela.querySelector("td[colspan='5']");
    if (linhaVazia) {
      linhaVazia.parentElement.remove();
    }

    const novoItem = {
      nome: nome,
      unidade: unidade,
      quantidade: quantidade,
      localizacao: localizacao
    };
    
    if (indiceEdicao !== null) {
      itensEstoque[indiceEdicao] = novoItem;
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
      salvarEstoque();
      renderizarTabela();
    }
    
    // Limpa o formulário
    estoqueForm.reset();

    // Esconde novamente o campo manual de unidade
    campoUnidadeOutraWrapper.classList.add("d-none");
    campoUnidadeOutra.required = false;
    campoUnidadeOutra.value = "";

    // Esconde novamente o campo de localização manual
    campoLocalizacaoOutraWrapper.classList.add("d-none");
    campoLocalizacaoOutra.required = false;
    campoLocalizacaoOutra.value = "";

    // Fecha o modal
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
    
    itensEstoque[indiceItemRepetido] = itemPendente;
    salvarEstoque();
    renderizarTabela();
    
    itemPendente = null;
    indiceItemRepetido = null;
    modalItemRepetidoBootstrap.hide();
    modalBootstrap.hide();
    estoqueForm.reset();

    campoUnidadeOutraWrapper.classList.add("d-none");
    campoUnidadeOutra.required = false;
    campoUnidadeOutra.value = "";
    
    campoLocalizacaoOutraWrapper.classList.add("d-none");
    campoLocalizacaoOutra.required = false;
    campoLocalizacaoOutra.value = "";
  });
  
  btnEditarItemRepetido.addEventListener("click", function () {
    if (indiceItemRepetido === null) {
      return;
    }
    
    const itemExistente = itensEstoque[indiceItemRepetido];
    
    document.getElementById("item-nome").value = itemExistente.nome;
    document.getElementById("item-quantidade").value = itemExistente.quantidade;
    
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
    
    const localizacaoExisteNaLista = Array.from(campoLocalizacao.options).some(function (option) {
      return option.value === itemExistente.localizacao;
    });
    
    if (!itemExistente.localizacao) {
      campoLocalizacao.value = "";
      campoLocalizacaoOutraWrapper.classList.add("d-none");
      campoLocalizacaoOutra.required = false;
      campoLocalizacaoOutra.value = "";
    } else if (localizacaoExisteNaLista) {
      campoLocalizacao.value = itemExistente.localizacao;
      campoLocalizacaoOutraWrapper.classList.add("d-none");
      campoLocalizacaoOutra.required = false;
      campoLocalizacaoOutra.value = "";
    } else {
      campoLocalizacao.value = "outro(s)";
      campoLocalizacaoOutraWrapper.classList.remove("d-none");
      campoLocalizacaoOutra.required = true;
      campoLocalizacaoOutra.value = "";
    }
    
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
      
      if (item.quantidade === 0) {
        novaLinha.classList.add("status-danger");
      }
      
      if (!item.localizacao || item.localizacao.trim() === "") {
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
          type="number"
          class="form-control form-control-sm campo-quantidade"
          data-indice="${indice}"
          value="${item.quantidade}"
          min="0"
          step="0.01"
          >
          
              <button type="button" class="btn btn-sm btn-outline-secondary btn-aumentar" data-indice="${indice}">
              +
              </button>
              </div>
              </td>
              <td>${item.localizacao || ""}</td>
              `;
      
      estoqueTabela.appendChild(novaLinha);
      const botaoEditar = novaLinha.querySelector(".btn-editar");
      const botaoRemover = novaLinha.querySelector(".btn-remover");
      const botaoDiminuir = novaLinha.querySelector(".btn-diminuir");
      const botaoAumentar = novaLinha.querySelector(".btn-aumentar");
      const campoQuantidade = novaLinha.querySelector(".campo-quantidade");
      
      botaoEditar.addEventListener("click", function () {
        const itemExistente = itensEstoque[indice];
        
        document.getElementById("item-nome").value = itemExistente.nome;
        document.getElementById("item-quantidade").value = itemExistente.quantidade;
        
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
        
        const localizacaoExisteNaLista = Array.from(campoLocalizacao.options).some(function (option) {
          return option.value === itemExistente.localizacao;
        });
          if (!itemExistente.localizacao) {
            
            campoLocalizacao.value = "";
            campoLocalizacaoOutraWrapper.classList.add("d-none");
            campoLocalizacaoOutra.required = false;
            campoLocalizacaoOutra.value = "";
          } else if (localizacaoExisteNaLista) {
            campoLocalizacao.value = itemExistente.localizacao;
            campoLocalizacaoOutraWrapper.classList.add("d-none");
            campoLocalizacaoOutra.required = false;
            campoLocalizacaoOutra.value = "";
          } else {
            campoLocalizacao.value = "outro(s)";
            campoLocalizacaoOutraWrapper.classList.remove("d-none");
            campoLocalizacaoOutra.required = true;
            campoLocalizacaoOutra.value = "";
          }
        
        indiceEdicao = indice;
        modalBootstrap.show();
      });
      botaoRemover.addEventListener("click", function () {
        const desejaRemover = confirm("Deseja remover este item do estoque?");
        
        if (!desejaRemover) {
          return;
        }
        
        itensEstoque.splice(indice, 1);
        salvarEstoque();
        renderizarTabela();
      });

      botaoDiminuir.addEventListener("click", function () {
        let quantidadeAtual = parseFloat(itensEstoque[indice].quantidade);
        if (isNaN(quantidadeAtual)) {
          quantidadeAtual = 0;
        }
        
        quantidadeAtual = Math.max(0, quantidadeAtual - 1);
        itensEstoque[indice].quantidade = quantidadeAtual;
        
        salvarEstoque();
        renderizarTabela();
      });
      
      botaoAumentar.addEventListener("click", function () {
        let quantidadeAtual = parseFloat(itensEstoque[indice].quantidade);
        
        if (isNaN(quantidadeAtual)) {
          quantidadeAtual = 0;
        }
        
        quantidadeAtual = quantidadeAtual + 1;
        itensEstoque[indice].quantidade = quantidadeAtual;
        
        salvarEstoque();
        renderizarTabela();
      });
      
      campoQuantidade.addEventListener("change", function () {
        const valorDigitado = campoQuantidade.value.trim().replace(",", ".");
        let novaQuantidade = parseFloat(valorDigitado);
        
        if (isNaN(novaQuantidade) || novaQuantidade < 0) {
          novaQuantidade = 0;
        }
        
        itensEstoque[indice].quantidade = novaQuantidade;
        
        salvarEstoque();
        renderizarTabela();
      });
    });
  }
  
  // Formata números no padrão brasileiro
  function formatarNumero(valor) {
    return valor.toLocaleString("pt-BR");
  }
});
