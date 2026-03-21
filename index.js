// Espera o carregamento completo do HTML antes de executar o código
document.addEventListener("DOMContentLoaded", function () {
  // Seleciona o formulário de login
  const loginForm = document.getElementById("login-form");

  // Seleciona os campos do formulário
  const emailInput = document.getElementById("email");
  const senhaInput = document.getElementById("senha");

  // Seleciona a área onde mensagens de retorno serão exibidas
  const loginMessage = document.getElementById("login-message");

  // Seleciona o campo oculto reservado para futuro uso com autenticação
  const authTokenInput = document.getElementById("auth-token");

  // Garante que o formulário existe antes de continuar
  if (!loginForm) {
    return;
  }

  // Escuta o envio do formulário
  loginForm.addEventListener("submit", function (event) {
    // Impede o recarregamento automático da página
    event.preventDefault();

    // Limpa mensagens antigas antes de iniciar nova tentativa
    clearLoginMessage();

    // Captura os valores digitados pelo usuário
    const email = emailInput.value.trim();
    const senha = senhaInput.value.trim();

    // Validação básica local antes da futura integração com banco
    if (!email || !senha) {
      showLoginMessage("Preencha e-mail e senha.");
      return;
    }

    // Chama a função central de login
    processLogin(email, senha);
  });

  // Função principal de login
  // No futuro, aqui será feita a integração com banco de dados ou serviço de autenticação
  function processLogin(email, senha) {
    /*
      AGUARDANDO ESCOLHA DO BANCO DE DADOS

      Futuramente, esta função poderá:
      1. Enviar e-mail e senha para validação
      2. Receber resposta do banco ou serviço de autenticação
      3. Armazenar token ou sessão
      4. Redirecionar apenas se o login for válido
    */

    // Simulação temporária de login bem-sucedido
    const loginSucesso = true;

    if (loginSucesso) {
      // Campo reservado para futuro token de autenticação
      authTokenInput.value = "";

      // Redireciona para a página principal
      window.location.href = "homepage.html";
      return;
    }

    // Exibe mensagem caso o login falhe
    showLoginMessage("E-mail ou senha inválidos.");
  }

  // Exibe mensagem de retorno para o usuário
  function showLoginMessage(message) {
    loginMessage.textContent = message;
  }

  // Limpa a mensagem anterior
  function clearLoginMessage() {
    loginMessage.textContent = "";
  }
});
