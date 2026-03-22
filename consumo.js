// Espera o HTML carregar completamente antes de executar o código
document.addEventListener("DOMContentLoaded", function () {
  // Seleciona os botões das abas internas
  const tabButtons = document.querySelectorAll("#consumo-tabs .nav-link");

  // Seleciona as seções de conteúdo das abas
  const tabSections = document.querySelectorAll(".tab-content-section");

  // Adiciona evento de clique em cada aba
  tabButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const targetTab = button.getAttribute("data-tab");

      // Remove o estado ativo de todas as abas
      tabButtons.forEach(function (tab) {
        tab.classList.remove("active");
      });

      // Ativa apenas a aba clicada
      button.classList.add("active");

      // Esconde todas as seções
      tabSections.forEach(function (section) {
        section.classList.remove("active");
      });

      // Mostra apenas a seção correspondente
      document.getElementById(targetTab).classList.add("active");
    });
  });
});
