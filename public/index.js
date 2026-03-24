document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("login-form");
  const emailInput = document.getElementById("email");
  const senhaInput = document.getElementById("senha");
  const loginMessage = document.getElementById("login-message");
  const btnEntrar = document.getElementById("btn-entrar");

  if (!loginForm || !emailInput || !senhaInput || !loginMessage || !btnEntrar) {
    return;
  }

  verificarSessaoAtual();

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    limparMensagemLogin();

    const email = emailInput.value.trim();
    const senha = senhaInput.value;

    if (!email) {
      exibirMensagemLogin("Preencha o e-mail.", "danger");
      emailInput.focus();
      return;
    }

    if (!validarEmail(email)) {
      exibirMensagemLogin("Digite um e-mail válido.", "danger");
      emailInput.focus();
      return;
    }

    if (!senha) {
      exibirMensagemLogin("Preencha a senha.", "danger");
      senhaInput.focus();
      return;
    }

    await processarLogin(email, senha);
  });

  async function verificarSessaoAtual() {
    try {
      const resposta = await fetch("/sessao", {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (!resposta.ok) {
        return;
      }

      window.location.replace("homepage.html");
    } catch (error) {
      console.error("Erro ao verificar sessão atual:", error);
    }
  }

  async function processarLogin(email, senha) {
    try {
      definirEstadoCarregando(true);

      const resposta = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          senha,
        }),
      });

      const dados = await lerJsonSeguro(resposta);

      if (!resposta.ok) {
        exibirMensagemLogin(
          dados.erro || "Não foi possível fazer login.",
          "danger"
        );
        return;
      }

      exibirMensagemLogin("Login realizado com sucesso. Redirecionando...", "success");
      window.location.replace("homepage.html");
    } catch (error) {
      console.error("Erro ao processar login:", error);
      exibirMensagemLogin("Erro de conexão com o servidor.", "danger");
    } finally {
      definirEstadoCarregando(false);
    }
  }

  async function lerJsonSeguro(resposta) {
    try {
      return await resposta.json();
    } catch {
      return {};
    }
  }

  function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function exibirMensagemLogin(mensagem, tipo = "danger") {
    loginMessage.textContent = mensagem;
    loginMessage.className = `mb-3 small text-${tipo}`;
    loginMessage.setAttribute("role", tipo === "danger" ? "alert" : "status");
  }

  function limparMensagemLogin() {
    loginMessage.textContent = "";
    loginMessage.className = "mb-3 small";
    loginMessage.setAttribute("role", "status");
  }

  function definirEstadoCarregando(carregando) {
    btnEntrar.disabled = carregando;
    emailInput.disabled = carregando;
    senhaInput.disabled = carregando;
    btnEntrar.textContent = carregando ? "Entrando..." : "Entrar";
  }
});