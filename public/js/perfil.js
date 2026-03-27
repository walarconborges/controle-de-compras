import { apiGet, apiPatch, apiPost } from "./api.js";
import { ensureAnySession, logoutAndRedirect } from "./auth.js";
import { clearElement, createTableMessageRow, createTextCell, renderKeyValueRows, setupMobileMenu } from "./dom.js";
import { getFullName } from "./formatters.js";
import {
  setFeedbackMessage,
  clearFeedbackMessage,
  clearFieldErrors,
  setFieldError
} from "./messages.js";

document.addEventListener("DOMContentLoaded", function () {
  const menu = document.getElementById("menu-lateral-perfil");
  const menuContent = menu ? menu.querySelector(".site-map-left-content") : null;
  const btnAbrirMenu = document.getElementById("btn-menu-mobile");
  const btnFecharMenu = document.getElementById("btn-fechar-menu-mobile");
  const backdrop = document.getElementById("menu-mobile-backdrop");

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
  const secaoVinculos = document.getElementById("secao-vinculos");
  const secaoPendencias = document.getElementById("secao-pendencias");
  const thMembrosAcoes = document.getElementById("th-membros-acoes");
  const thVinculosAcoes = document.getElementById("th-vinculos-acoes");

  const inputNome = document.getElementById("perfil-nome");
  const inputSobrenome = document.getElementById("perfil-sobrenome");
  const inputEmail = document.getElementById("perfil-email");
  const inputSenha = document.getElementById("perfil-senha");
  const btnSalvarPerfil = perfilForm ? perfilForm.querySelector('button[type="submit"]') : null;
  const btnEnviarConvite = conviteForm ? conviteForm.querySelector('button[type="submit"]') : null;

  const camposPerfil = [inputNome, inputSobrenome, inputEmail, inputSenha].filter(Boolean);
  const camposConvite = [conviteEmail, convitePapel].filter(Boolean);

  let sessaoAtual = null;
  let papelAtual = "";

  if (menu && menuContent && backdrop) {
    setupMobileMenu({
      menu,
      menuContent,
      btnOpen: btnAbrirMenu,
      btnClose: btnFecharMenu,
      backdrop
    });
  }

  inicializar();

  if (btnLogout) btnLogout.addEventListener("click", logout);
  if (btnSairGrupo) btnSairGrupo.addEventListener("click", sairDoGrupo);

  if (perfilForm) {
    perfilForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      clearFieldErrors(camposPerfil);
      await salvarPerfil();
    });
  }

  if (conviteForm) {
    conviteForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      clearFieldErrors(camposConvite);
      await convidarUsuario();
    });
  }

  camposPerfil.forEach(function (campo) {
    campo.addEventListener("input", function () {
      clearFieldErrors([campo]);
    });
  });

  camposConvite.forEach(function (campo) {
    campo.addEventListener("input", function () {
      clearFieldErrors([campo]);
    });
  });

  async function inicializar() {
    try {
      exibirMensagem("Carregando perfil...", "muted");
      renderizarLoadingInicial();
      sessaoAtual = await ensureAnySession();
      papelAtual = String(sessaoAtual.papel || "").toLowerCase();

      if (linkPainelSistema) {
        linkPainelSistema.hidden = !sessaoAtual.adminSistema;
      }

      await carregarTudo();
      limparMensagem();
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
      exibirMensagem("Não foi possível carregar a página de perfil.", "danger");
    }
  }

  function usuarioEhAdminGrupoOuSistema() {
    return papelAtual === "admingrupo" || Boolean(sessaoAtual?.adminSistema);
  }

  function formatarGrupoAtivo(perfil) {
    if (!perfil.grupoNome) {
      return "Nenhum selecionado";
    }
    return perfil.grupoCodigo ? `${perfil.grupoNome} (${perfil.grupoCodigo})` : perfil.grupoNome;
  }

  function deveExibirSecaoVinculos(vinculos) {
    if (!Array.isArray(vinculos) || vinculos.length === 0) {
      return false;
    }

    const aceitos = vinculos.filter((vinculo) => vinculo.status === "aceito");
    const pendentesOuConvites = vinculos.some((vinculo) => vinculo.status !== "aceito");

    return aceitos.length > 1 || pendentesOuConvites;
  }

  function configurarVisibilidadeAdmin() {
    const podeGerenciar = usuarioEhAdminGrupoOuSistema();

    if (conviteForm) {
      conviteForm.hidden = !podeGerenciar;
    }

    if (thMembrosAcoes) {
      thMembrosAcoes.hidden = !podeGerenciar;
    }

    if (secaoPendencias) {
      secaoPendencias.hidden = !podeGerenciar;
    }

    if (perfilAdminAviso) {
      perfilAdminAviso.hidden = true;
      perfilAdminAviso.textContent = "";
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
      ["Grupo ativo", formatarGrupoAtivo(perfil)],
      ["Status atual", perfil.statusGrupo || "-"]
    ]);

    configurarVisibilidadeAdmin();

    if (btnSairGrupo) {
      btnSairGrupo.hidden = !perfil.grupoId;
    }
  }

  async function carregarVinculos() {
    renderizarLoadingTabela(perfilVinculos, 5, 2);

    const { response: resposta, data: dados } = await apiGet("/meu-perfil");
    if (!resposta.ok) throw new Error(dados.erro || "Falha ao carregar vínculos.");

    const perfil = dados.usuario || dados;
    const vinculos = Array.isArray(perfil.vinculos) ? perfil.vinculos : [];
    const exibirSecao = deveExibirSecaoVinculos(vinculos);

    if (secaoVinculos) {
      secaoVinculos.hidden = !exibirSecao;
    }

    clearElement(perfilVinculos);

    if (!exibirSecao) {
      return;
    }

    if (thVinculosAcoes) {
      thVinculosAcoes.hidden = false;
    }

    if (vinculos.length === 0) {
      perfilVinculos.appendChild(createTableMessageRow(5, "Você ainda não possui vínculos com grupos."));
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
        await executarAcaoBotao(btnAtivar, "Selecionando grupo ativo...", async function () {
          await selecionarGrupoAtivo(vinculo.grupoId);
        });
      });
      wrapper.appendChild(btnAtivar);
    }

    if (vinculo.status === "convidado") {
      wrapper.appendChild(criarBotao("Aceitar convite", "btn btn-sm btn-success", async function (event) {
        await executarAcaoBotao(event.currentTarget, "Salvando decisão...", async function () {
          await aceitarOuRecusarConvite(vinculo.id, "aceitar");
        });
      }));

      wrapper.appendChild(criarBotao("Recusar convite", "btn btn-sm btn-outline-danger", async function (event) {
        await executarAcaoBotao(event.currentTarget, "Salvando decisão...", async function () {
          await aceitarOuRecusarConvite(vinculo.id, "recusar");
        });
      }));
    }

    if (vinculo.status === "pendente") {
      wrapper.appendChild(criarBotao("Cancelar solicitação", "btn btn-sm btn-outline-warning", async function (event) {
        await executarAcaoBotao(event.currentTarget, "Cancelando solicitação...", async function () {
          await cancelarSolicitacao(vinculo.id);
        });
      }));
    }

    td.appendChild(wrapper);
    return td;
  }

  async function selecionarGrupoAtivo(grupoId) {
    const { response: resposta, data: dados } = await apiPost("/meu-perfil/grupo-ativo", { grupoId });
    if (!resposta.ok) throw new Error(dados.erro || "Falha ao selecionar grupo.");
    exibirMensagem("Grupo ativo atualizado com sucesso.", "success");
    await carregarTudo();
  }

  async function aceitarOuRecusarConvite(id, acao) {
    const { response: resposta, data: dados } = await apiPost(`/meus-convites/${id}/${acao}`, {});
    if (!resposta.ok) throw new Error(dados.erro || "Falha ao processar convite.");
    exibirMensagem(`Convite ${acao === "aceitar" ? "aceito" : "recusado"} com sucesso.`, "success");
    await carregarTudo();
  }

  async function cancelarSolicitacao(id) {
    const { response: resposta, data: dados } = await apiPost(`/meus-vinculos/${id}/cancelar-solicitacao`, {});
    if (!resposta.ok) throw new Error(dados.erro || "Falha ao cancelar solicitação.");
    exibirMensagem("Solicitação cancelada com sucesso.", "success");
    await carregarTudo();
  }

  async function carregarMembros() {
    renderizarLoadingTabela(perfilMembros, usuarioEhAdminGrupoOuSistema() ? 5 : 4, 3);

    if (!sessaoAtual.grupoId) {
      clearElement(perfilMembros);
      perfilMembros.appendChild(createTableMessageRow(usuarioEhAdminGrupoOuSistema() ? 5 : 4, "Selecione um grupo ativo para visualizar membros."));
      return;
    }

    const { response: resposta, data: dados } = await apiGet("/meu-grupo/membros");
    clearElement(perfilMembros);

    if (!resposta.ok) {
      perfilMembros.appendChild(createTableMessageRow(usuarioEhAdminGrupoOuSistema() ? 5 : 4, "Não foi possível carregar membros do grupo."));
      return;
    }

    const membros = Array.isArray(dados) ? dados : dados.membros || [];
    if (membros.length === 0) {
      perfilMembros.appendChild(createTableMessageRow(usuarioEhAdminGrupoOuSistema() ? 5 : 4, "Nenhum membro encontrado no grupo."));
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

      if (usuarioEhAdminGrupoOuSistema()) {
        tr.appendChild(criarCelulaAcoesMembro(membro));
      }

      perfilMembros.appendChild(tr);
    });
  }

  function criarCelulaAcoesMembro(membro) {
    const td = document.createElement("td");
    td.className = "text-end";
    const wrapper = document.createElement("div");
    wrapper.className = "d-flex justify-content-end gap-2 flex-wrap";

    if (usuarioEhAdminGrupoOuSistema() && membro.status === "aceito") {
      const novoPapel = membro.papel === "adminGrupo" ? "membro" : "adminGrupo";
      wrapper.appendChild(criarBotao(
        novoPapel === "adminGrupo" ? "Promover" : "Rebaixar",
        "btn btn-sm btn-outline-secondary",
        async function (event) {
          await executarAcaoBotao(event.currentTarget, "Atualizando papel do membro...", async function () {
            await alterarPapelMembro(membro.usuarioId || membro.usuario?.id, novoPapel);
          });
        }
      ));

      if (Number(membro.usuarioId || membro.usuario?.id) !== Number(sessaoAtual.id)) {
        wrapper.appendChild(criarBotao("Remover", "btn btn-sm btn-outline-danger", async function (event) {
          await executarAcaoBotao(event.currentTarget, "Removendo membro...", async function () {
            await removerMembro(membro.usuarioId || membro.usuario?.id);
          });
        }));
      }
    }

    td.appendChild(wrapper);
    return td;
  }

  async function alterarPapelMembro(usuarioId, papel) {
    const { response: resposta, data: dados } = await apiPatch(`/meu-grupo/membros/${usuarioId}/papel`, { papel });
    if (!resposta.ok) throw new Error(dados.erro || "Falha ao atualizar papel.");
    exibirMensagem("Papel do membro atualizado com sucesso.", "success");
    await carregarTudo();
  }

  async function removerMembro(usuarioId) {
    const { response: resposta, data: dados } = await apiPost(`/meu-grupo/membros/${usuarioId}/remover`, {});
    if (!resposta.ok) throw new Error(dados.erro || "Falha ao remover membro.");
    exibirMensagem("Membro removido com sucesso.", "success");
    await carregarTudo();
  }

  async function sairDoGrupo() {
    try {
      await executarAcaoBotao(btnSairGrupo, "Saindo do grupo...", async function () {
        const { response: resposta, data: dados } = await apiPost("/meu-grupo/sair", {});
        if (!resposta.ok) throw new Error(dados.erro || "Falha ao sair do grupo.");
        exibirMensagem("Saída do grupo registrada com sucesso.", "success");
        await carregarTudo();
      });
    } catch (error) {
      console.error(error);
      exibirMensagem(error.message || "Não foi possível sair do grupo.", "danger");
    }
  }

  async function carregarSolicitacoes() {
    clearElement(perfilSolicitacoes);

    if (!usuarioEhAdminGrupoOuSistema()) {
      return;
    }

    renderizarLoadingTabela(perfilSolicitacoes, 5, 2);

    if (!sessaoAtual.grupoId) {
      clearElement(perfilSolicitacoes);
      perfilSolicitacoes.appendChild(createTableMessageRow(5, "Selecione um grupo ativo para visualizar pendências."));
      return;
    }

    const { response: resposta, data: dados } = await apiGet("/meu-grupo/solicitacoes");
    clearElement(perfilSolicitacoes);

    if (!resposta.ok) throw new Error(dados.erro || "Falha ao carregar pendências.");

    const solicitacoes = Array.isArray(dados) ? dados : dados.solicitacoes || [];
    if (solicitacoes.length === 0) {
      perfilSolicitacoes.appendChild(createTableMessageRow(5, "Nenhuma pendência encontrada no grupo."));
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

    wrapper.appendChild(criarBotao("Aceitar", "btn btn-sm btn-success", async function (event) {
      await executarAcaoBotao(event.currentTarget, "Salvando decisão...", async function () {
        await decidirSolicitacao(id, "aceitar");
      });
    }));

    wrapper.appendChild(criarBotao("Recusar", "btn btn-sm btn-outline-danger", async function (event) {
      await executarAcaoBotao(event.currentTarget, "Salvando decisão...", async function () {
        await decidirSolicitacao(id, "recusar");
      });
    }));

    td.appendChild(wrapper);
    return td;
  }

  async function decidirSolicitacao(id, acao) {
    const { response: resposta, data: dados } = await apiPatch(`/meu-grupo/solicitacoes/${id}/${acao}`, {});
    if (!resposta.ok) throw new Error(dados.erro || `Falha ao ${acao} pendência.`);
    exibirMensagem(`Pendência ${acao === "aceitar" ? "aceita" : "recusada"} com sucesso.`, "success");
    await carregarTudo();
  }

  async function salvarPerfil() {
    try {
      const payload = {
        nome: inputNome.value.trim(),
        sobrenome: inputSobrenome.value.trim(),
        email: inputEmail.value.trim(),
        senha: inputSenha.value
      };

      if (!payload.nome) {
        setFieldError(inputNome, "Preencha o nome.");
        inputNome.focus();
        return;
      }

      if (!payload.sobrenome) {
        setFieldError(inputSobrenome, "Preencha o sobrenome.");
        inputSobrenome.focus();
        return;
      }

      if (!payload.email) {
        setFieldError(inputEmail, "Preencha o e-mail.");
        inputEmail.focus();
        return;
      }

      await executarAcaoBotao(btnSalvarPerfil, "Salvando perfil...", async function () {
        const { response: resposta, data: dados } = await apiPatch("/meu-perfil", payload);
        if (!resposta.ok) {
          const mensagem = dados.erro || "Falha ao salvar perfil.";

          if (/nome/i.test(mensagem) && !/sobrenome/i.test(mensagem)) {
            setFieldError(inputNome, mensagem);
          } else if (/sobrenome/i.test(mensagem)) {
            setFieldError(inputSobrenome, mensagem);
          } else if (/email/i.test(mensagem)) {
            setFieldError(inputEmail, mensagem);
          } else if (/senha/i.test(mensagem)) {
            setFieldError(inputSenha, mensagem);
          }

          throw new Error(mensagem);
        }

        exibirMensagem("Perfil atualizado com sucesso.", "success");
        await carregarTudo();
      });
    } catch (error) {
      console.error(error);
      exibirMensagem(error.message || "Não foi possível salvar o perfil.", "danger");
    }
  }

  async function convidarUsuario() {
    try {
      const payload = {
        email: conviteEmail.value.trim(),
        papel: convitePapel.value
      };

      if (!payload.email) {
        setFieldError(conviteEmail, "Informe o e-mail do usuário.");
        conviteEmail.focus();
        return;
      }

      await executarAcaoBotao(btnEnviarConvite, "Enviando convite...", async function () {
        const { response: resposta, data: dados } = await apiPost("/meu-grupo/convites", payload);
        if (!resposta.ok) {
          const mensagem = dados.erro || "Falha ao enviar convite.";

          if (/email/i.test(mensagem)) {
            setFieldError(conviteEmail, mensagem);
          } else if (/papel/i.test(mensagem)) {
            setFieldError(convitePapel, mensagem);
          }

          throw new Error(mensagem);
        }

        conviteEmail.value = "";
        convitePapel.value = "membro";
        exibirMensagem("Convite criado com sucesso.", "success");
        await carregarTudo();
      });
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

  async function executarAcaoBotao(botao, mensagem, callback) {
    const textoOriginal = botao ? botao.textContent : "";
    if (botao) {
      botao.disabled = true;
      botao.textContent = "Salvando...";
    }

    try {
      exibirMensagem(mensagem, "muted");
      await callback();
    } finally {
      if (botao) {
        botao.disabled = false;
        botao.textContent = textoOriginal;
      }
    }
  }

  async function logout() {
    await logoutAndRedirect();
  }

  function renderizarLoadingInicial() {
    renderKeyValueRows(perfilDados, [
      ["Nome completo", "Carregando..."],
      ["E-mail", "Carregando..."],
      ["Grupo ativo", "Carregando..."],
      ["Status atual", "Carregando..."]
    ]);

    if (secaoVinculos && !secaoVinculos.hidden) {
      renderizarLoadingTabela(perfilVinculos, 5, 2);
    }
    renderizarLoadingTabela(perfilMembros, usuarioEhAdminGrupoOuSistema() ? 5 : 4, 2);
    if (secaoPendencias && !secaoPendencias.hidden) {
      renderizarLoadingTabela(perfilSolicitacoes, 5, 2);
    }
  }

  function renderizarLoadingTabela(tbody, totalColunas, totalLinhas) {
    if (!tbody) {
      return;
    }

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

  function exibirMensagem(texto, variante) {
    if (!perfilMessage) return;
    setFeedbackMessage(perfilMessage, texto, variante, { classeBase: "small mt-3" });
  }

  function limparMensagem() {
    if (!perfilMessage) return;
    clearFeedbackMessage(perfilMessage, { classeBase: "small mt-3" });
  }
});
