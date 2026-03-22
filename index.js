document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("login-form");
  const emailInput = document.getElementById("email");
  const senhaInput = document.getElementById("senha");
  const loginMessage = document.getElementById("login-message");
  const authTokenInput = document.getElementById("auth-token");

  if (!loginForm || !emailInput || !senhaInput || !loginMessage || !authTokenInput) {
    return;
  }

  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();
    limparMensagemLogin();

    const email = emailInput.value.trim();
    const senha = senhaInput.value.trim();

    if (!email || !senha) {
      exibirMensagemLogin("Preencha e-mail e senha.");
      return;
    }

    if (!validarEmail(email)) {
      exibirMensagemLogin("Digite um e-mail válido.");
      return;
    }

    processarLogin(email, senha);
  });

  function processarLogin(email, senha) {
    const loginSucesso = Boolean(email && senha);

    if (loginSucesso) {
      authTokenInput.value = "";
      window.location.href = "homepage.html";
      return;
    }

    exibirMensagemLogin("E-mail ou senha inválidos.");
  }

  function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function exibirMensagemLogin(mensagem) {
    loginMessage.textContent = mensagem;
  }

  function limparMensagemLogin() {
    loginMessage.textContent = "";
  }
});
