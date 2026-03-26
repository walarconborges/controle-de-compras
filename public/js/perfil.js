import { apiGet, apiPatch, apiPost } from "./api.js";
import { ensureAnySession, logoutAndRedirect } from "./auth.js";
import { clearElement, createTableMessageRow, createTextCell, renderKeyValueRows } from "./dom.js";
import { getFullName } from "./formatters.js";
import { setFeedbackMessage } from "./messages.js";

document.addEventListener("DOMContentLoaded", function () {
  const perfilDados = document.getElementById("perfil-dados");
  const perfilMembros = document.getElementById("perfil-membros");
  const perfilSolicitacoes = document.getElementById("perfil-solicitacoes");
  const perfilVinculos = document.getElementById("perfil-vinculos");
  const perfilAdminAviso = document.getElementById("perfil-admin-aviso");
  const perfilMessage = document.getElementById("perfil-message");
  const btnLogout = document.getElementById("btn-logout");
  const btnSairGrupo = document.getElementById("btn-sair-grupo");
  const perfilForm = document.getElementById("perfil-form");
  const conviteForm = document.getElementById("convite-form");
  const conviteEmail = document.getElementById("convite-email");
  const convitePapel = document.getElementById("convite-papel");
  const linkPainelSistema = document.getElementById("link-painel-sistema");

  const inputNome = document.getElementById("perfil-nome");
  const inputSobrenome = document.getElementById("perfil-sobrenome");
  const inputEmail = document.getElementById("perfil-email");
  const inputSenha = document.getElementById("perfil-senha");

  let sessaoAtual = null;
  let papelAtual = "";

  inicializar();

  if (btnLogout) btnLogout.addEventListener("click", logout);
  if (btnSairGrupo) btnSairGrupo.addEventListener("click", sairDoGrupo);

  if (perfilForm) {
    perfilForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      await salvarPerfil();
    });
  }

  if (conviteForm) {
    conviteForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      await convidarUsuario();
    });
  }

  async function inicializar() {
    try {
      sessaoAtual = await ensureAnySession();
      papelAtual = String(sessaoAtual.papel || "").toLowerCase();
      if (linkPainelSistema) {
        linkPainelSistema.hidden = !sessaoAtual.adminSistema;
      }
      await carregarTudo();
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
      exibirMensagem("Não foi possível carregar a página de perfil.", "danger");
    }
  }

  async function carregarTudo() {
    await carregarPerfil();
    await carregarVinculos();
    await carregarMembros();
    await carregarSolicitacoes();
  }

  async function carregarPerfil() {
    const { response: resposta, data: dados } = await apiGet("/meu-perfil");
    if (!resposta.ok) throw new Error(dados.erro || "Falha ao carregar perfil.");

    const perfil = dados.usuario || dados;
    sessaoAtual = perfil;
    papelAtual = String(perfil.papel || "").toLowerCase();

    inputNome.value = perfil.nome || "";
    inputSobrenome.value = perfil.sobrenome || "";
    inputEmail.value = perfil.email || "";
    inputSenha.value = "";

    renderKeyValueRows(perfilDados, [
      ["Nome completo", perfil.nomeCompleto || perfil.nome || "-"],
      ["E-mail", perfil.email || "-"],
      ["Papel global", perfil.papelGlobal || "usuario"],
      ["Admin do sistema", perfil.adminSistema ? "Sim" : "Não"],
      ["Grupo ativo", perfil.grupoNome || "Nenhum selecionado"],
      ["Código do grupo ativo", perfil.grupoCodigo || "-"],
      ["Papel no grupo ativo", perfil.papel || "-"],
      ["Status atual", perfil.statusGrupo || "-"]
    ]);

    if (conviteForm) {
      conviteForm.hidden = papelAtual !== "admingrupo";
    }
    if (btnSairGrupo) {
      btnSairGrupo.hidden = !perfil.grupoId;
    }
  }

  async function carregarVinculos() {
    const { response: resposta, data: dados } = await apiGet("/meu-perfil");
    if (!resposta.ok) throw new Error(dados.erro || "Falha ao carregar vínculos.");

    const perfil = dados.usuario || dados;
    const vinculos = Array.isArray(perfil.vinculos) ? perfil.vinculos : [];
    clearElement(perfilVinculos);

    if (vinculos.length === 0) {
      perfilVinculos.appendChild(createTableMessageRow(5, "Nenhum vínculo encontrado."));
      return;
    }

    vinculos.forEach(function (vinculo) {
      const tr = document.createElement("tr");
      tr.appendChild(createTextCell(vinculo.grupoNome || "-"));
      tr.appendChild(createTextCell(vinculo.grupoCodigo || "-"));
      tr.appendChild(createTextCell(vinculo.papel || "-"));
      tr.appendChild(createTextCell(vinculo.status || "-"));
      tr.appendChild(criarCelulaAcoesVinculo(vinculo));
      perfilVinculos.appendChild(tr);
    });
  }

  function criarCelulaAcoesVinculo(vinculo) {
    const td = document.createElement("td");
    td.className = "text-end";
    const wrapper = document.createElement("div");
    wrapper.className = "d-flex justify-content-end gap-2 flex-wrap";

    if (vinculo.status === "aceito") {
      const btnAtivar = document.createElement("button");
      btnAtivar.type = "button";
      btnAtivar.className = "btn btn-sm btn-outline-primary";
      btnAtivar.textContent = Number(vinculo.grupoId) === Number(sessaoAtual.grupoAtivoId) ? "Ativo" : "Selecionar";
      btnAtivar.disabled = Number(vinculo.grupoId) === Number(sessaoAtual.grupoAtivoId);
      btnAtivar.addEventListener("click", async function () {
        await selecionarGrupoAtivo(vinculo.grupoId);
      });
      wrapper.appendChild(btnAtivar);
    }

    if (vinculo.status === "convidado") {
      wrapper.appendChild(criarBotao("Aceitar convite", "btn btn-sm btn-success", async function () {
        await aceitarOuRecusarConvite(vinculo.id, "aceitar");
      }));
      wrapper.appendChild(criarBotao("Recusar convite", "btn btn-sm btn-outline-danger", async function () {
        await aceitarOuRecusarConvite(vinculo.id, "recusar");
      }));
    }

    if (vinculo.status === "pendente") {
      wrapper.appendChild(criarBotao("Cancelar solicitação", "btn btn-sm btn-outline-warning", async function () {
        await cancelarSolicitacao(vinculo.id);
      }));
    }

    td.appendChild(wrapper);
    return td;
  }

  async function selecionarGrupoAtivo(grupoId) {
    try {
      exibirMensagem("Selecionando grupo ativo...", "muted");
      const { response: resposta, data: dados } = await apiPost("/meu-perfil/grupo-ativo", { grupoId });
      if (!resposta.ok) throw new Error(dados.erro || "Falha ao selecionar grupo.");
      exibirMensagem("Grupo ativo atualizado com sucesso.", "success");
      await carregarTudo();
    } catch (error) {
      console.error(error);
      exibirMensagem(error.message || "Não foi possível selecionar o grupo.", "danger");
    }
  }

  async function aceitarOuRecusarConvite(id, acao) {
    try {
      exibirMensagem("Salvando decisão...", "muted");
      const { response: resposta, data: dados } = await apiPost(`/meus-convites/${id}/${acao}`, {});
      if (!resposta.ok) throw new Error(dados.erro || "Falha ao processar convite.");
      exibirMensagem(`Convite ${acao === "aceitar" ? "aceito" : "recusado"} com sucesso.`, "success");
      await carregarTudo();
    } catch (error) {
      console.error(error);
      exibirMensagem(error.message || "Não foi possível processar o convite.", "danger");
    }
  }

  async function cancelarSolicitacao(id) {
    try {
      exibirMensagem("Cancelando solicitação...", "muted");
      const { response: resposta, data: dados } = await apiPost(`/meus-vinculos/${id}/cancelar-solicitacao`, {});
      if (!resposta.ok) throw new Error(dados.erro || "Falha ao cancelar solicitação.");
      exibirMensagem("Solicitação cancelada com sucesso.", "success");
      await carregarTudo();
    } catch (error) {
      console.error(error);
      exibirMensagem(error.message || "Não foi possível cancelar a solicitação.", "danger");
    }
  }

  async function carregarMembros() {
    clearElement(perfilMembros);

    if (!sessaoAtual.grupoId) {
      perfilMembros.appendChild(createTableMessageRow(5, "Nenhum grupo ativo selecionado."));
      return;
    }

    const { response: resposta, data: dados } = await apiGet("/meu-grupo/membros");
    if (!resposta.ok) {
      perfilMembros.appendChild(createTableMessageRow(5, "Não foi possível carregar membros do grupo ativo."));
      return;
    }

    const membros = Array.isArray(dados) ? dados : dados.membros || [];
    if (membros.length === 0) {
      perfilMembros.appendChild(createTableMessageRow(5, "Nenhum membro encontrado."));
      return;
    }

    membros.forEach(function (membro) {
      const tr = document.createElement("tr");
      const usuario = membro.usuario || {};
      const nome = getFullName(usuario, membro);
      const email = usuario.email || membro.email || "-";
      const papel = membro.papel || "-";
      const status = membro.status || "-";

      tr.appendChild(createTextCell(nome));
      tr.appendChild(createTextCell(email));
      tr.appendChild(createTextCell(papel));
      tr.appendChild(createTextCell(status));
      tr.appendChild(criarCelulaAcoesMembro(membro));
      perfilMembros.appendChild(tr);
    });
  }

  function criarCelulaAcoesMembro(membro) {
    const td = document.createElement("td");
    td.className = "text-end";
    const wrapper = document.createElement("div");
    wrapper.className = "d-flex justify-content-end gap-2 flex-wrap";

    if (papelAtual === "admingrupo" && membro.status === "aceito") {
      const novoPapel = membro.papel === "adminGrupo" ? "membro" : "adminGrupo";
      wrapper.appendChild(criarBotao(
        novoPapel === "adminGrupo" ? "Promover" : "Rebaixar",
        "btn btn-sm btn-outline-secondary",
        async function () {
          await alterarPapelMembro(membro.usuarioId || membro.usuario?.id, novoPapel);
        }
      ));

      if (Number(membro.usuarioId || membro.usuario?.id) !== Number(sessaoAtual.id)) {
        wrapper.appendChild(criarBotao("Remover", "btn btn-sm btn-outline-danger", async function () {
          await removerMembro(membro.usuarioId || membro.usuario?.id);
        }));
      }
    }

    td.appendChild(wrapper);
    return td;
  }

  async function alterarPapelMembro(usuarioId, papel) {
    try {
      exibirMensagem("Atualizando papel do membro...", "muted");
      const { response: resposta, data: dados } = await apiPatch(`/meu-grupo/membros/${usuarioId}/papel`, { papel });
      if (!resposta.ok) throw new Error(dados.erro || "Falha ao atualizar papel.");
      exibirMensagem("Papel do membro atualizado com sucesso.", "success");
      await carregarTudo();
    } catch (error) {
      console.error(error);
      exibirMensagem(error.message || "Não foi possível atualizar o papel.", "danger");
    }
  }

  async function removerMembro(usuarioId) {
    try {
      exibirMensagem("Removendo membro...", "muted");
      const { response: resposta, data: dados } = await apiPost(`/meu-grupo/membros/${usuarioId}/remover`, {});
      if (!resposta.ok) throw new Error(dados.erro || "Falha ao remover membro.");
      exibirMensagem("Membro removido com sucesso.", "success");
      await carregarTudo();
    } catch (error) {
      console.error(error);
      exibirMensagem(error.message || "Não foi possível remover o membro.", "danger");
    }
  }

  async function sairDoGrupo() {
    try {
      exibirMensagem("Saindo do grupo ativo...", "muted");
      const { response: resposta, data: dados } = await apiPost("/meu-grupo/sair", {});
      if (!resposta.ok) throw new Error(dados.erro || "Falha ao sair do grupo.");
      exibirMensagem("Saída do grupo registrada com sucesso.", "success");
      await carregarTudo();
    } catch (error) {
      console.error(error);
      exibirMensagem(error.message || "Não foi possível sair do grupo.", "danger");
    }
  }

  async function carregarSolicitacoes() {
    clearElement(perfilSolicitacoes);

    if (!sessaoAtual.grupoId) {
      perfilSolicitacoes.appendChild(createTableMessageRow(5, "Nenhum grupo ativo selecionado."));
      return;
    }

    const { response: resposta, data: dados } = await apiGet("/meu-grupo/solicitacoes");

    if (resposta.status === 403 || papelAtual !== "admingrupo") {
      if (perfilAdminAviso) perfilAdminAviso.textContent = "Somente adminGrupo aprova solicitações e convites.";
      perfilSolicitacoes.appendChild(createTableMessageRow(5, "Sem permissão para visualizar pendências."));
      return;
    }

    if (!resposta.ok) throw new Error(dados.erro || "Falha ao carregar pendências.");

    if (perfilAdminAviso) perfilAdminAviso.textContent = "";

    const solicitacoes = Array.isArray(dados) ? dados : dados.solicitacoes || [];
    if (solicitacoes.length === 0) {
      perfilSolicitacoes.appendChild(createTableMessageRow(5, "Nenhuma pendência encontrada."));
      return;
    }

    solicitacoes.forEach(function (solicitacao) {
      const tr = document.createElement("tr");
      const usuario = solicitacao.usuario || {};
      const id = Number(solicitacao.id);
      const nome = getFullName(usuario, solicitacao);
      const email = usuario.email || solicitacao.email || "-";
      const papel = solicitacao.papel || "membro";
      const status = solicitacao.status || "-";

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

    wrapper.appendChild(criarBotao("Aceitar", "btn btn-sm btn-success", async function () {
      await decidirSolicitacao(id, "aceitar");
    }));
    wrapper.appendChild(criarBotao("Recusar", "btn btn-sm btn-outline-danger", async function () {
      await decidirSolicitacao(id, "recusar");
    }));

    td.appendChild(wrapper);
    return td;
  }

  async function decidirSolicitacao(id, acao) {
    try {
      exibirMensagem("Salvando decisão...", "muted");
      const { response: resposta, data: dados } = await apiPatch(`/meu-grupo/solicitacoes/${id}/${acao}`, {});
      if (!resposta.ok) throw new Error(dados.erro || `Falha ao ${acao} pendência.`);
      exibirMensagem(`Pendência ${acao === "aceitar" ? "aceita" : "recusada"} com sucesso.`, "success");
      await carregarTudo();
    } catch (error) {
      console.error("Erro ao decidir solicitação:", error);
      exibirMensagem(error.message || "Não foi possível salvar a decisão.", "danger");
    }
  }

  async function salvarPerfil() {
    try {
      exibirMensagem("Salvando perfil...", "muted");
      const payload = {
        nome: inputNome.value.trim(),
        sobrenome: inputSobrenome.value.trim(),
        email: inputEmail.value.trim(),
        senha: inputSenha.value
      };
      const { response: resposta, data: dados } = await apiPatch("/meu-perfil", payload);
      if (!resposta.ok) throw new Error(dados.erro || "Falha ao salvar perfil.");
      exibirMensagem("Perfil atualizado com sucesso.", "success");
      await carregarTudo();
    } catch (error) {
      console.error(error);
      exibirMensagem(error.message || "Não foi possível salvar o perfil.", "danger");
    }
  }

  async function convidarUsuario() {
    try {
      exibirMensagem("Enviando convite...", "muted");
      const payload = {
        email: conviteEmail.value.trim(),
        papel: convitePapel.value
      };
      const { response: resposta, data: dados } = await apiPost("/meu-grupo/convites", payload);
      if (!resposta.ok) throw new Error(dados.erro || "Falha ao enviar convite.");
      conviteEmail.value = "";
      convitePapel.value = "membro";
      exibirMensagem("Convite criado com sucesso.", "success");
      await carregarTudo();
    } catch (error) {
      console.error(error);
      exibirMensagem(error.message || "Não foi possível enviar o convite.", "danger");
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

  async function logout() {
    await logoutAndRedirect();
  }

  function exibirMensagem(texto, variante) {
    if (!perfilMessage) return;
    setFeedbackMessage(perfilMessage, texto, variante, { classeBase: "small mt-3" });
  }
});
