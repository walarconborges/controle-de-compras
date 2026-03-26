import { apiGet } from "./api.js";
import { logoutAndRedirect } from "./auth.js";
import { setFeedbackMessage } from "./messages.js";

document.addEventListener("DOMContentLoaded", function () {
  const info = document.getElementById("aguardando-info");
  const mensagem = document.getElementById("aguardando-message");
  const btnAtualizar = document.getElementById("btn-atualizar-status");
  const btnSair = document.getElementById("btn-sair");

  verificarStatus();

  if (btnAtualizar) btnAtualizar.addEventListener("click", verificarStatus);
  if (btnSair) btnSair.addEventListener("click", logout);

  async function verificarStatus() {
    try {
      exibirMensagem("Verificando status...", "muted");
      const { response: resposta, data: dados } = await apiGet("/meu-status-grupo");

      if (!resposta.ok) {
        window.location.replace("index.html");
        return;
      }

      const usuario = dados.usuario || dados;
      const vinculos = Array.isArray(usuario.vinculos) ? usuario.vinculos : [];
      const descricaoVinculos = vinculos.map((v) => `${v.grupoNome || "-"}: ${v.status}`).join(" | ") || "-";

      if (info) {
        info.textContent = `Vínculos: ${descricaoVinculos}`;
      }

      if (usuario.precisaSelecionarGrupo) {
        exibirMensagem("Você possui mais de um grupo aceito. Escolha o grupo ativo no perfil.", "warning");
        setTimeout(function () {
          window.location.replace("perfil.html");
        }, 600);
        return;
      }

      if (usuario.temGrupoAceito && usuario.grupoId) {
        exibirMensagem("Acesso liberado. Redirecionando...", "success");
        setTimeout(function () {
          window.location.replace("homepage.html");
        }, 300);
        return;
      }

      exibirMensagem("Seu acesso ainda está pendente ou aguardando ação em um convite.", "warning");
    } catch (error) {
      console.error("Erro ao verificar status:", error);
      exibirMensagem("Não foi possível verificar o status agora.", "danger");
    }
  }

  async function logout() {
    await logoutAndRedirect();
  }

  function exibirMensagem(texto, variante) {
    if (!mensagem) return;
    setFeedbackMessage(mensagem, texto, variante, { classeBase: "small mt-3" });
  }
});
