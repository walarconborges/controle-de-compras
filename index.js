// Espera o carregamento completo do HTML antes de executar o código
document.addEventListener("DOMContentLoaded", function () {
  // Seleciona o formulário de login da página
  const form = document.querySelector("form");

  // Verifica se o formulário existe antes de adicionar o evento
  if (form) {
    // Intercepta o envio do formulário
    form.addEventListener("submit", function (event) {
      // Impede o recarregamento automático da página
      event.preventDefault();

      // Redireciona para a página principal do site
      // No futuro, aqui será colocada a validação real do login
      window.location.href = "homepage.html";
    });
  }
});
