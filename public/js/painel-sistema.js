import { apiGet, apiPatch } from "./api.js";
import { ensureAdminSistemaSession } from "./auth.js";
import { clearElement, createTableMessageRow, createTextCell, renderKeyValueRows } from "./dom.js";

document.addEventListener("DOMContentLoaded", function () {
  const resumo = document.getElementById("painel-resumo");
  const tbodyPendencias = document.getElementById("painel-pendencias");
  const tbodyUsuarios = document.getElementById("painel-usuarios");
  const tbodyGrupos = document.getElementById("painel-grupos");
  const tbodyLogs = document.getElementById("painel-logs");
  const btnFiltrarLogs = document.getElementById("btn-filtrar-logs");

  const filtroEntidade = document.getElementById("filtro-entidade");
  const filtroAcao = document.getElementById("filtro-acao");
  const filtroUsuario = document.getElementById("filtro-usuario");

  inicializar();

  if (btnFiltrarLogs) {
    btnFiltrarLogs.addEventListener("click", carregarLogs);
  }

  async function inicializar() {
    try {
      await ensureAdminSistemaSession();
      await Promise.all([
        carregarResumo(),
        carregarPendencias(),
        carregarUsuarios(),
        carregarGrupos(),
        carregarLogs()
      ]);
    } catch (error) {
      console.error(error);
      window.location.replace("perfil.html");
    }
  }

  async function carregarResumo() {
    const { response, data } = await apiGet("/painel-sistema/resumo");
    if (!response.ok) return;
    renderKeyValueRows(resumo, [
      ["Usuários", data.usuarios ?? 0],
      ["Grupos", data.grupos ?? 0],
      ["Itens", data.itens ?? 0],
      ["Pendências", data.pendencias ?? 0],
      ["Logs", data.logs ?? 0]
    ]);
  }

  async function carregarPendencias() {
    clearElement(tbodyPendencias);
    const { response, data } = await apiGet("/painel-sistema/pendencias");
    if (!response.ok) {
      tbodyPendencias.appendChild(createTableMessageRow(5, "Não foi possível carregar pendências."));
      return;
    }

    const pendencias = Array.isArray(data) ? data : [];
    if (!pendencias.length) {
      tbodyPendencias.appendChild(createTableMessageRow(5, "Nenhuma pendência global."));
      return;
    }

    pendencias.forEach(function (registro) {
      const tr = document.createElement("tr");
      tr.appendChild(createTextCell([registro.usuario?.nome, registro.usuario?.sobrenome].filter(Boolean).join(" ")));
      tr.appendChild(createTextCell(registro.grupo?.nome || "-"));
      tr.appendChild(createTextCell(registro.papel || "-"));
      tr.appendChild(createTextCell(registro.status || "-"));

      const tdAcoes = document.createElement("td");
      tdAcoes.className = "text-end";
      const wrapper = document.createElement("div");
      wrapper.className = "d-flex justify-content-end gap-2";

      wrapper.appendChild(criarBotao("Aprovar", "btn btn-sm btn-success", async function () {
        await apiPatch(`/painel-sistema/usuarios-grupos/${registro.id}/aprovar`, {});
        await carregarPendencias();
        await carregarResumo();
      }));

      wrapper.appendChild(criarBotao("Recusar", "btn btn-sm btn-outline-danger", async function () {
        await apiPatch(`/painel-sistema/usuarios-grupos/${registro.id}/recusar`, {});
        await carregarPendencias();
        await carregarResumo();
      }));

      tdAcoes.appendChild(wrapper);
      tr.appendChild(tdAcoes);
      tbodyPendencias.appendChild(tr);
    });
  }

  async function carregarUsuarios() {
    clearElement(tbodyUsuarios);
    const { response, data } = await apiGet("/painel-sistema/usuarios");
    if (!response.ok) {
      tbodyUsuarios.appendChild(createTableMessageRow(5, "Não foi possível carregar usuários."));
      return;
    }

    data.forEach(function (usuario) {
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
    clearElement(tbodyGrupos);
    const { response, data } = await apiGet("/painel-sistema/grupos");
    if (!response.ok) {
      tbodyGrupos.appendChild(createTableMessageRow(4, "Não foi possível carregar grupos."));
      return;
    }

    data.forEach(function (grupo) {
      const tr = document.createElement("tr");
      tr.appendChild(createTextCell(grupo.id));
      tr.appendChild(createTextCell(grupo.nome || "-"));
      tr.appendChild(createTextCell(grupo.codigo || "-"));
      tr.appendChild(createTextCell(grupo.excluidoEm ? "excluído" : grupo.desativadoEm ? "desativado" : "ativo"));
      tbodyGrupos.appendChild(tr);
    });
  }

  async function carregarLogs() {
    clearElement(tbodyLogs);

    const params = new URLSearchParams();
    if (filtroEntidade.value.trim()) params.set("entidade", filtroEntidade.value.trim());
    if (filtroAcao.value.trim()) params.set("acao", filtroAcao.value.trim());
    if (filtroUsuario.value.trim()) params.set("usuarioId", filtroUsuario.value.trim());

    const { response, data } = await apiGet(`/painel-sistema/logs?${params.toString()}`);
    if (!response.ok) {
      tbodyLogs.appendChild(createTableMessageRow(6, "Não foi possível carregar logs."));
      return;
    }

    const logs = Array.isArray(data) ? data : [];
    if (!logs.length) {
      tbodyLogs.appendChild(createTableMessageRow(6, "Nenhum log encontrado."));
      return;
    }

    logs.forEach(function (log) {
      const tr = document.createElement("tr");
      tr.appendChild(createTextCell(formatarData(log.criadoEm)));
      tr.appendChild(createTextCell(log.entidade || "-"));
      tr.appendChild(createTextCell(log.acao || "-"));
      tr.appendChild(createTextCell(log.usuarioAutor ? `${log.usuarioAutor.id} - ${log.usuarioAutor.nome}` : "-"));
      tr.appendChild(createTextCell(log.grupo ? `${log.grupo.id} - ${log.grupo.nome}` : "-"));
      tr.appendChild(createTextCell(log.descricao || "-"));
      tbodyLogs.appendChild(tr);
    });
  }

  function criarBotao(texto, classe, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = classe;
    button.textContent = texto;
    button.addEventListener("click", onClick);
    return button;
  }

  function formatarData(valor) {
    if (!valor) return "-";
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return "-";
    return data.toLocaleString("pt-BR");
  }
});
