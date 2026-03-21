// Espera o HTML carregar completamente antes de executar o código
document.addEventListener("DOMContentLoaded", function () {
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

  // Cria uma instância do modal do Bootstrap para poder fechá-lo via JavaScript
  const modalBootstrap = bootstrap.Modal.getOrCreateInstance(modalElement);
  
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
    const quantidade = document.getElementById("item-quantidade").value.trim();
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
    if (!nome || !unidade || !quantidade || !localizacao) {
      campoMensagem.textContent = "Preencha todos os campos.";
      return;
    }

    if (quantidade < 0) {
      campoMensagem.textContent = "A quantidade não pode ser negativa.";
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

    if (quantidade === "0") {
      classeDestaque = "status-danger";

    // Insere o conteúdo da linha
    novaLinha.className = classeDestaque;
    novaLinha.innerHTML = `
      <td>${nome}</td>
      <td>${unidade}</td>
      <td>${formatarNumero(quantidade)}</td>
      <td>${localizacao}</td>
    `;

    // Adiciona a nova linha na tabela
    estoqueTabela.appendChild(novaLinha);

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

  // Formata números no padrão brasileiro
  function formatarNumero(valor) {
    return valor.toLocaleString("pt-BR");
  }
});
