document.addEventListener("DOMContentLoaded", function () {
  const CHAVE_HISTORICO_COMPRAS = "controleComprasHistoricoCompras";
  const CHAVE_MOVIMENTACOES_ESTOQUE = "controleComprasMovimentacoesEstoque";
  
  const tabButtons = document.querySelectorAll("#consumo-tabs .nav-link");
  const tabSections = document.querySelectorAll(".tab-content-section");
  const resultadoCompras = document.querySelector("#resultado-compras tbody");
  const resultadoConsumo = document.querySelector("#resultado-consumo tbody");

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
  renderizarConsumo();

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
  
  function renderizarConsumo() {
    const movimentacoes = carregarMovimentacoesEstoque();
    const consumos = movimentacoes.filter(function (mov) {
      return Number(mov.variacao) < 0;
    });
    
    resultadoConsumo.innerHTML = "";
    
    if (consumos.length === 0) {
      resultadoConsumo.innerHTML = `
      <tr>
      <td colspan="5" class="text-center text-muted">
      Nenhum dado de consumo disponível até o momento.
      </td>
      </tr>
      `;
      return;
    }
    
    consumos.forEach(function (mov) {
      const consumo = Math.abs(Number(mov.variacao));
      const dataFormatada = new Date(mov.data).toLocaleDateString("pt-BR");
      
      const linha = document.createElement("tr");
      linha.innerHTML = `
      <td>${dataFormatada}</td>
      <td>${mov.nome}</td>
      <td>${mov.unidade}</td>
      <td>${formatarNumero(consumo)}</td>
      <td>${mov.tipo}</td>
      `;
      
      resultadoConsumo.appendChild(linha);
    });
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
