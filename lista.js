document.addEventListener("DOMContentLoaded", function () {
  const CHAVE_ESTOQUE = "controleComprasEstoque";

  const listaForm = document.getElementById("lista-form");
  const listaTabela = document.getElementById("lista-tabela");

  const campoUnidade = document.getElementById("lista-item-unidade");
  const campoUnidadeOutraWrapper = document.getElementById("campo-lista-unidade-outra-wrapper");
  const campoUnidadeOutra = document.getElementById("campo-lista-unidade-outra");

  const campoMensagem = document.getElementById("lista-mensagem");
  const modalElement = document.getElementById("modalAdicionarItemLista");

  const modalBootstrap = bootstrap.Modal.getOrCreateInstance(modalElement);

  let itensEstoque = carregarEstoque();

  renderizarTabela();

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

  modalElement.addEventListener("hidden.bs.modal", function () {
    listaForm.reset();
    campoUnidade.value = "unidade(s)";
    campoUnidadeOutraWrapper.classList.add("d-none");
    campoUnidadeOutra.required = false;
    campoUnidadeOutra.value = "";
    campoMensagem.textContent = "";
  });

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

    const novoItem = {
      nome: nome,
      unidade: unidade,
      quantidade: 0,
      categoria: ""
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

    const itensOrdenados = [...itensEstoque].sort(function (a, b) {
      if (Number(a.quantidade) === 0 && Number(b.quantidade) !== 0) {
        return -1;
      }

      if (Number(a.quantidade) !== 0 && Number(b.quantidade) === 0) {
        return 1;
      }

      return a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });
    });

    itensOrdenados.forEach(function (item) {
      const novaLinha = document.createElement("tr");

      if (Number(item.quantidade) === 0) {
        novaLinha.classList.add("status-danger");
      }

      if (!item.categoria || item.categoria.trim() === "") {
        novaLinha.classList.add("status-location-empty");
      }

      novaLinha.innerHTML = `
        <td>
          <input type="checkbox" class="form-check-input">
        </td>
        <td>${item.nome}</td>
        <td>${item.unidade}</td>
        <td>${formatarNumero(Number(item.quantidade) || 0)}</td>
        <td>${item.categoria || ""}</td>
      `;

      listaTabela.appendChild(novaLinha);
    });
  }

  function formatarNumero(valor) {
    return Number(valor).toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }
});
