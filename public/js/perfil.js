import { apiGet, apiPatch } from "./api.js";
import { ensureAcceptedSession, logoutAndRedirect } from "./auth.js";
import { escapeHtml } from "./dom.js";
import { getFullName } from "./formatters.js";
import { setFeedbackMessage } from "./messages.js";

document.addEventListener("DOMContentLoaded", function () {
  const perfilDados = document.getElementById("perfil-dados");
  const perfilMembros = document.getElementById("perfil-membros");
  const perfilSolicitacoes = document.getElementById("perfil-solicitacoes");
  const perfilAdminAviso = document.getElementById("perfil-admin-aviso");
  const perfilMessage = document.getElementById("perfil-message");
  const btnLogout = document.getElementById("btn-logout");

  let papelAtual = "";

  inicializar();

  if (btnLogout) {
    btnLogout.addEventListener("click", logout);
  }

  async function inicializar() {
    try {
      const usuario = await ensureAcceptedSession();
      const sessao = { usuario };
      papelAtual = String(sessao.usuario?.papel || "").toLowerCase();
      await carregarPerfil();
      await carregarMembros();
      await carregarSolicitacoes();
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
      exibirMensagem("Não foi possível carregar a página de perfil.", "danger");
    }
  }

  async function carregarPerfil() {
    const { response: resposta, data: dados } = await apiGet("/meu-perfil");
    if (!resposta.ok) {
      throw new Error(dados.erro || "Falha ao carregar perfil.");
    }

    const perfil = dados.usuario || dados;
    perfilDados.innerHTML = `
      <div><strong>Nome:</strong> ${escapeHtml(perfil.nome || "-")}</div>
      <div><strong>E-mail:</strong> ${escapeHtml(perfil.email || "-")}</div>
      <div><strong>Grupo:</strong> ${escapeHtml(perfil.grupoNome || "-")}</div>
      <div><strong>Código do grupo:</strong> ${escapeHtml(perfil.grupoCodigo || "-")}</div>
      <div><strong>Papel:</strong> ${escapeHtml(perfil.papel || "-")}</div>
      <div><strong>Status:</strong> ${escapeHtml(perfil.statusGrupo || "-")}</div>
    `;
  }

  async function carregarMembros() {
    const { response: resposta, data: dados } = await apiGet("/meu-grupo/membros");
    if (!resposta.ok) {
      throw new Error(dados.erro || "Falha ao carregar membros.");
    }

    const membros = Array.isArray(dados) ? dados : dados.membros || [];
    perfilMembros.innerHTML = "";

    if (membros.length === 0) {
      perfilMembros.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nenhum membro encontrado.</td></tr>';
      return;
    }

    membros.forEach(function (membro) {
      const tr = document.createElement("tr");
      const usuario = membro.usuario || {};
      const nome = getFullName(usuario, membro);
      const email = usuario.email || membro.email || "-";
      const papel = membro.papel || usuario.papel || "-";
      const status = membro.status || membro.statusGrupo || usuario.statusGrupo || "-";

      tr.innerHTML = `
        <td>${escapeHtml(nome)}</td>
        <td>${escapeHtml(email)}</td>
        <td>${escapeHtml(papel)}</td>
        <td>${escapeHtml(status)}</td>
      `;
      perfilMembros.appendChild(tr);
    });
  }

  async function carregarSolicitacoes() {
    const { response: resposta, data: dados } = await apiGet("/meu-grupo/solicitacoes");

    if (resposta.status === 403 || papelAtual !== "admin") {
      if (perfilAdminAviso) {
        perfilAdminAviso.textContent = "Somente o administrador do grupo pode aprovar solicitações.";
      }
      perfilSolicitacoes.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Sem permissão para visualizar solicitações.</td></tr>';
      return;
    }

    if (!resposta.ok) {
      throw new Error(dados.erro || "Falha ao carregar solicitações.");
    }

    if (perfilAdminAviso) {
      perfilAdminAviso.textContent = "";
    }

    const solicitacoes = Array.isArray(dados) ? dados : dados.solicitacoes || [];
    perfilSolicitacoes.innerHTML = "";

    if (solicitacoes.length === 0) {
      perfilSolicitacoes.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhuma solicitação pendente.</td></tr>';
      return;
    }

    solicitacoes.forEach(function (solicitacao) {
      const tr = document.createElement("tr");
      const usuario = solicitacao.usuario || {};
      const id = Number(solicitacao.id);
      const nome = getFullName(usuario, solicitacao);
      const email = usuario.email || solicitacao.email || "-";
      const papel = solicitacao.papel || usuario.papel || "membro";
      const status = solicitacao.status || solicitacao.statusGrupo || usuario.statusGrupo || "pendente";

      tr.innerHTML = `
        <td>${escapeHtml(nome)}</td>
        <td>${escapeHtml(email)}</td>
        <td>${escapeHtml(papel)}</td>
        <td>${escapeHtml(status)}</td>
        <td class="text-end">
          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-sm btn-success" data-acao="aceitar" data-id="${id}">Aceitar</button>
            <button type="button" class="btn btn-sm btn-outline-danger" data-acao="recusar" data-id="${id}">Recusar</button>
          </div>
        </td>
      `;
      perfilSolicitacoes.appendChild(tr);
    });

    perfilSolicitacoes.querySelectorAll("button[data-acao]").forEach(function (botao) {
      botao.addEventListener("click", async function () {
        const id = botao.getAttribute("data-id");
        const acao = botao.getAttribute("data-acao");
        await decidirSolicitacao(id, acao);
      });
    });
  }

  async function decidirSolicitacao(id, acao) {
    try {
      exibirMensagem("Salvando decisão...", "muted");
      const { response: resposta, data: dados } = await apiPatch(`/meu-grupo/solicitacoes/${id}/${acao}`);
      if (!resposta.ok) {
        throw new Error(dados.erro || `Falha ao ${acao} solicitação.`);
      }
      exibirMensagem(`Solicitação ${acao === "aceitar" ? "aceita" : "recusada"} com sucesso.`, "success");
      await carregarMembros();
      await carregarSolicitacoes();
    } catch (error) {
      console.error("Erro ao decidir solicitação:", error);
      exibirMensagem(error.message || "Não foi possível salvar a decisão.", "danger");
    }
  }

  async function logout() {
    await logoutAndRedirect();
  }

  function exibirMensagem(texto, variante) {
    if (!perfilMessage) return;
    setFeedbackMessage(perfilMessage, texto, variante, { classeBase: "small mt-3" });
  }

});
