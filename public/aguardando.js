document.addEventListener("DOMContentLoaded", function () {
  const info = document.getElementById("aguardando-info");
  const mensagem = document.getElementById("aguardando-message");
  const btnAtualizar = document.getElementById("btn-atualizar-status");
  const btnSair = document.getElementById("btn-sair");

  verificarStatus();

  if (btnAtualizar) {
    btnAtualizar.addEventListener("click", verificarStatus);
  }

  if (btnSair) {
    btnSair.addEventListener("click", logout);
  }

  async function verificarStatus() {
    try {
      exibirMensagem("Verificando status...", "muted");
      const resposta = await fetch("/meu-status-grupo", {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" }
      });

      if (!resposta.ok) {
        window.location.replace("index.html");
        return;
      }

      const dados = await lerJsonSeguro(resposta);
      const usuario = dados.usuario || dados;
      const status = String(usuario.statusGrupo || "").toLowerCase();
      const grupoNome = usuario.grupoNome || "-";
      const grupoCodigo = usuario.grupoCodigo || "-";
      const papel = usuario.papel || "-";

      if (info) {
        info.textContent = `Grupo: ${grupoNome} | Código: ${grupoCodigo} | Papel: ${papel} | Status: ${status || "-"}`;
      }

      if (status === "aceito") {
        exibirMensagem("Acesso liberado. Redirecionando...", "success");
        setTimeout(function () {
          window.location.replace("homepage.html");
        }, 300);
        return;
      }

      exibirMensagem("Seu acesso ainda está pendente.", "warning");
    } catch (error) {
      console.error("Erro ao verificar status:", error);
      exibirMensagem("Não foi possível verificar o status agora.", "danger");
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
    if (!mensagem) {
      return;
    }
    mensagem.className = `small mt-3 text-${variante}`;
    mensagem.textContent = texto;
  }

  async function lerJsonSeguro(resposta) {
    const texto = await resposta.text();
    if (!texto) return {};
    try { return JSON.parse(texto); } catch { return {}; }
  }
});
