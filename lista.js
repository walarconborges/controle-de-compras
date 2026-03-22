// Espera o HTML carregar completamente antes de executar o código
document.addEventListener("DOMContentLoaded", function () {
  const CHAVE_ESTOQUE = "controleComprasEstoque";

  // Seleciona os elementos principais da página
  const listaForm = document.getElementById("lista-form");
  const listaTabela = document.getElementById("lista-tabela");

  const campoUnidade = document.getElementById("lista-item-unidade");
  const campoUnidadeOutraWrapper = document.getElementById("campo-lista-unidade-outra-wrapper");
  const campoUnidadeOutra = document.getElementById("campo-lista-unidade-outra");

  const campoMensagem = document.getElementById("lista-mensagem");
  const modalElement = document.getElementById("modalAdicionarItemLista");

  // Cria uma instância do modal do Bootstrap
  const modalBootstrap = bootstrap.Modal.getOrCreateInstance(modalElement);

  // Carrega o estoque salvo no navegador
  let itensEstoque = carregarEstoque();

  // Renderiza a tabela ao abrir a página
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

  // Limpa o modal ao fechar
  modalElement.addEventListener("hidden.bs.modal", function () {
    listaForm.reset();
    campoUnidade.value = "unidade(s)";
    campoUnidadeOutraWrapper.classList.add("d-none");
    campoUnidadeOutra.required = false;
    campoUnidadeOutra.value = "";
    campoMensagem.textContent = "";
  });

  // Escuta o envio do formulário
  listaForm.addEventListener("submit", function (event) {
    event.preventDefault();

    campoMensagem.textContent = "";

    const nome = document.getElementById("lista-item-nome").value.trim();
    let unidade = campoUnidade.value;

    if (unidade === "outro(s)") {
      unidade = campoUnidadeOutra.value.trim();
    }

    if (!nome || !unidade) {
      campoMensagem.textContent = "Preencha todos os campos corretamente.";
      return;
    }

    // Verifica duplicidade por nome + unidade
    const indiceExistente = itensEstoque.findIndex(function (item) {
      return (
        item.nome.trim().toLowerCase() === nome.trim().toLowerCase() &&
        item.unidade.trim().toLowerCase() === unidade.trim().toLowerCase()
      );
    });

    if (indiceExistente !== -1) {
      campoMensagem.textContent = "Este item já existe no estoque.";
      return;
    }

    // Cria item novo no estoque com quantidade 0 e localização vazia
    const novoItem = {
      nome: nome,
      unidade: unidade,
      quantidade: 0,
      localizacao: ""
    };

    itensEstoque.push(novoItem);
    salvarEstoque();
    renderizarTabela();
    modalBootstrap.hide();
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
    listaTabela.innerHTML = "";

    if (itensEstoque.length === 0) {
      listaTabela.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted">
            Nenhum item disponível na lista até o momento.
          </td>
        </tr>
      `;
      return;
    }

    // Ordena:
    // 1. quantidade 0 primeiro
    // 2. depois ordem alfabética
    const itensOrdenados = [...itensEstoque].sort(function (a, b) {
      if (a.quantidade === 0 && b.quantidade !== 0) {
        return -1;
      }

      if (a.quantidade !== 0 && b.quantidade === 0) {
        return 1;
      }

      return a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });
    });

    itensOrdenados.forEach(function (item) {
      const novaLinha = document.createElement("tr");

      if (item.quantidade === 0) {
        novaLinha.classList.add("status-danger");
      }

      if (!item.localizacao || item.localizacao.trim() === "") {
        novaLinha.classList.add("status-location-empty");
      }

      novaLinha.innerHTML = `
        <td>
          <input type="checkbox" class="form-check-input">
        </td>
        <td>${item.nome}</td>
        <td>${item.unidade}</td>
        <td>${formatarNumero(item.quantidade)}</td>
        <td>${item.localizacao || ""}</td>
      `;

      listaTabela.appendChild(novaLinha);
    });
  }

  function formatarNumero(valor) {
    return valor.toLocaleString("pt-BR");
  }
});
