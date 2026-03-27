import { apiGet, apiPatch } from "./api.js";
import { ensureAdminSistemaSession } from "./auth.js";
import { clearElement, createTableMessageRow, createTextCell, renderKeyValueRows } from "./dom.js";
import { setFeedbackMessage, clearFeedbackMessage } from "./messages.js";

document.addEventListener("DOMContentLoaded", function () {
  const resumo = document.getElementById("painel-resumo");
  const tbodyPendencias = document.getElementById("painel-pendencias");
  const tbodyUsuarios = document.getElementById("painel-usuarios");
  const tbodyGrupos = document.getElementById("painel-grupos");
  const tbodyLogs = document.getElementById("painel-logs");
  const btnFiltrarLogs = document.getElementById("btn-filtrar-logs");
  const painelMessage = ensurePainelMessage();

  const filtroEntidade = document.getElementById("filtro-entidade");
  const filtroAcao = document.getElementById("filtro-acao");
  const filtroUsuario = document.getElementById("filtro-usuario");

  inicializar();

  if (btnFiltrarLogs) {
    btnFiltrarLogs.addEventListener("click", carregarLogs);
  }

  async function inicializar() {
    try {
      exibirMensagem("Carregando Painel do Sistema...", "muted");
      renderizarLoadingResumo();
      renderizarLoadingTabela(tbodyPendencias, 5, 3);
      renderizarLoadingTabela(tbodyUsuarios, 5, 3);
      renderizarLoadingTabela(tbodyGrupos, 4, 3);
      renderizarLoadingTabela(tbodyLogs, 6, 4);

      await ensureAdminSistemaSession();
      await Promise.all([carregarResumo(), carregarPendencias(), carregarUsuarios(), carregarGrupos(), carregarLogs()]);
      limparMensagem();
    } catch (error) {
      console.error(error);
      exibirMensagem("Não foi possível carregar o Painel do Sistema.", "danger");
      window.location.replace("perfil.html");
    }
  }

  async function carregarResumo() {
    const { response, data } = await apiGet("/painel-sistema/resumo");
    if (!response.ok) {
      renderKeyValueRows(resumo, [["Resumo", "Não foi possível carregar."]]);
      return;
    }

    renderKeyValueRows(resumo, [
      ["Usuários", data.usuarios ?? 0],
      ["Grupos", data.grupos ?? 0],
      ["Itens", data.itens ?? 0],
      ["Pendências", data.pendencias ?? 0],
      ["Logs", data.logs ?? 0],
    ]);
  }

  async function carregarPendencias() {
    renderizarLoadingTabela(tbodyPendencias, 5, 3);
    const { response, data } = await apiGet("/painel-sistema/pendencias");

    clearElement(tbodyPendencias);

    if (!response.ok) {
      tbodyPendencias.appendChild(createTableMessageRow(5, "Não foi possível carregar pendências."));
      return;
    }

    const pendencias = Array.isArray(data) ? data : [];
    if (!pendencias.length) {
      tbodyPendencias.appendChild(createTableMessageRow(5, "Nenhuma pendência global no momento."));
      return;
    }

    pendencias.forEach(function (registro) {
      const tr = document.createElement("tr");
      tr.appendChild(createTextCell([registro.usuario?.nome, registro.usuario?.sobrenome].filter(Boolean).join(" ") || "-"));
      tr.appendChild(createTextCell(registro.grupo?.nome || "-"));
      tr.appendChild(createTextCell(registro.papel || "-"));
      tr.appendChild(createTextCell(registro.status || "-"));

      const tdAcoes = document.createElement("td");
      tdAcoes.className = "text-end";
      const wrapper = document.createElement("div");
      wrapper.className = "d-flex justify-content-end gap-2";

      wrapper.appendChild(criarBotao("Aprovar", "btn btn-sm btn-success", async function (event) {
        await executarAcaoBotao(event.currentTarget, "Aprovando pendência...", async function () {
          await apiPatch(`/painel-sistema/usuarios-grupos/${registro.id}/aprovar`, {});
          await carregarPendencias();
          await carregarResumo();
          await carregarUsuarios();
        });
      }));

      wrapper.appendChild(criarBotao("Recusar", "btn btn-sm btn-outline-danger", async function (event) {
        await executarAcaoBotao(event.currentTarget, "Recusando pendência...", async function () {
          await apiPatch(`/painel-sistema/usuarios-grupos/${registro.id}/recusar`, {});
          await carregarPendencias();
          await carregarResumo();
        });
      }));

      tdAcoes.appendChild(wrapper);
      tr.appendChild(tdAcoes);
      tbodyPendencias.appendChild(tr);
    });
  }

  async function carregarUsuarios() {
    renderizarLoadingTabela(tbodyUsuarios, 5, 3);
    const { response, data } = await apiGet("/painel-sistema/usuarios");

    clearElement(tbodyUsuarios);

    if (!response.ok) {
      tbodyUsuarios.appendChild(createTableMessageRow(5, "Não foi possível carregar usuários."));
      return;
    }

    const usuarios = Array.isArray(data) ? data : [];
    if (!usuarios.length) {
      tbodyUsuarios.appendChild(createTableMessageRow(5, "Nenhum usuário encontrado."));
      return;
    }

    usuarios.forEach(function (usuario) {
      const tr = document.createElement("tr");
      tr.appendChild(createTextCell(usuario.id));
      tr.appendChild(createTextCell([usuario.nome, usuario.sobrenome].filter(Boolean).join(" ")));
      tr.appendChild(createTextCell(usuario.email || "-"));
      tr.appendChild(createTextCell(usuario.papelGlobal || "usuario"));
      tr.appendChild(createTextCell(usuario.excluidoEm ? "excluído" : usuario.desativadoEm ? "desativado" : "ativo"));
      tbodyUsuarios.appendChild(tr);
    });
  }

  async function carregarGrupos() {
    renderizarLoadingTabela(tbodyGrupos, 4, 3);
    const { response, data } = await apiGet("/painel-sistema/grupos");

    clearElement(tbodyGrupos);

    if (!response.ok) {
      tbodyGrupos.appendChild(createTableMessageRow(4, "Não foi possível carregar grupos."));
      return;
    }

    const grupos = Array.isArray(data) ? data : [];
    if (!grupos.length) {
      tbodyGrupos.appendChild(createTableMessageRow(4, "Nenhum grupo encontrado."));
      return;
    }

    grupos.forEach(function (grupo) {
      const tr = document.createElement("tr");
      tr.appendChild(createTextCell(grupo.id));
      tr.appendChild(createTextCell(grupo.nome || "-"));
      tr.appendChild(createTextCell(grupo.codigo || "-"));
      tr.appendChild(createTextCell(grupo.excluidoEm ? "excluído" : grupo.desativadoEm ? "desativado" : "ativo"));
      tbodyGrupos.appendChild(tr);
    });
  }

  async function carregarLogs() {
    renderizarLoadingTabela(tbodyLogs, 6, 4);

    if (btnFiltrarLogs) {
      btnFiltrarLogs.disabled = true;
      btnFiltrarLogs.textContent = "Filtrando...";
    }

    try {
      const params = new URLSearchParams();
      if (filtroEntidade?.value.trim()) params.set("entidade", filtroEntidade.value.trim());
      if (filtroAcao?.value.trim()) params.set("acao", filtroAcao.value.trim());

      const filtroUsuarioValor = filtroUsuario?.value.trim() || "";
      if (filtroUsuarioValor) {
        if (/^\d+$/.test(filtroUsuarioValor)) {
          params.set("usuarioId", filtroUsuarioValor);
        } else {
          params.set("autorEmail", filtroUsuarioValor);
        }
      }

      const rota = params.toString() ? `/painel-sistema/logs?${params.toString()}` : "/painel-sistema/logs";
      const { response, data } = await apiGet(rota);

      clearElement(tbodyLogs);

      if (!response.ok) {
        tbodyLogs.appendChild(createTableMessageRow(6, "Não foi possível carregar logs."));
        return;
      }

      const logs = Array.isArray(data) ? data : [];
      if (!logs.length) {
        tbodyLogs.appendChild(createTableMessageRow(6, "Nenhum log encontrado para os filtros informados."));
        return;
      }

      logs.forEach(function (log) {
        const tr = document.createElement("tr");
        const autorTexto = log.usuarioAutor
          ? `${log.usuarioAutor.id} - ${[log.usuarioAutor.nome, log.usuarioAutor.sobrenome].filter(Boolean).join(" ")}`
          : log.autorEmail || "-";
        tr.appendChild(createTextCell(formatarData(log.criadoEm)));
        tr.appendChild(createTextCell(log.entidade || "-"));
        tr.appendChild(createTextCell(log.acao || "-"));
        tr.appendChild(createTextCell(autorTexto));
        tr.appendChild(createTextCell(log.grupo ? `${log.grupo.id} - ${log.grupo.nome}` : "-"));
        tr.appendChild(createTextCell(log.descricao || "-"));
        tbodyLogs.appendChild(tr);
      });
    } finally {
      if (btnFiltrarLogs) {
        btnFiltrarLogs.disabled = false;
        btnFiltrarLogs.textContent = "Aplicar filtros";
      }
    }
  }

  function criarBotao(texto, classe, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = classe;
    button.textContent = texto;
    button.addEventListener("click", onClick);
    return button;
  }

  async function executarAcaoBotao(botao, mensagem, callback) {
    const textoOriginal = botao ? botao.textContent : "";
    if (botao) {
      botao.disabled = true;
      botao.textContent = "Salvando...";
    }

    try {
      exibirMensagem(mensagem, "muted");
      await callback();
      exibirMensagem("Ação concluída com sucesso.", "success");
    } catch (error) {
      console.error(error);
      exibirMensagem("Não foi possível concluir a ação.", "danger");
    } finally {
      if (botao) {
        botao.disabled = false;
        botao.textContent = textoOriginal;
      }
    }
  }

  function renderizarLoadingResumo() {
    renderKeyValueRows(resumo, [
      ["Usuários", "Carregando..."],
      ["Grupos", "Carregando..."],
      ["Itens", "Carregando..."],
      ["Pendências", "Carregando..."],
      ["Logs", "Carregando..."],
    ]);
  }

  function renderizarLoadingTabela(tbody, totalColunas, totalLinhas) {
    if (!tbody) return;

    clearElement(tbody);

    for (let linha = 0; linha < totalLinhas; linha += 1) {
      const tr = document.createElement("tr");
      for (let coluna = 0; coluna < totalColunas; coluna += 1) {
        const td = document.createElement("td");
        td.className = "text-secondary";
        td.textContent = "Carregando...";
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  }

  function ensurePainelMessage() {
    let elemento = document.getElementById("painel-message");

    if (elemento) {
      return elemento;
    }

    elemento = document.createElement("div");
    elemento.id = "painel-message";
    elemento.className = "small mt-3";
    elemento.setAttribute("aria-live", "polite");
    document.querySelector(".container")?.prepend(elemento);
    return elemento;
  }

  function exibirMensagem(texto, tipo = "muted") {
    setFeedbackMessage(painelMessage, texto, tipo);
  }

  function limparMensagem() {
    clearFeedbackMessage(painelMessage);
  }

  function formatarData(valor) {
    if (!valor) return "-";
    try {
      return new Date(valor).toLocaleString("pt-BR");
    } catch {
      return String(valor);
    }
  }
});
