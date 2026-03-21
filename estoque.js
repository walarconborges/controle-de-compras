// Espera o HTML carregar completamente antes de executar o código
document.addEventListener("DOMContentLoaded", function () {
  // Seleciona os elementos principais da página
  const estoqueForm = document.getElementById("estoque-form");
  const estoqueTabela = document.getElementById("estoque-tabela");
  const campoLocalizacao = document.getElementById("item-localizacao");
  const campoLocalizacaoOutraWrapper = document.getElementById("campo-localizacao-outra-wrapper");
  const campoLocalizacaoOutra = document.getElementById("campo-localizacao-outra");
  const campoMensagem = document.getElementById("estoque-mensagem");
  const modalElement = document.getElementById("modalAdicionarItem");

  // Cria uma instância do modal do Bootstrap para poder fechá-lo via JavaScript
  const modalBootstrap = bootstrap.Modal.getOrCreateInstance(modalElement);

  // Observa mudanças no campo de localização
  campoLocalizacao.addEventListener("change", function () {
    // Se a pessoa escolher "outro", mostra o campo manual
    if (campoLocalizacao.value === "outro") {
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
    const unidade = document.getElementById("item-unidade").value;
    const quantidade = document.getElementById("item-quantidade").value;
    let localizacao = campoLocalizacao.value;

    // Se a localização for "outro", usa o valor digitado manualmente
    if (localizacao === "outro") {
      localizacao = campoLocalizacaoOutra.value.trim();
    }

    // Validação básica
    if (!nome || !unidade || !quantidade || !localizacao) {
      campoMensagem.textContent = "Preencha todos os campos.";
      return;
    }

    // Remove a mensagem de tabela vazia, se ela ainda existir
    const linhaVazia = estoqueTabela.querySelector("td[colspan='4']");
    if (linhaVazia) {
      linhaVazia.parentElement.remove();
    }

    // Cria uma nova linha na tabela
    const novaLinha = document.createElement("tr");

    // Define a classe de destaque conforme a quantidade
    let classeDestaque = "";

    if (quantidade === "0" || quantidade === "vazio") {
      classeDestaque = "status-danger";
    } else if (quantidade === "quase vazio") {
      classeDestaque = "status-warning";
    }

    // Insere o conteúdo da linha
    novaLinha.className = classeDestaque;
    novaLinha.innerHTML = `
      <td>${nome}</td>
      <td>${unidade}</td>
      <td>${quantidade}</td>
      <td>${localizacao}</td>
    `;

    // Adiciona a nova linha na tabela
    estoqueTabela.appendChild(novaLinha);

    // Limpa o formulário
    estoqueForm.reset();

    // Esconde novamente o campo de localização manual
    campoLocalizacaoOutraWrapper.classList.add("d-none");
    campoLocalizacaoOutra.required = false;
    campoLocalizacaoOutra.value = "";

    // Fecha o modal
    modalBootstrap.hide();
  });
});
