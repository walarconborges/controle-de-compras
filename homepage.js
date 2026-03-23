document.addEventListener("DOMContentLoaded", function () {
  const menu = document.getElementById("menu-lateral-homepage");
  const menuContent = menu ? menu.querySelector(".site-map-left-content") : null;
  const btnAbrir = document.getElementById("btn-menu-mobile");
  const btnFechar = document.getElementById("btn-fechar-menu-mobile");
  const backdrop = document.getElementById("menu-mobile-backdrop");

  function abrirMenu() {
    if (!menu || !menuContent || !btnAbrir || !backdrop) {
      return;
    }

    menu.classList.add("is-open");
    menuContent.classList.add("is-open");
    backdrop.hidden = false;
    btnAbrir.setAttribute("aria-expanded", "true");
    document.body.classList.add("menu-mobile-open");
  }

  function fecharMenu() {
    if (!menu || !menuContent || !btnAbrir || !backdrop) {
      return;
    }

    menu.classList.remove("is-open");
    menuContent.classList.remove("is-open");
    backdrop.hidden = true;
    btnAbrir.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-mobile-open");
  }

  if (btnAbrir) {
    btnAbrir.addEventListener("click", abrirMenu);
  }

  if (btnFechar) {
    btnFechar.addEventListener("click", fecharMenu);
  }

  if (backdrop) {
    backdrop.addEventListener("click", fecharMenu);
  }

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
});
