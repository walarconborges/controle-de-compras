document.addEventListener("DOMContentLoaded", function () {
  const CHAVE_HISTORICO_COMPRAS = "controleComprasHistoricoCompras";
  const CHAVE_MOVIMENTACOES_ESTOQUE = "controleComprasMovimentacoesEstoque";

  const tabButtons = document.querySelectorAll("#consumo-tabs .nav-link");
  const tabSections = document.querySelectorAll(".tab-content-section");
  const resultadoCompras = document.querySelector("#resultado-compras tbody");
  const resultadoConsumo = document.querySelector("#resultado-consumo tbody");

  if (!resultadoCompras || !resultadoConsumo) {
    console.error("Estrutura HTML das tabelas de consumo/compras não encontrada.");
    return;
  }

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

      const secaoAlvo = document.getElementById(targetTab);
      if (secaoAlvo) {
        secaoAlvo.classList.add("active");
      }
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
      const mediaPorCompra = Number(compra.total) || 0;
      const mediaPorItem = Number(compra.quantidadeItens) > 0
        ? Number(compra.total) / Number(compra.quantidadeItens)
        : 0;

      const dataFormatada = formatarData(compra.data);

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
      return Number(mov.variacao) < 0 && mov.nome && mov.unidade && mov.data;
    });

    resultadoConsumo.innerHTML = "";

    if (consumos.length === 0) {
      resultadoConsumo.innerHTML = `
        <tr>
          <td colspan="8" class="text-center text-muted">
            Nenhum dado de consumo disponível até o momento.
          </td>
        </tr>
      `;
      return;
    }

    const grupos = {};

    consumos.forEach(function (mov) {
      const chave = `${mov.nome}||${mov.unidade}`;
      const dataMov = new Date(mov.data);
      const consumo = Math.abs(Number(mov.variacao));

      if (isNaN(dataMov.getTime())) {
        return;
      }

      if (!grupos[chave]) {
        grupos[chave] = {
          nome: mov.nome,
          unidade: mov.unidade,
          dataInicial: dataMov,
          dataFinal: dataMov,
          consumoTotal: 0,
          ocorrencias: 0
        };
      }

      if (dataMov < grupos[chave].dataInicial) {
        grupos[chave].dataInicial = dataMov;
      }

      if (dataMov > grupos[chave].dataFinal) {
        grupos[chave].dataFinal = dataMov;
      }

      grupos[chave].consumoTotal += consumo;
      grupos[chave].ocorrencias += 1;
    });

    const linhasOrdenadas = Object.values(grupos).sort(function (a, b) {
      return a.nome.localeCompare(b.nome, "pt-BR");
    });

    linhasOrdenadas.forEach(function (grupo) {
      const diasNoPeriodo = calcularDiasNoPeriodo(grupo.dataInicial, grupo.dataFinal);
      const mediaDiaria = diasNoPeriodo > 0
        ? grupo.consumoTotal / diasNoPeriodo
        : grupo.consumoTotal;

      const linha = document.createElement("tr");
      linha.innerHTML = `
        <td>${grupo.nome}</td>
        <td>${grupo.unidade}</td>
        <td>${formatarData(grupo.dataInicial)}</td>
        <td>${formatarData(grupo.dataFinal)}</td>
        <td>${diasNoPeriodo}</td>
        <td>${formatarNumero(grupo.consumoTotal)}</td>
        <td>${formatarNumero(mediaDiaria)}</td>
        <td>${grupo.ocorrencias}</td>
      `;

      resultadoConsumo.appendChild(linha);
    });
  }

  function calcularDiasNoPeriodo(dataInicial, dataFinal) {
    const umDiaEmMs = 1000 * 60 * 60 * 24;
    const diferencaEmMs = dataFinal - dataInicial;
    return Math.floor(diferencaEmMs / umDiaEmMs) + 1;
  }

  function formatarData(valor) {
    const data = valor instanceof Date ? valor : new Date(valor);

    if (isNaN(data.getTime())) {
      return "-";
    }

    return data.toLocaleDateString("pt-BR");
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
