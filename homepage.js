// Espera o carregamento completo do HTML antes de executar o código
document.addEventListener("DOMContentLoaded", function () {
  // Seleciona todos os botões das abas no rodapé
  const tabButtons = document.querySelectorAll(".bottom-tabs .nav-link");

  // Seleciona todas as seções principais da página
  const pageSections = document.querySelectorAll(".page-section");

  // Percorre cada botão de aba para adicionar o evento de clique
  tabButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      // Lê o valor do atributo data-page do botão clicado
      // Esse valor indica qual seção deve ser exibida
      const targetPage = button.getAttribute("data-page");

      // Remove a classe active de todas as abas
      tabButtons.forEach(function (tab) {
        tab.classList.remove("active");
      });

      // Adiciona a classe active apenas na aba clicada
      button.classList.add("active");

      // Esconde todas as seções removendo a classe active
      pageSections.forEach(function (section) {
        section.classList.remove("active");
      });

      // Mostra apenas a seção correspondente à aba clicada
      document.getElementById(targetPage).classList.add("active");
    });
  });
});
