import { apiGet, apiPost } from "./api.js";
import { redirectIfSessionExists } from "./auth.js";
import { clearElement } from "./dom.js";
import {
  setFeedbackMessage,
  clearFeedbackMessage,
  setFieldError,
  clearFieldErrors
} from "./messages.js";
import { isValidEmail, normalizeSingleWord } from "./validators.js";

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
  const cadastroGrupoInput = document.getElementById("cadastro-grupo");
  const cadastroSugestoesGrupo = document.getElementById("cadastro-sugestoes-grupo");
  const cadastroMessage = document.getElementById("cadastro-message");
  const btnCadastrar = document.getElementById("btn-cadastrar");
  const cadastroModalElement = document.getElementById("cadastroModal");

  let ultimoTermoBuscado = "";
  let controladorSugestoes = null;

  const camposLogin = [emailInput, senhaInput].filter(Boolean);
  const camposCadastro = [
    cadastroNomeInput,
    cadastroSobrenomeInput,
    cadastroEmailInput,
    cadastroSenhaInput,
    cadastroGrupoInput
  ].filter(Boolean);

  const cadastroModal =
    cadastroModalElement && window.bootstrap && window.bootstrap.Modal
      ? window.bootstrap.Modal.getOrCreateInstance(cadastroModalElement)
      : null;

  if (!loginForm || !emailInput || !senhaInput || !loginMessage || !btnEntrar) {
    return;
  }

  redirectIfSessionExists();

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    limparMensagemLogin();
    clearFieldErrors(camposLogin);

    const email = emailInput.value.trim();
    const senha = senhaInput.value;

    if (!email) {
      setFieldError(emailInput, "Preencha o e-mail.");
      exibirMensagemLogin("Preencha o e-mail.", "danger");
      emailInput.focus();
      return;
    }

    if (!isValidEmail(email)) {
      setFieldError(emailInput, "Digite um e-mail válido.");
      exibirMensagemLogin("Digite um e-mail válido.", "danger");
      emailInput.focus();
      return;
    }

    if (!senha) {
      setFieldError(senhaInput, "Preencha a senha.");
      exibirMensagemLogin("Preencha a senha.", "danger");
      senhaInput.focus();
      return;
    }

    await processarLogin(email, senha);
  });

  camposLogin.forEach(function (campo) {
    campo.addEventListener("input", function () {
      clearFieldErrors(camposLogin);
      limparMensagemLogin();
    });
  });

  if (cadastroGrupoInput) {
    cadastroGrupoInput.addEventListener("input", function () {
      const termo = normalizeSingleWord(cadastroGrupoInput.value);
      cadastroGrupoInput.value = termo;
      buscarSugestoesGrupo(termo);
      clearFieldErrors([cadastroGrupoInput]);
    });

    cadastroGrupoInput.addEventListener("blur", function () {
      setTimeout(esconderSugestoesGrupo, 150);
    });

    cadastroGrupoInput.addEventListener("focus", function () {
      const termo = normalizeSingleWord(cadastroGrupoInput.value);
      if (termo.length >= 2) {
        buscarSugestoesGrupo(termo);
      }
    });
  }

  camposCadastro.forEach(function (campo) {
    campo.addEventListener("input", function () {
      clearFieldErrors([campo]);
      limparMensagemCadastro();
    });
  });

  if (cadastroForm) {
    cadastroForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      limparMensagemCadastro();
      clearFieldErrors(camposCadastro);

      const nome = cadastroNomeInput.value.trim();
      const sobrenome = cadastroSobrenomeInput.value.trim();
      const email = cadastroEmailInput.value.trim();
      const senha = cadastroSenhaInput.value;
      const grupoNome = normalizeSingleWord(cadastroGrupoInput.value);
      cadastroGrupoInput.value = grupoNome;

      if (!nome) {
        setFieldError(cadastroNomeInput, "Preencha o nome.");
        exibirMensagemCadastro("Preencha o nome.", "danger");
        cadastroNomeInput.focus();
        return;
      }

      if (!sobrenome) {
        setFieldError(cadastroSobrenomeInput, "Preencha o sobrenome.");
        exibirMensagemCadastro("Preencha o sobrenome.", "danger");
        cadastroSobrenomeInput.focus();
        return;
      }

      if (!email) {
        setFieldError(cadastroEmailInput, "Preencha o e-mail.");
        exibirMensagemCadastro("Preencha o e-mail.", "danger");
        cadastroEmailInput.focus();
        return;
      }

      if (!isValidEmail(email)) {
        setFieldError(cadastroEmailInput, "Digite um e-mail válido.");
        exibirMensagemCadastro("Digite um e-mail válido.", "danger");
        cadastroEmailInput.focus();
        return;
      }

      if (!senha) {
        setFieldError(cadastroSenhaInput, "Preencha a senha.");
        exibirMensagemCadastro("Preencha a senha.", "danger");
        cadastroSenhaInput.focus();
        return;
      }

      if (senha.length < 6) {
        setFieldError(cadastroSenhaInput, "A senha deve ter pelo menos 6 caracteres.");
        exibirMensagemCadastro("A senha deve ter pelo menos 6 caracteres.", "danger");
        cadastroSenhaInput.focus();
        return;
      }

      if (!grupoNome) {
        setFieldError(cadastroGrupoInput, "Informe o grupo.");
        exibirMensagemCadastro("Informe o grupo.", "danger");
        cadastroGrupoInput.focus();
        return;
      }

      if (/\s/.test(grupoNome)) {
        setFieldError(cadastroGrupoInput, "O nome do grupo deve conter apenas 1 palavra.");
        exibirMensagemCadastro("O nome do grupo deve conter apenas 1 palavra.", "danger");
        cadastroGrupoInput.focus();
        return;
      }

      await processarCadastro({ nome, sobrenome, email, senha, grupoNome });
    });
  }

  if (cadastroModalElement) {
    cadastroModalElement.addEventListener("hidden.bs.modal", function () {
      cadastroForm.reset();
      limparMensagemCadastro();
      clearFieldErrors(camposCadastro);
      definirEstadoCadastro(false);
      esconderSugestoesGrupo();
    });
  }

  async function processarLogin(email, senha) {
    try {
      definirEstadoLogin(true);

      const { response: resposta, data: dados } = await apiPost("/login", { email, senha });

      if (!resposta.ok) {
        const mensagem = dados?.erro || "Não foi possível entrar.";
        exibirMensagemLogin(mensagem, "danger");

        if (/email/i.test(mensagem)) {
          setFieldError(emailInput, mensagem);
          emailInput.focus();
        } else if (/senha/i.test(mensagem)) {
          setFieldError(senhaInput, mensagem);
          senhaInput.focus();
        }

        return;
      }

      exibirMensagemLogin("Login realizado com sucesso. Redirecionando...", "success");

      const usuario = dados.usuario || null;
      const destino = usuario?.precisaSelecionarGrupo
        ? "perfil.html"
        : usuario?.temGrupoAceito && usuario?.grupoId
          ? "homepage.html"
          : "aguardando.html";

      setTimeout(function () {
        window.location.replace(destino);
      }, 300);
    } catch (error) {
      console.error("Erro ao processar login:", error);
      exibirMensagemLogin("Erro de conexão ao entrar.", "danger");
    } finally {
      definirEstadoLogin(false);
    }
  }

  async function processarCadastro(payload) {
    try {
      definirEstadoCadastro(true);

      const { response: resposta, data: dados } = await apiPost("/cadastro", payload);

      if (!resposta.ok) {
        const mensagem = dados?.erro || "Não foi possível criar a conta.";
        exibirMensagemCadastro(mensagem, "danger");

        if (/email/i.test(mensagem)) {
          setFieldError(cadastroEmailInput, mensagem);
          cadastroEmailInput.focus();
        } else if (/senha/i.test(mensagem)) {
          setFieldError(cadastroSenhaInput, mensagem);
          cadastroSenhaInput.focus();
        } else if (/grupo/i.test(mensagem)) {
          setFieldError(cadastroGrupoInput, mensagem);
          cadastroGrupoInput.focus();
        }

        return;
      }

      const usuario = dados.usuario || null;
      const mensagem = usuario?.temGrupoAceito
        ? "Conta criada com sucesso. Redirecionando..."
        : "Conta criada. Agora aguarde aprovação ou aceite um convite.";

      exibirMensagemCadastro(mensagem, "success");

      setTimeout(function () {
        if (cadastroModal) {
          cadastroModal.hide();
        }
        if (usuario?.precisaSelecionarGrupo) {
          window.location.replace("perfil.html");
        } else {
          window.location.replace(usuario?.temGrupoAceito && usuario?.grupoId ? "homepage.html" : "aguardando.html");
        }
      }, 500);
    } catch (error) {
      console.error("Erro ao processar cadastro:", error);
      exibirMensagemCadastro("Erro de conexão ao criar a conta.", "danger");
    } finally {
      definirEstadoCadastro(false);
    }
  }

  async function buscarSugestoesGrupo(termo) {
    const termoLimpo = String(termo || "").trim();

    if (termoLimpo.length < 2) {
      esconderSugestoesGrupo();
      return;
    }

    ultimoTermoBuscado = termoLimpo;

    if (controladorSugestoes) {
      controladorSugestoes.abort();
    }

    controladorSugestoes = new AbortController();

    renderizarEstadoSugestoes("Buscando grupos...");

    try {
      const { response: resposta, data: dados } = await apiGet(
        `/grupos/sugestoes?termo=${encodeURIComponent(termoLimpo)}`,
        { signal: controladorSugestoes.signal }
      );

      if (!resposta.ok) {
        esconderSugestoesGrupo();
        return;
      }

      if (termoLimpo !== ultimoTermoBuscado) {
        return;
      }

      renderizarSugestoesGrupo(Array.isArray(dados) ? dados : []);
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Erro ao buscar sugestões de grupo:", error);
        renderizarEstadoSugestoes("Não foi possível buscar grupos.");
      }
    }
  }

  function renderizarSugestoesGrupo(lista) {
    if (!cadastroSugestoesGrupo) {
      return;
    }

    clearElement(cadastroSugestoesGrupo);

    if (!Array.isArray(lista) || lista.length === 0) {
      renderizarEstadoSugestoes("Nenhum grupo encontrado.");
      return;
    }

    lista.forEach(function (grupo) {
      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = "list-group-item list-group-item-action";
      botao.textContent = grupo.nome + (grupo.codigo ? ` (${grupo.codigo})` : "");
      botao.addEventListener("click", function () {
        cadastroGrupoInput.value = String(grupo.nome || "").trim();
        esconderSugestoesGrupo();
        clearFieldErrors([cadastroGrupoInput]);
        cadastroGrupoInput.focus();
      });
      cadastroSugestoesGrupo.appendChild(botao);
    });

    cadastroSugestoesGrupo.hidden = false;
  }

  function renderizarEstadoSugestoes(texto) {
    if (!cadastroSugestoesGrupo) {
      return;
    }

    clearElement(cadastroSugestoesGrupo);
    const item = document.createElement("div");
    item.className = "list-group-item small text-secondary";
    item.textContent = texto;
    cadastroSugestoesGrupo.appendChild(item);
    cadastroSugestoesGrupo.hidden = false;
  }

  function esconderSugestoesGrupo() {
    if (!cadastroSugestoesGrupo) {
      return;
    }
    cadastroSugestoesGrupo.hidden = true;
    clearElement(cadastroSugestoesGrupo);
  }

  function definirEstadoLogin(ativo) {
    btnEntrar.disabled = Boolean(ativo);
    emailInput.disabled = Boolean(ativo);
    senhaInput.disabled = Boolean(ativo);
    btnEntrar.textContent = ativo ? "Entrando..." : "Entrar";
  }

  function definirEstadoCadastro(ativo) {
    [
      cadastroNomeInput,
      cadastroSobrenomeInput,
      cadastroEmailInput,
      cadastroSenhaInput,
      cadastroGrupoInput,
      btnCadastrar
    ].filter(Boolean).forEach(function (elemento) {
      elemento.disabled = Boolean(ativo);
    });

    if (btnCadastrar) {
      btnCadastrar.textContent = ativo ? "Cadastrando..." : "Cadastrar";
    }
  }

  function exibirMensagemLogin(texto, variante) {
    setFeedbackMessage(loginMessage, texto, variante, {
      classeBase: "mb-3 small",
      hideWhenEmpty: false
    });
  }

  function limparMensagemLogin() {
    clearFeedbackMessage(loginMessage, {
      classeBase: "mb-3 small"
    });
  }

  function exibirMensagemCadastro(texto, variante) {
    setFeedbackMessage(cadastroMessage, texto, variante, {
      classeBase: "small"
    });
  }

  function limparMensagemCadastro() {
    clearFeedbackMessage(cadastroMessage, {
      classeBase: "small"
    });
  }
});
