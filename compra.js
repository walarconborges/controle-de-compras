// Espera o HTML carregar completamente antes de executar o código
document.addEventListener("DOMContentLoaded", function () {
  // Seleciona os elementos principais da página
  const compraForm = document.getElementById("compra-form");
  const compraTabela = document.getElementById("compra-tabela");
  const totalCompra = document.getElementById("total-compra");

  const campoUnidade = document.getElementById("compra-unidade");
  const campoUnidadeOutraWrapper = document.getElementById("campo-compra-unidade-outra-wrapper");
  const campoUnidadeOutra = document.getElementById("campo-compra-unidade-outra");

  const campoMensagem = document.getElementById("compra-mensagem");
  const modalElement = document.getElementById("modalAdicionarCompra");

  // Cria uma instância do modal do Bootstrap para poder fechá-lo via JavaScript
  const modalBootstrap = bootstrap.Modal.getOrCreateInstance(modalElement);

  // Guarda o valor total acumulado da compra
  let totalAcumulado = 0;

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

  // Escuta o envio do formulário
  compraForm.addEventListener("submit", function (event) {
    // Impede o recarregamento da página
    event.preventDefault();

    // Limpa mensagem antiga
    campoMensagem.textContent = "";

    // Captura os valores digitados/selecionados
    const item = document.getElementById("compra-item").value.trim();
    const quantidadeTexto = document.getElementById("compra-quantidade").value.trim();
    let unidade = campoUnidade.value;
    const valorUnitarioTexto = document.getElementById("compra-valor-unitario").value.trim();

    // Se a unidade for "outro(s)", usa o valor digitado manualmente
    if (unidade === "outro(s)") {
      unidade = campoUnidadeOutra.value.trim();
    }

    // Troca vírgula por ponto para aceitar os dois formatos
    const quantidadeNormalizada = quantidadeTexto.replace(",", ".");
    const valorUnitarioNormalizado = valorUnitarioTexto.replace(",", ".");

    // Converte para número
    const quantidade = parseFloat(quantidadeNormalizada);
    const valorUnitario = parseFloat(valorUnitarioNormalizado);

    // Validação básica
    if (!item || !unidade || isNaN(quantidade) || isNaN(valorUnitario)) {
      campoMensagem.textContent = "Preencha todos os campos corretamente.";
      return;
    }

    // Impede valores negativos
    if (quantidade < 0 || valorUnitario < 0) {
      campoMensagem.textContent = "Quantidade e valor não podem ser negativos.";
      return;
    }

    // Remove a mensagem de tabela vazia, se ela ainda existir
    const linhaVazia = compraTabela.querySelector("td[colspan='5']");
    if (linhaVazia) {
      linhaVazia.parentElement.remove();
    }

    // Calcula o subtotal do item
    const subtotal = quantidade * valorUnitario;

    // Atualiza o total acumulado
    totalAcumulado += subtotal;

    // Cria uma nova linha na tabela
    const novaLinha = document.createElement("tr");

    // Insere o conteúdo da linha
    novaLinha.innerHTML = `
      <td>${item}</td>
      <td>${formatarNumero(quantidade)}</td>
      <td>${unidade}</td>
      <td>R$ ${formatarMoeda(valorUnitario)}</td>
      <td>R$ ${formatarMoeda(subtotal)}</td>
    `;

    // Adiciona a nova linha na tabela
    compraTabela.appendChild(novaLinha);

    // Atualiza o total exibido na tela
    totalCompra.textContent = formatarMoeda(totalAcumulado);

    // Limpa o formulário
    compraForm.reset();

    // Esconde novamente o campo manual de unidade
    campoUnidadeOutraWrapper.classList.add("d-none");
    campoUnidadeOutra.required = false;
    campoUnidadeOutra.value = "";

    // Fecha o modal
    modalBootstrap.hide();
  });

  // Formata números comuns
  function formatarNumero(valor) {
    return valor.toLocaleString("pt-BR");
  }

  // Formata valores monetários no padrão brasileiro
  function formatarMoeda(valor) {
    return valor.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
});
