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
      const sessao = await verificarSessao();
      papelAtual = String(sessao.usuario.papel || "").toLowerCase();
      await carregarPerfil();
      await carregarMembros();
      await carregarSolicitacoes();
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
      exibirMensagem("Não foi possível carregar a página de perfil.", "danger");
    }
  }

  async function verificarSessao() {
    const resposta = await fetch("/sessao", {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" }
    });

    if (!resposta.ok) {
      window.location.replace("index.html");
      throw new Error("Sessão não encontrada");
    }

    const dados = await lerJsonSeguro(resposta);
    if (!dados.usuario) {
      window.location.replace("index.html");
      throw new Error("Usuário não encontrado na sessão");
    }

    const statusGrupo = String(dados.usuario.statusGrupo || "").toLowerCase();
    if (statusGrupo && statusGrupo !== "aceito") {
      window.location.replace("aguardando.html");
      throw new Error("Usuário pendente");
    }

    return dados;
  }

  async function carregarPerfil() {
    const resposta = await fetch("/meu-perfil", {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" }
    });

    const dados = await lerJsonSeguro(resposta);
    if (!resposta.ok) {
      throw new Error(dados.erro || "Falha ao carregar perfil.");
    }

    const perfil = dados.usuario || dados;
    perfilDados.innerHTML = `
      <div><strong>Nome:</strong> ${escapar(perfil.nome || "-")}</div>
      <div><strong>E-mail:</strong> ${escapar(perfil.email || "-")}</div>
      <div><strong>Grupo:</strong> ${escapar(perfil.grupoNome || "-")}</div>
      <div><strong>Código do grupo:</strong> ${escapar(perfil.grupoCodigo || "-")}</div>
      <div><strong>Papel:</strong> ${escapar(perfil.papel || "-")}</div>
      <div><strong>Status:</strong> ${escapar(perfil.statusGrupo || "-")}</div>
    `;
  }

  async function carregarMembros() {
    const resposta = await fetch("/meu-grupo/membros", {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" }
    });

    const dados = await lerJsonSeguro(resposta);
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
      tr.innerHTML = `
        <td>${escapar(membro.nome || "-")}</td>
        <td>${escapar(membro.email || "-")}</td>
        <td>${escapar(membro.papel || "-")}</td>
        <td>${escapar(membro.status || membro.statusGrupo || "-")}</td>
      `;
      perfilMembros.appendChild(tr);
    });
  }

  async function carregarSolicitacoes() {
    const resposta = await fetch("/meu-grupo/solicitacoes", {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" }
    });

    const dados = await lerJsonSeguro(resposta);

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

    const solicitacoes = Array.isArray(dados) ? dados : dados.solicitacoes || [];
    perfilSolicitacoes.innerHTML = "";

    if (solicitacoes.length === 0) {
      perfilSolicitacoes.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhuma solicitação pendente.</td></tr>';
      return;
    }

    solicitacoes.forEach(function (solicitacao) {
      const tr = document.createElement("tr");
      const id = Number(solicitacao.id);
      tr.innerHTML = `
        <td>${escapar(solicitacao.nome || "-")}</td>
        <td>${escapar(solicitacao.email || "-")}</td>
        <td>${escapar(solicitacao.papel || "membro")}</td>
        <td>${escapar(solicitacao.status || solicitacao.statusGrupo || "pendente")}</td>
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
      const resposta = await fetch(`/meu-grupo/solicitacoes/${id}/${acao}`, {
        method: "PATCH",
        credentials: "include",
        headers: { Accept: "application/json" }
      });
      const dados = await lerJsonSeguro(resposta);
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
    try {
      await fetch("/logout", {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" }
      });
    } catch (error) {
      console.error("Erro ao sair:", error);
    } finally {
      window.location.replace("index.html");
    }
  }

  function exibirMensagem(texto, variante) {
    if (!perfilMessage) return;
    perfilMessage.className = `small mt-3 text-${variante}`;
    perfilMessage.textContent = texto;
  }

  function escapar(valor) {
    return String(valor || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function lerJsonSeguro(resposta) {
    const texto = await resposta.text();
    if (!texto) return {};
    try { return JSON.parse(texto); } catch { return {}; }
  }
});
