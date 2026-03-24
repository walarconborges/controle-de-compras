document.addEventListener("DOMContentLoaded", function () {
  const menu = document.getElementById("menu-lateral-homepage");
  const menuContent = menu ? menu.querySelector(".site-map-left-content") : null;
  const btnAbrir = document.getElementById("btn-menu-mobile");
  const btnFechar = document.getElementById("btn-fechar-menu-mobile");
  const backdrop = document.getElementById("menu-mobile-backdrop");
  const btnLogout = document.getElementById("btn-logout");
  const usuarioLogado = document.getElementById("usuario-logado");
  const sessaoInfo = document.getElementById("sessao-info");

  let ultimoElementoFocado = null;

  if (!menu || !menuContent || !backdrop || !btnLogout || !usuarioLogado || !sessaoInfo) {
    return;
  }

  verificarSessao();

  function abrirMenu() {
    ultimoElementoFocado = document.activeElement;

    menu.classList.add("is-open");
    menuContent.classList.add("is-open");
    menu.setAttribute("aria-hidden", "false");
    backdrop.hidden = false;

    if (btnAbrir) {
      btnAbrir.setAttribute("aria-expanded", "true");
    }

    document.body.classList.add("menu-mobile-open");
    menuContent.focus();
  }

  function fecharMenu() {
    menu.classList.remove("is-open");
    menuContent.classList.remove("is-open");
    menu.setAttribute("aria-hidden", "true");
    backdrop.hidden = true;

    if (btnAbrir) {
      btnAbrir.setAttribute("aria-expanded", "false");
    }

    document.body.classList.remove("menu-mobile-open");

    if (ultimoElementoFocado && typeof ultimoElementoFocado.focus === "function") {
      ultimoElementoFocado.focus();
    }
  }

  if (btnAbrir) {
    btnAbrir.addEventListener("click", abrirMenu);
  }

  if (btnFechar) {
    btnFechar.addEventListener("click", fecharMenu);
  }

  backdrop.addEventListener("click", fecharMenu);

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      fecharMenu();
    }
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth >= 992) {
      fecharMenu();
    }
  });

  btnLogout.addEventListener("click", async function () {
    try {
      definirEstadoLogout(true);

      const resposta = await fetch("/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (!resposta.ok) {
        throw new Error("Falha ao fazer logout");
      }

      window.location.replace("index.html");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      definirEstadoLogout(false);
      alert("Não foi possível fazer logout.");
    }
  });

  async function verificarSessao() {
    try {
      const resposta = await fetch("/sessao", {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (!resposta.ok) {
        window.location.replace("index.html");
        return;
      }

      const dados = await lerJsonSeguro(resposta);
      const usuario = dados.usuario;

      if (!usuario) {
        window.location.replace("index.html");
        return;
      }

      usuarioLogado.textContent = montarTextoUsuario(usuario);
      preencherSessaoInfo(usuario);
    } catch (error) {
      console.error("Erro ao verificar sessão:", error);
      window.location.replace("index.html");
    }
  }

  async function lerJsonSeguro(resposta) {
    try {
      return await resposta.json();
    } catch {
      return {};
    }
  }

  function montarTextoUsuario(usuario) {
    const nome = usuario.nome || "Usuário";
    const email = usuario.email || "sem e-mail";
    return `${nome} | ${email}`;
  }

  function preencherSessaoInfo(usuario) {
    sessaoInfo.textContent = "";

    const campos = [
      ["Usuário", usuario.nome || "Não informado"],
      ["E-mail", usuario.email || "Não informado"],
      ["Grupo ID", usuario.grupoId ?? "Não informado"],
      ["Papel", usuario.papel || "Não informado"],
    ];

    for (const [rotulo, valor] of campos) {
      const linha = document.createElement("div");

      const strong = document.createElement("strong");
      strong.textContent = `${rotulo}: `;

      const span = document.createElement("span");
      span.textContent = String(valor);

      linha.appendChild(strong);
      linha.appendChild(span);
      sessaoInfo.appendChild(linha);
    }
  }

  function definirEstadoLogout(saindo) {
    btnLogout.disabled = saindo;
    btnLogout.textContent = saindo ? "Saindo..." : "Sair";
  }
});