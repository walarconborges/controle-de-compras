document.addEventListener("DOMContentLoaded", function () {
  const CHAVE_HISTORICO_COMPRAS = "controleComprasHistoricoCompras";

  const tabButtons = document.querySelectorAll("#consumo-tabs .nav-link");
  const tabSections = document.querySelectorAll(".tab-content-section");
  const resultadoCompras = document.querySelector("#resultado-compras tbody");

  tabButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const targetTab = button.getAttribute("data-tab");

      tabButtons.forEach(function (tab) {
        tab.classList.remove("active");
      });

      button.classList.add("active");

      tabSections.forEach(function (section) {
        section.classList.remove("active");
      });

      document.getElementById(targetTab).classList.add("active");
    });
  });

  renderizarCompras();

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

  function renderizarCompras() {
    const historico = carregarHistoricoCompras();

    resultadoCompras.innerHTML = "";

    if (historico.length === 0) {
      resultadoCompras.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted">
            Nenhum dado de compra disponível até o momento.
          </td>
        </tr>
      `;
      return;
    }

    historico.forEach(function (compra) {
      const mediaPorCompra = compra.total;
      const mediaPorItem = compra.quantidadeItens > 0
        ? compra.total / compra.quantidadeItens
        : 0;

      const dataFormatada = new Date(compra.data).toLocaleDateString("pt-BR");

      const linha = document.createElement("tr");
      linha.innerHTML = `
        <td>${dataFormatada}</td>
        <td>R$ ${formatarMoeda(compra.total)}</td>
        <td>${compra.quantidadeItens}</td>
        <td>R$ ${formatarMoeda(mediaPorCompra)}</td>
        <td>R$ ${formatarMoeda(mediaPorItem)}</td>
      `;

      resultadoCompras.appendChild(linha);
    });
  }

  function formatarMoeda(valor) {
    return Number(valor).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
});
