document.addEventListener("DOMContentLoaded", function () {
  const CHAVE_HISTORICO_COMPRAS = "controleComprasHistoricoCompras";
  const CHAVE_MOVIMENTACOES_ESTOQUE = "controleComprasMovimentacoesEstoque";

  const tabButtons = document.querySelectorAll("#consumo-tabs .nav-link");
  const tabSections = document.querySelectorAll(".tab-content-section");
  const visualizacaoConsumo = document.getElementById("visualizacao-consumo");
  const visualizacaoCompras = document.getElementById("visualizacao-compras");
  
  const resultadoConsumoContainer = document.getElementById("resultado-consumo");
  const resultadoComprasContainer = document.getElementById("resultado-compras");

  let graficoCompras = null;
  let graficoConsumo = null;
  
  if (!visualizacaoConsumo || !visualizacaoCompras || !resultadoConsumoContainer || !resultadoComprasContainer) {
    console.error("Estrutura HTML das visualizações de consumo/compras não encontrada.");
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

  visualizacaoConsumo.addEventListener("change", function () {
    renderizarConsumo();
  });
  
  visualizacaoCompras.addEventListener("change", function () {
    renderizarCompras();
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
    const modo = visualizacaoCompras.value;
    
    if (historico.length === 0) {
        if (graficoCompras) {
          graficoCompras.destroy();
          graficoCompras = null;
        }
      
      resultadoComprasContainer.innerHTML = `
        <div class="table-responsive">
        <table class="table table-bordered table-hover align-middle mb-0">
        <thead class="table-light">
        <tr>
        <th>Data da compra</th>
        <th>Total da compra</th>
        <th>Quantidade de itens</th>
        <th>Média por compra</th>
        <th>Média por item</th>
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
    
    const modo = visualizacaoConsumo.value;
    
    if (consumos.length === 0) {
        if (graficoConsumo) {
          graficoConsumo.destroy();
          graficoConsumo = null;
        }
      resultadoConsumoContainer.innerHTML = `
      <div class="table-responsive">
      <table class="table table-bordered table-hover align-middle mb-0">
      <thead class="table-light">
      <tr>
      <th>Item</th>
      <th>Unidade</th>
      <th>Data inicial</th>
      <th>Data final</th>
      <th>Dias no período</th>
      <th>Consumo total</th>
      <th>Média diária</th>
      <th>Ocorrências</th>
      </tr>
      </thead>
      <tbody>
      <tr>
      <td colspan="8" class="text-center text-muted">
      Nenhum dado de consumo disponível até o momento.
      </td>
      </tr>
      </tbody>
      </table>
      </div>
      `;
      return;
    }
    
    const dadosConsolidados = consolidarConsumos(consumos);
    
    if (modo === "tabela") {
      renderizarConsumoTabela(dadosConsolidados);
      return;
    }
    
    if (modo === "lista") {
      renderizarConsumoLista(dadosConsolidados);
      return;
    }
    
    if (modo === "barras") {
      renderizarConsumoBarras(dadosConsolidados);
      return;
    }
    
    if (modo === "linha-do-tempo") {
      renderizarConsumoLinhaDoTempo(dadosConsolidados);
      return;
    }
    
    renderizarConsumoTabela(dadosConsolidados);
  }
  
  function calcularDiasNoPeriodo(dataInicial, dataFinal) {
    const umDiaEmMs = 1000 * 60 * 60 * 24;
    const diferencaEmMs = dataFinal - dataInicial;
    return Math.floor(diferencaEmMs / umDiaEmMs) + 1;
  }

  function consolidarConsumos(consumos) {
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
      if (graficoCompras) {
        graficoCompras.destroy();
        graficoCompras = null;
      }
    let linhas = "";
    
    historico.forEach(function (compra) {
      const mediaPorCompra = Number(compra.total) || 0;
      const mediaPorItem = Number(compra.quantidadeItens) > 0
        ? Number(compra.total) / Number(compra.quantidadeItens)
        : 0;
      
      linhas += `
      <tr>
      <td>${formatarData(compra.data)}</td>
      <td>R$ ${formatarMoeda(compra.total)}</td>
      <td>${compra.quantidadeItens}</td>
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
            <th>Data da compra</th>
            <th>Total da compra</th>
            <th>Quantidade de itens</th>
            <th>Média por compra</th>
            <th>Média por item</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
  `;
}

function renderizarComprasLista(historico) {
  if (graficoCompras) {
    graficoCompras.destroy();
    graficoCompras = null;
  }
  
  const blocos = historico.map(function (compra) {
    const mediaPorItem = Number(compra.quantidadeItens) > 0
      ? Number(compra.total) / Number(compra.quantidadeItens)
      : 0;

    return `
      <div class="border rounded p-3 mb-3">
        <div><strong>Data:</strong> ${formatarData(compra.data)}</div>
        <div><strong>Total:</strong> R$ ${formatarMoeda(compra.total)}</div>
        <div><strong>Itens:</strong> ${compra.quantidadeItens}</div>
        <div><strong>Média por item:</strong> R$ ${formatarMoeda(mediaPorItem)}</div>
      </div>
    `;
  }).join("");

  resultadoComprasContainer.innerHTML = blocos;
}

function renderizarComprasBarras(historico) {
  const labels = historico.map(function (compra) {
    return formatarData(compra.data);
  });

  const valores = historico.map(function (compra) {
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

  if (graficoCompras) {
    graficoCompras.destroy();
    graficoCompras = null;
  }

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
  const labels = historico.map(function (compra) {
    return formatarData(compra.data);
  });

  const valores = historico.map(function (compra) {
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

  if (graficoCompras) {
    graficoCompras.destroy();
    graficoCompras = null;
  }

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

  if (graficoCompras) {
    graficoCompras.destroy();
    graficoCompras = null;
  }

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

function renderizarConsumoTabela(dados) {
  if (graficoConsumo) {
    graficoConsumo.destroy();
    graficoConsumo = null;
  }
  
  const linhas = dados.map(function (grupo) {
    return `
      <tr>
        <td>${grupo.nome}</td>
        <td>${grupo.unidade}</td>
        <td>${formatarData(grupo.dataInicial)}</td>
        <td>${formatarData(grupo.dataFinal)}</td>
        <td>${grupo.diasNoPeriodo}</td>
        <td>${formatarNumero(grupo.consumoTotal)}</td>
        <td>${formatarNumero(grupo.mediaDiaria)}</td>
        <td>${grupo.ocorrencias}</td>
      </tr>
    `;
  }).join("");

  resultadoConsumoContainer.innerHTML = `
    <div class="table-responsive">
      <table class="table table-bordered table-hover align-middle mb-0">
        <thead class="table-light">
          <tr>
            <th>Item</th>
            <th>Unidade</th>
            <th>Data inicial</th>
            <th>Data final</th>
            <th>Dias no período</th>
            <th>Consumo total</th>
            <th>Média diária</th>
            <th>Ocorrências</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
  `;
}

function renderizarConsumoLista(dados) {
  if (graficoConsumo) {
    graficoConsumo.destroy();
    graficoConsumo = null;
  }
  
  const blocos = dados.map(function (grupo) {
    return `
      <div class="border rounded p-3 mb-3">
        <div><strong>Item:</strong> ${grupo.nome}</div>
        <div><strong>Unidade:</strong> ${grupo.unidade}</div>
        <div><strong>Período:</strong> ${formatarData(grupo.dataInicial)} até ${formatarData(grupo.dataFinal)}</div>
        <div><strong>Consumo total:</strong> ${formatarNumero(grupo.consumoTotal)}</div>
        <div><strong>Média diária:</strong> ${formatarNumero(grupo.mediaDiaria)}</div>
        <div><strong>Ocorrências:</strong> ${grupo.ocorrencias}</div>
      </div>
    `;
  }).join("");

  resultadoConsumoContainer.innerHTML = blocos;
}

function renderizarConsumoBarras(dados) {
  const labels = dados.map(function (grupo) {
    return `${grupo.nome} (${grupo.unidade})`;
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

  if (graficoConsumo) {
    graficoConsumo.destroy();
    graficoConsumo = null;
  }

  graficoConsumo = new Chart(canvas, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Consumo total",
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

function renderizarConsumoLinhaDoTempo(dados) {
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

  if (graficoConsumo) {
    graficoConsumo.destroy();
    graficoConsumo = null;
  }

  graficoConsumo = new Chart(canvas, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Evolução do consumo",
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
