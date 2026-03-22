document.addEventListener("DOMContentLoaded", function () {
  const CHAVE_HISTORICO_COMPRAS = "controleComprasHistoricoCompras";
  const CHAVE_MOVIMENTACOES_ESTOQUE = "controleComprasMovimentacoesEstoque";

  const tabButtons = document.querySelectorAll("#consumo-tabs .nav-link");
  const tabSections = document.querySelectorAll(".tab-content-section");
  const visualizacaoConsumo = document.getElementById("visualizacao-consumo");
  const visualizacaoCompras = document.getElementById("visualizacao-compras");
  
  const resultadoConsumoContainer = document.getElementById("resultado-consumo");
  const resultadoComprasContainer = document.getElementById("resultado-compras");
  
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
  const maiorValor = Math.max.apply(null, historico.map(function (compra) {
    return Number(compra.total) || 0;
  }));

  const blocos = historico.map(function (compra) {
    const total = Number(compra.total) || 0;
    const largura = maiorValor > 0 ? (total / maiorValor) * 100 : 0;

    return `
      <div class="mb-3">
        <div class="d-flex justify-content-between mb-1">
          <span>${formatarData(compra.data)}</span>
          <span>R$ ${formatarMoeda(total)}</span>
        </div>
        <div class="progress" role="progressbar" aria-valuenow="${largura}" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-bar" style="width: ${largura}%"></div>
        </div>
      </div>
    `;
  }).join("");

  resultadoComprasContainer.innerHTML = `<div>${blocos}</div>`;
}

function renderizarComprasPizza(historico) {
  const totalGeral = historico.reduce(function (acumulado, compra) {
    return acumulado + (Number(compra.total) || 0);
  }, 0);

  const itens = historico.map(function (compra) {
    const total = Number(compra.total) || 0;
    const percentual = totalGeral > 0 ? (total / totalGeral) * 100 : 0;

    return `
      <tr>
        <td>${formatarData(compra.data)}</td>
        <td>R$ ${formatarMoeda(total)}</td>
        <td>${formatarNumero(percentual)}%</td>
      </tr>
    `;
  }).join("");

  resultadoComprasContainer.innerHTML = `
    <div class="table-responsive">
      <table class="table table-bordered table-hover align-middle mb-0">
        <thead class="table-light">
          <tr>
            <th>Data da compra</th>
            <th>Total</th>
            <th>Participação no total</th>
          </tr>
        </thead>
        <tbody>${itens}</tbody>
      </table>
    </div>
  `;
}

function renderizarComprasLinhaDoTempo(historico) {
  const blocos = historico.map(function (compra) {
    return `
      <div class="border-start ps-3 ms-2 mb-3">
        <div><strong>${formatarData(compra.data)}</strong></div>
        <div>Total: R$ ${formatarMoeda(compra.total)}</div>
        <div>Itens: ${compra.quantidadeItens}</div>
      </div>
    `;
  }).join("");

  resultadoComprasContainer.innerHTML = blocos;
}

function renderizarConsumoTabela(dados) {
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
  const maiorValor = Math.max.apply(null, dados.map(function (grupo) {
    return Number(grupo.consumoTotal) || 0;
  }));

  const blocos = dados.map(function (grupo) {
    const largura = maiorValor > 0 ? (grupo.consumoTotal / maiorValor) * 100 : 0;

    return `
      <div class="mb-3">
        <div class="d-flex justify-content-between mb-1">
          <span>${grupo.nome} (${grupo.unidade})</span>
          <span>${formatarNumero(grupo.consumoTotal)}</span>
        </div>
        <div class="progress" role="progressbar" aria-valuenow="${largura}" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-bar" style="width: ${largura}%"></div>
        </div>
      </div>
    `;
  }).join("");

  resultadoConsumoContainer.innerHTML = `<div>${blocos}</div>`;
}

function renderizarConsumoLinhaDoTempo(dados) {
  const blocos = dados.map(function (grupo) {
    return `
      <div class="border-start ps-3 ms-2 mb-3">
        <div><strong>${grupo.nome}</strong> (${grupo.unidade})</div>
        <div>Data inicial: ${formatarData(grupo.dataInicial)}</div>
        <div>Data final: ${formatarData(grupo.dataFinal)}</div>
        <div>Consumo total: ${formatarNumero(grupo.consumoTotal)}</div>
        <div>Ocorrências: ${grupo.ocorrencias}</div>
      </div>
    `;
  }).join("");

  resultadoConsumoContainer.innerHTML = blocos;
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
