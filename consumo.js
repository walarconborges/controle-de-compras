document.addEventListener("DOMContentLoaded", function () {
  const CHAVE_HISTORICO_COMPRAS = "controleComprasHistoricoCompras";
  const CHAVE_MOVIMENTACOES_ESTOQUE = "controleComprasMovimentacoesEstoque";

  const visualizacaoConsumo = document.getElementById("visualizacao-consumo");
  const visualizacaoCompras = document.getElementById("visualizacao-compras");
  const agrupamentoConsumo = document.getElementById("agrupamento-consumo");

  const resultadoConsumoContainer = document.getElementById("resultado-consumo");
  const resultadoComprasContainer = document.getElementById("resultado-compras");

  let graficoCompras = null;
  let graficoConsumo = null;

  if (
    !visualizacaoConsumo ||
    !visualizacaoCompras ||
    !agrupamentoConsumo ||
    !resultadoConsumoContainer ||
    !resultadoComprasContainer
  ) {
    console.error("Estrutura HTML das visualizações de consumo/compras não encontrada.");
    return;
  }

  visualizacaoConsumo.addEventListener("change", function () {
    renderizarConsumo();
  });

  visualizacaoCompras.addEventListener("change", function () {
    renderizarCompras();
  });

  agrupamentoConsumo.addEventListener("change", function () {
    renderizarConsumo();
  });

  renderizarCompras();
  renderizarConsumo();

  function carregarHistoricoCompras() {
    const dadosSalvos = localStorage.getItem(CHAVE_HISTORICO_COMPRAS);

    if (!dadosSalvos) {
      return [];
    }

    try {
      const dados = JSON.parse(dadosSalvos);
      return Array.isArray(dados) ? dados : [];
    } catch (erro) {
      console.error("Erro ao carregar histórico de compras:", erro);
      return [];
    }
  }

  function carregarMovimentacoesEstoque() {
    const dadosSalvos = localStorage.getItem(CHAVE_MOVIMENTACOES_ESTOQUE);

    if (!dadosSalvos) {
      return [];
    }

    try {
      const dados = JSON.parse(dadosSalvos);
      return Array.isArray(dados) ? dados : [];
    } catch (erro) {
      console.error("Erro ao carregar movimentações do estoque:", erro);
      return [];
    }
  }

  function renderizarCompras() {
    const historico = carregarHistoricoCompras();
    const modo = visualizacaoCompras.value;

    if (historico.length === 0) {
      destruirGraficoCompras();

      resultadoComprasContainer.innerHTML = `
        <div class="table-responsive">
          <table class="table table-bordered table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th scope="col">Data da compra</th>
                <th scope="col">Total da compra</th>
                <th scope="col">Quantidade de itens</th>
                <th scope="col">Média por compra</th>
                <th scope="col">Média por item</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="5" class="text-center text-muted">
                  Nenhum dado de compra disponível até o momento.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
      return;
    }

    if (modo === "tabela") {
      renderizarComprasTabela(historico);
      return;
    }

    if (modo === "lista") {
      renderizarComprasLista(historico);
      return;
    }

    if (modo === "barras") {
      renderizarComprasBarras(historico);
      return;
    }

    if (modo === "pizza") {
      renderizarComprasPizza(historico);
      return;
    }

    if (modo === "linha-do-tempo") {
      renderizarComprasLinhaDoTempo(historico);
      return;
    }

    renderizarComprasTabela(historico);
  }

  function renderizarConsumo() {
    const movimentacoes = carregarMovimentacoesEstoque();
    const consumos = movimentacoes.filter(function (mov) {
      return Number(mov.variacao) < 0 && mov.data;
    });

    const modo = visualizacaoConsumo.value;
    const agrupamento = agrupamentoConsumo.value;

    if (consumos.length === 0) {
      destruirGraficoConsumo();

      resultadoConsumoContainer.innerHTML = `
        <div class="table-responsive">
          <table class="table table-bordered table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th scope="col">${agrupamento === "categoria" ? "Categoria" : "Item"}</th>
                ${agrupamento === "categoria" ? "" : '<th scope="col">Unidade</th>'}
                <th scope="col">Data inicial</th>
                <th scope="col">Data final</th>
                <th scope="col">Dias no período</th>
                <th scope="col">Consumo total</th>
                <th scope="col">Média diária</th>
                <th scope="col">Ocorrências</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="${agrupamento === "categoria" ? "7" : "8"}" class="text-center text-muted">
                  Nenhum dado de consumo disponível até o momento.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
      return;
    }

    const dadosConsolidados = consolidarConsumos(consumos, agrupamento);

    if (modo === "tabela") {
      renderizarConsumoTabela(dadosConsolidados, agrupamento);
      return;
    }

    if (modo === "lista") {
      renderizarConsumoLista(dadosConsolidados, agrupamento);
      return;
    }

    if (modo === "barras") {
      renderizarConsumoBarras(dadosConsolidados, agrupamento);
      return;
    }

    if (modo === "linha-do-tempo") {
      renderizarConsumoLinhaDoTempo(dadosConsolidados, agrupamento);
      return;
    }

    renderizarConsumoTabela(dadosConsolidados, agrupamento);
  }

  function calcularDiasNoPeriodo(dataInicial, dataFinal) {
    const umDiaEmMs = 1000 * 60 * 60 * 24;
    const diferencaEmMs = dataFinal - dataInicial;
    return Math.floor(diferencaEmMs / umDiaEmMs) + 1;
  }

  function consolidarConsumos(consumos, agrupamento) {
    const grupos = {};

    consumos.forEach(function (mov) {
      const dataMov = new Date(mov.data);
      const consumo = Math.abs(Number(mov.variacao));

      if (isNaN(dataMov.getTime()) || Number.isNaN(consumo)) {
        return;
      }

      let chave = "";
      let nomeExibicao = "";
      let unidadeExibicao = "";

      if (agrupamento === "categoria") {
        nomeExibicao = mov.categoria && String(mov.categoria).trim()
          ? String(mov.categoria).trim()
          : "Sem categoria";
        chave = normalizarTexto(nomeExibicao);
      } else {
        if (!mov.nome || !mov.unidade) {
          return;
        }

        nomeExibicao = String(mov.nome).trim();
        unidadeExibicao = String(mov.unidade).trim();
        chave = `${normalizarTexto(nomeExibicao)}||${normalizarTexto(unidadeExibicao)}`;
      }

      if (!grupos[chave]) {
        grupos[chave] = {
          nome: nomeExibicao,
          unidade: unidadeExibicao,
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

    return Object.values(grupos)
      .map(function (grupo) {
        const diasNoPeriodo = calcularDiasNoPeriodo(grupo.dataInicial, grupo.dataFinal);
        const mediaDiaria = diasNoPeriodo > 0
          ? grupo.consumoTotal / diasNoPeriodo
          : grupo.consumoTotal;

        return {
          nome: grupo.nome,
          unidade: grupo.unidade,
          dataInicial: grupo.dataInicial,
          dataFinal: grupo.dataFinal,
          diasNoPeriodo: diasNoPeriodo,
          consumoTotal: grupo.consumoTotal,
          mediaDiaria: mediaDiaria,
          ocorrencias: grupo.ocorrencias
        };
      })
      .sort(function (a, b) {
        return a.nome.localeCompare(b.nome, "pt-BR");
      });
  }

  function renderizarComprasTabela(historico) {
    destruirGraficoCompras();

    let linhas = "";

    historico.forEach(function (compra) {
      const total = Number(compra.total) || 0;
      const quantidadeItens = Number(compra.quantidadeItens) || 0;
      const mediaPorCompra = total;
      const mediaPorItem = quantidadeItens > 0 ? total / quantidadeItens : 0;

      linhas += `
        <tr>
          <td>${escaparHtml(formatarData(compra.data))}</td>
          <td>R$ ${formatarMoeda(total)}</td>
          <td>${formatarNumeroInteiro(quantidadeItens)}</td>
          <td>R$ ${formatarMoeda(mediaPorCompra)}</td>
          <td>R$ ${formatarMoeda(mediaPorItem)}</td>
        </tr>
      `;
    });

    resultadoComprasContainer.innerHTML = `
      <div class="table-responsive">
        <table class="table table-bordered table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th scope="col">Data da compra</th>
              <th scope="col">Total da compra</th>
              <th scope="col">Quantidade de itens</th>
              <th scope="col">Média por compra</th>
              <th scope="col">Média por item</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    `;
  }

  function renderizarComprasLista(historico) {
    destruirGraficoCompras();

    const blocos = historico.map(function (compra) {
      const total = Number(compra.total) || 0;
      const quantidadeItens = Number(compra.quantidadeItens) || 0;
      const mediaPorItem = quantidadeItens > 0 ? total / quantidadeItens : 0;

      return `
        <div class="border rounded p-3 mb-3">
          <div><strong>Data:</strong> ${escaparHtml(formatarData(compra.data))}</div>
          <div><strong>Total:</strong> R$ ${formatarMoeda(total)}</div>
          <div><strong>Itens:</strong> ${formatarNumeroInteiro(quantidadeItens)}</div>
          <div><strong>Média por compra:</strong> R$ ${formatarMoeda(total)}</div>
          <div><strong>Média por item:</strong> R$ ${formatarMoeda(mediaPorItem)}</div>
        </div>
      `;
    }).join("");

    resultadoComprasContainer.innerHTML = blocos;
  }

  function renderizarComprasBarras(historico) {
    const historicoOrdenado = historico.slice().sort(function (a, b) {
      return new Date(a.data) - new Date(b.data);
    });

    const labels = historicoOrdenado.map(function (compra) {
      return formatarData(compra.data);
    });

    const valores = historicoOrdenado.map(function (compra) {
      return Number(compra.total) || 0;
    });

    resultadoComprasContainer.innerHTML = `
      <div class="p-3 bg-white rounded">
        <canvas id="grafico-compras-barras"></canvas>
      </div>
    `;

    const canvas = document.getElementById("grafico-compras-barras");

    if (!canvas) {
      return;
    }

    destruirGraficoCompras();

    graficoCompras = new Chart(canvas, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Total das compras",
            data: valores
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });

    canvas.parentElement.style.height = "320px";
  }

  function renderizarComprasPizza(historico) {
    const historicoOrdenado = historico.slice().sort(function (a, b) {
      return new Date(a.data) - new Date(b.data);
    });

    const labels = historicoOrdenado.map(function (compra) {
      return formatarData(compra.data);
    });

    const valores = historicoOrdenado.map(function (compra) {
      return Number(compra.total) || 0;
    });

    resultadoComprasContainer.innerHTML = `
      <div class="p-3 bg-white rounded">
        <canvas id="grafico-compras-pizza"></canvas>
      </div>
    `;

    const canvas = document.getElementById("grafico-compras-pizza");

    if (!canvas) {
      return;
    }

    destruirGraficoCompras();

    graficoCompras = new Chart(canvas, {
      type: "pie",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Participação das compras",
            data: valores
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });

    canvas.parentElement.style.height = "320px";
  }

  function renderizarComprasLinhaDoTempo(historico) {
    const historicoOrdenado = historico.slice().sort(function (a, b) {
      return new Date(a.data) - new Date(b.data);
    });

    const labels = historicoOrdenado.map(function (compra) {
      return formatarData(compra.data);
    });

    const valores = historicoOrdenado.map(function (compra) {
      return Number(compra.total) || 0;
    });

    resultadoComprasContainer.innerHTML = `
      <div class="p-3 bg-white rounded">
        <canvas id="grafico-compras-linha-tempo"></canvas>
      </div>
    `;

    const canvas = document.getElementById("grafico-compras-linha-tempo");

    if (!canvas) {
      return;
    }

    destruirGraficoCompras();

    graficoCompras = new Chart(canvas, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Evolução das compras",
            data: valores,
            fill: false,
            tension: 0.2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });

    canvas.parentElement.style.height = "320px";
  }

  function renderizarConsumoTabela(dados, agrupamento) {
    destruirGraficoConsumo();

    const linhas = dados.map(function (grupo) {
      if (agrupamento === "categoria") {
        return `
          <tr>
            <td>${escaparHtml(grupo.nome)}</td>
            <td>${escaparHtml(formatarData(grupo.dataInicial))}</td>
            <td>${escaparHtml(formatarData(grupo.dataFinal))}</td>
            <td>${formatarNumeroInteiro(grupo.diasNoPeriodo)}</td>
            <td>${formatarNumero(grupo.consumoTotal)}</td>
            <td>${formatarNumero(grupo.mediaDiaria)}</td>
            <td>${formatarNumeroInteiro(grupo.ocorrencias)}</td>
          </tr>
        `;
      }

      return `
        <tr>
          <td>${escaparHtml(grupo.nome)}</td>
          <td>${escaparHtml(grupo.unidade)}</td>
          <td>${escaparHtml(formatarData(grupo.dataInicial))}</td>
          <td>${escaparHtml(formatarData(grupo.dataFinal))}</td>
          <td>${formatarNumeroInteiro(grupo.diasNoPeriodo)}</td>
          <td>${formatarNumero(grupo.consumoTotal)}</td>
          <td>${formatarNumero(grupo.mediaDiaria)}</td>
          <td>${formatarNumeroInteiro(grupo.ocorrencias)}</td>
        </tr>
      `;
    }).join("");

    if (agrupamento === "categoria") {
      resultadoConsumoContainer.innerHTML = `
        <div class="table-responsive">
          <table class="table table-bordered table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th scope="col">Categoria</th>
                <th scope="col">Data inicial</th>
                <th scope="col">Data final</th>
                <th scope="col">Dias no período</th>
                <th scope="col">Consumo total</th>
                <th scope="col">Média diária</th>
                <th scope="col">Ocorrências</th>
              </tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>
        </div>
      `;
      return;
    }

    resultadoConsumoContainer.innerHTML = `
      <div class="table-responsive">
        <table class="table table-bordered table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th scope="col">Item</th>
              <th scope="col">Unidade</th>
              <th scope="col">Data inicial</th>
              <th scope="col">Data final</th>
              <th scope="col">Dias no período</th>
              <th scope="col">Consumo total</th>
              <th scope="col">Média diária</th>
              <th scope="col">Ocorrências</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    `;
  }

  function renderizarConsumoLista(dados, agrupamento) {
    destruirGraficoConsumo();

    const blocos = dados.map(function (grupo) {
      if (agrupamento === "categoria") {
        return `
          <div class="border rounded p-3 mb-3">
            <div><strong>Categoria:</strong> ${escaparHtml(grupo.nome)}</div>
            <div><strong>Período:</strong> ${escaparHtml(formatarData(grupo.dataInicial))} até ${escaparHtml(formatarData(grupo.dataFinal))}</div>
            <div><strong>Dias no período:</strong> ${formatarNumeroInteiro(grupo.diasNoPeriodo)}</div>
            <div><strong>Consumo total:</strong> ${formatarNumero(grupo.consumoTotal)}</div>
            <div><strong>Média diária:</strong> ${formatarNumero(grupo.mediaDiaria)}</div>
            <div><strong>Ocorrências:</strong> ${formatarNumeroInteiro(grupo.ocorrencias)}</div>
          </div>
        `;
      }

      return `
        <div class="border rounded p-3 mb-3">
          <div><strong>Item:</strong> ${escaparHtml(grupo.nome)}</div>
          <div><strong>Unidade:</strong> ${escaparHtml(grupo.unidade)}</div>
          <div><strong>Período:</strong> ${escaparHtml(formatarData(grupo.dataInicial))} até ${escaparHtml(formatarData(grupo.dataFinal))}</div>
          <div><strong>Dias no período:</strong> ${formatarNumeroInteiro(grupo.diasNoPeriodo)}</div>
          <div><strong>Consumo total:</strong> ${formatarNumero(grupo.consumoTotal)}</div>
          <div><strong>Média diária:</strong> ${formatarNumero(grupo.mediaDiaria)}</div>
          <div><strong>Ocorrências:</strong> ${formatarNumeroInteiro(grupo.ocorrencias)}</div>
        </div>
      `;
    }).join("");

    resultadoConsumoContainer.innerHTML = blocos;
  }

  function renderizarConsumoBarras(dados, agrupamento) {
    const labels = dados.map(function (grupo) {
      return agrupamento === "categoria"
        ? grupo.nome
        : `${grupo.nome} (${grupo.unidade})`;
    });

    const valores = dados.map(function (grupo) {
      return Number(grupo.consumoTotal) || 0;
    });

    resultadoConsumoContainer.innerHTML = `
      <div class="p-3 bg-white rounded">
        <canvas id="grafico-consumo-barras"></canvas>
      </div>
    `;

    const canvas = document.getElementById("grafico-consumo-barras");

    if (!canvas) {
      return;
    }

    destruirGraficoConsumo();

    graficoConsumo = new Chart(canvas, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: agrupamento === "categoria" ? "Consumo total por categoria" : "Consumo total",
            data: valores
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });

    canvas.parentElement.style.height = "320px";
  }

  function renderizarConsumoLinhaDoTempo(dados, agrupamento) {
    const dadosOrdenados = dados.slice().sort(function (a, b) {
      return new Date(a.dataFinal) - new Date(b.dataFinal);
    });

    const labels = dadosOrdenados.map(function (grupo) {
      return formatarData(grupo.dataFinal);
    });

    const valores = dadosOrdenados.map(function (grupo) {
      return Number(grupo.consumoTotal) || 0;
    });

    resultadoConsumoContainer.innerHTML = `
      <div class="p-3 bg-white rounded">
        <canvas id="grafico-consumo-linha-tempo"></canvas>
      </div>
    `;

    const canvas = document.getElementById("grafico-consumo-linha-tempo");

    if (!canvas) {
      return;
    }

    destruirGraficoConsumo();

    graficoConsumo = new Chart(canvas, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: agrupamento === "categoria" ? "Evolução do consumo por categoria" : "Evolução do consumo",
            data: valores,
            fill: false,
            tension: 0.2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });

    canvas.parentElement.style.height = "320px";
  }

  function destruirGraficoCompras() {
    if (graficoCompras) {
      graficoCompras.destroy();
      graficoCompras = null;
    }
  }

  function destruirGraficoConsumo() {
    if (graficoConsumo) {
      graficoConsumo.destroy();
      graficoConsumo = null;
    }
  }

  function normalizarTexto(valor) {
    return String(valor || "").trim().toLowerCase();
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

  function formatarNumeroInteiro(valor) {
    return Number(valor).toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  function formatarMoeda(valor) {
    return Number(valor).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function escaparHtml(valor) {
    return String(valor || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
