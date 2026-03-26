import { ensureAcceptedSession, logoutAndRedirect } from "./auth.js";
import { setupMobileMenu } from "./dom.js";
import { setFeedbackMessage, clearFeedbackMessage } from "./messages.js";

document.addEventListener("DOMContentLoaded", function () {
  const menu = document.getElementById("menu-lateral-homepage");
  const menuContent = menu ? menu.querySelector(".site-map-left-content") : null;
  const btnAbrir = document.getElementById("btn-menu-mobile");
  const btnFechar = document.getElementById("btn-fechar-menu-mobile");
  const backdrop = document.getElementById("menu-mobile-backdrop");
  const btnLogout = document.getElementById("btn-logout");
  const linkPainelSistema = document.getElementById("link-painel-sistema");
  const homepageMessage = document.getElementById("homepage-message");

  if (!menu || !menuContent || !backdrop || !btnLogout || !homepageMessage) {
    return;
  }

  setupMobileMenu({
    menu,
    menuContent,
    btnOpen: btnAbrir,
    btnClose: btnFechar,
    backdrop
  });

  verificarSessao();

  btnLogout.addEventListener("click", async function () {
    try {
      exibirMensagem("Encerrando sessão...", "muted");
      definirEstadoLogout(true);
      await logoutAndRedirect();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      definirEstadoLogout(false);
      exibirMensagem("Não foi possível fazer logout.", "danger");
    }
  });

  async function verificarSessao() {
    try {
      const usuario = await ensureAcceptedSession();

      if (linkPainelSistema) {
        linkPainelSistema.hidden = !usuario.adminSistema;
      }

      limparMensagem();
    } catch (error) {
      console.error("Erro ao verificar sessão:", error);
      exibirMensagem("Não foi possível validar a sessão.", "danger");
      window.location.replace("index.html");
    }
  }

  function definirEstadoLogout(saindo) {
    btnLogout.disabled = saindo;
    btnLogout.textContent = saindo ? "Saindo..." : "Sair";
  }

  function exibirMensagem(texto, variante) {
    setFeedbackMessage(homepageMessage, texto, variante, {
      classeBase: "small mt-3"
    });
  }

  function limparMensagem() {
    clearFeedbackMessage(homepageMessage, {
      classeBase: "small mt-3"
    });
  }
});
