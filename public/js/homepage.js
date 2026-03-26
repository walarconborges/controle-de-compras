import { ensureAcceptedSession, logoutAndRedirect } from "./auth.js";
import { setupMobileMenu, renderKeyValueRows } from "./dom.js";

document.addEventListener("DOMContentLoaded", function () {
  const menu = document.getElementById("menu-lateral-homepage");
  const menuContent = menu ? menu.querySelector(".site-map-left-content") : null;
  const btnAbrir = document.getElementById("btn-menu-mobile");
  const btnFechar = document.getElementById("btn-fechar-menu-mobile");
  const backdrop = document.getElementById("menu-mobile-backdrop");
  const btnLogout = document.getElementById("btn-logout");
  const usuarioLogado = document.getElementById("usuario-logado");
  const sessaoInfo = document.getElementById("sessao-info");
  const linkPainelSistema = document.getElementById("link-painel-sistema");

  if (!menu || !menuContent || !backdrop || !btnLogout || !usuarioLogado || !sessaoInfo) return;

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
      definirEstadoLogout(true);
      await logoutAndRedirect();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      definirEstadoLogout(false);
      alert("Não foi possível fazer logout.");
    }
  });

  async function verificarSessao() {
    try {
      const usuario = await ensureAcceptedSession();
      usuarioLogado.textContent = `${usuario.nome || "Usuário"} | ${usuario.email || "sem e-mail"}`;
      preencherSessaoInfo(usuario);

      if (linkPainelSistema) {
        linkPainelSistema.hidden = !usuario.adminSistema;
      }
    } catch (error) {
      console.error("Erro ao verificar sessão:", error);
      window.location.replace("index.html");
    }
  }

  function preencherSessaoInfo(usuario) {
    const campos = [
      ["Usuário", usuario.nomeCompleto || usuario.nome || "Não informado"],
      ["E-mail", usuario.email || "Não informado"],
      ["Grupo ativo", usuario.grupoNome || "Não informado"],
      ["Código do grupo", usuario.grupoCodigo || "Não informado"],
      ["Grupo ID", usuario.grupoId ?? "Não informado"],
      ["Papel no grupo", usuario.papel || "Não informado"],
      ["Papel global", usuario.papelGlobal || "usuario"],
      ["Admin do sistema", usuario.adminSistema ? "Sim" : "Não"],
    ];
    renderKeyValueRows(sessaoInfo, campos);
  }

  function definirEstadoLogout(saindo) {
    btnLogout.disabled = saindo;
    btnLogout.textContent = saindo ? "Saindo..." : "Sair";
  }
});
