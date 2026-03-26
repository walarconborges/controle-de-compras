import { apiGet, apiPatch } from "./api.js";
import { ensureAcceptedSession, logoutAndRedirect } from "./auth.js";
import { clearElement, createTableMessageRow, createTextCell, renderKeyValueRows } from "./dom.js";
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
    renderKeyValueRows(perfilDados, [
      ["Nome", perfil.nome || "-"],
      ["E-mail", perfil.email || "-"],
      ["Grupo", perfil.grupoNome || "-"],
      ["Código do grupo", perfil.grupoCodigo || "-"],
      ["Papel", perfil.papel || "-"],
      ["Status", perfil.statusGrupo || "-"]
    ]);
  }

  async function carregarMembros() {
    const { response: resposta, data: dados } = await apiGet("/meu-grupo/membros");
    if (!resposta.ok) {
      throw new Error(dados.erro || "Falha ao carregar membros.");
    }

    const membros = Array.isArray(dados) ? dados : dados.membros || [];
    clearElement(perfilMembros);

    if (membros.length === 0) {
      perfilMembros.appendChild(createTableMessageRow(4, "Nenhum membro encontrado."));
      return;
    }

    membros.forEach(function (membro) {
      const tr = document.createElement("tr");
      const usuario = membro.usuario || {};
      const nome = getFullName(usuario, membro);
      const email = usuario.email || membro.email || "-";
      const papel = membro.papel || usuario.papel || "-";
      const status = membro.status || membro.statusGrupo || usuario.statusGrupo || "-";

      tr.appendChild(createTextCell(nome));
      tr.appendChild(createTextCell(email));
      tr.appendChild(createTextCell(papel));
      tr.appendChild(createTextCell(status));
      perfilMembros.appendChild(tr);
    });
  }

  async function carregarSolicitacoes() {
    const { response: resposta, data: dados } = await apiGet("/meu-grupo/solicitacoes");
    clearElement(perfilSolicitacoes);

    if (resposta.status === 403 || papelAtual !== "admin") {
      if (perfilAdminAviso) {
        perfilAdminAviso.textContent = "Somente o administrador do grupo pode aprovar solicitações.";
      }
      perfilSolicitacoes.appendChild(createTableMessageRow(5, "Sem permissão para visualizar solicitações."));
      return;
    }

    if (!resposta.ok) {
      throw new Error(dados.erro || "Falha ao carregar solicitações.");
    }

    if (perfilAdminAviso) {
      perfilAdminAviso.textContent = "";
    }

    const solicitacoes = Array.isArray(dados) ? dados : dados.solicitacoes || [];

    if (solicitacoes.length === 0) {
      perfilSolicitacoes.appendChild(createTableMessageRow(5, "Nenhuma solicitação pendente."));
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

      tr.appendChild(createTextCell(nome));
      tr.appendChild(createTextCell(email));
      tr.appendChild(createTextCell(papel));
      tr.appendChild(createTextCell(status));
      tr.appendChild(createActionsCell(id));
      perfilSolicitacoes.appendChild(tr);
    });
  }

  function createActionsCell(id) {
    const td = document.createElement("td");
    td.className = "text-end";

    const wrapper = document.createElement("div");
    wrapper.className = "d-flex justify-content-end gap-2";

    const btnAceitar = document.createElement("button");
    btnAceitar.type = "button";
    btnAceitar.className = "btn btn-sm btn-success";
    btnAceitar.textContent = "Aceitar";
    btnAceitar.addEventListener("click", async function () {
      await decidirSolicitacao(id, "aceitar");
    });

    const btnRecusar = document.createElement("button");
    btnRecusar.type = "button";
    btnRecusar.className = "btn btn-sm btn-outline-danger";
    btnRecusar.textContent = "Recusar";
    btnRecusar.addEventListener("click", async function () {
      await decidirSolicitacao(id, "recusar");
    });

    wrapper.appendChild(btnAceitar);
    wrapper.appendChild(btnRecusar);
    td.appendChild(wrapper);
    return td;
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
