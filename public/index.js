document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("login-form");
  const emailInput = document.getElementById("email");
  const senhaInput = document.getElementById("senha");
  const loginMessage = document.getElementById("login-message");
  const btnEntrar = document.getElementById("btn-entrar");

  const cadastroForm = document.getElementById("cadastro-form");
  const cadastroNomeInput = document.getElementById("cadastro-nome");
  const cadastroSobrenomeInput = document.getElementById("cadastro-sobrenome");
  const cadastroEmailInput = document.getElementById("cadastro-email");
  const cadastroSenhaInput = document.getElementById("cadastro-senha");
  const cadastroMessage = document.getElementById("cadastro-message");
  const btnCadastrar = document.getElementById("btn-cadastrar");
  const cadastroModalElement = document.getElementById("cadastroModal");

  const cadastroModal =
    cadastroModalElement && window.bootstrap && window.bootstrap.Modal
      ? window.bootstrap.Modal.getOrCreateInstance(cadastroModalElement)
      : null;

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

  if (cadastroForm) {
    cadastroForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      limparMensagemCadastro();

      const nome = cadastroNomeInput.value.trim();
      const sobrenome = cadastroSobrenomeInput.value.trim();
      const email = cadastroEmailInput.value.trim();
      const senha = cadastroSenhaInput.value;

      if (!nome) {
        exibirMensagemCadastro("Preencha o nome.", "danger");
        cadastroNomeInput.focus();
        return;
      }

      if (!sobrenome) {
        exibirMensagemCadastro("Preencha o sobrenome.", "danger");
        cadastroSobrenomeInput.focus();
        return;
      }

      if (!email) {
        exibirMensagemCadastro("Preencha o e-mail.", "danger");
        cadastroEmailInput.focus();
        return;
      }

      if (!validarEmail(email)) {
        exibirMensagemCadastro("Digite um e-mail válido.", "danger");
        cadastroEmailInput.focus();
        return;
      }

      if (!senha) {
        exibirMensagemCadastro("Preencha a senha.", "danger");
        cadastroSenhaInput.focus();
        return;
      }

      if (senha.length < 6) {
        exibirMensagemCadastro("A senha deve ter pelo menos 6 caracteres.", "danger");
        cadastroSenhaInput.focus();
        return;
      }

      await processarCadastro({
        nome,
        sobrenome,
        email,
        senha
      });
    });
  }

  if (cadastroModalElement) {
    cadastroModalElement.addEventListener("hidden.bs.modal", function () {
      cadastroForm.reset();
      limparMensagemCadastro();
      definirEstadoCadastro(false);
    });
  }

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

  async function processarCadastro(payload) {
    try {
      definirEstadoCadastro(true);

      const resposta = await fetch("/cadastro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const dados = await lerJsonSeguro(resposta);

      if (!resposta.ok) {
        exibirMensagemCadastro(
          dados.erro || "Não foi possível realizar o cadastro.",
          "danger"
        );
        return;
      }

      exibirMensagemCadastro("Cadastro realizado com sucesso. Redirecionando...", "success");

      setTimeout(function () {
        if (cadastroModal) {
          cadastroModal.hide();
        }
        window.location.replace("homepage.html");
      }, 500);
    } catch (error) {
      console.error("Erro ao processar cadastro:", error);
      exibirMensagemCadastro("Erro de conexão com o servidor.", "danger");
    } finally {
      definirEstadoCadastro(false);
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

  function exibirMensagemCadastro(mensagem, tipo = "danger") {
    if (!cadastroMessage) {
      return;
    }

    cadastroMessage.textContent = mensagem;
    cadastroMessage.className = `small text-${tipo}`;
    cadastroMessage.setAttribute("role", tipo === "danger" ? "alert" : "status");
  }

  function limparMensagemCadastro() {
    if (!cadastroMessage) {
      return;
    }

    cadastroMessage.textContent = "";
    cadastroMessage.className = "small";
    cadastroMessage.setAttribute("role", "status");
  }

  function definirEstadoCarregando(carregando) {
    btnEntrar.disabled = carregando;
    emailInput.disabled = carregando;
    senhaInput.disabled = carregando;
    btnEntrar.textContent = carregando ? "Entrando..." : "Entrar";
  }

  function definirEstadoCadastro(carregando) {
    if (!cadastroForm || !btnCadastrar) {
      return;
    }

    cadastroNomeInput.disabled = carregando;
    cadastroSobrenomeInput.disabled = carregando;
    cadastroEmailInput.disabled = carregando;
    cadastroSenhaInput.disabled = carregando;
    btnCadastrar.disabled = carregando;
    btnCadastrar.textContent = carregando ? "Cadastrando..." : "Cadastrar";
  }
});
