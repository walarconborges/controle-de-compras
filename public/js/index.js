import { apiGet, apiPost } from "./api.js";
import { redirectIfSessionExists } from "./auth.js";
import { clearElement } from "./dom.js";
import { setFeedbackMessage, clearFeedbackMessage } from "./messages.js";
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

  if (cadastroGrupoInput) {
    cadastroGrupoInput.addEventListener("input", function () {
      const termo = normalizeSingleWord(cadastroGrupoInput.value);
      cadastroGrupoInput.value = termo;
      buscarSugestoesGrupo(termo);
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

  if (cadastroForm) {
    cadastroForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      limparMensagemCadastro();

      const nome = cadastroNomeInput.value.trim();
      const sobrenome = cadastroSobrenomeInput.value.trim();
      const email = cadastroEmailInput.value.trim();
      const senha = cadastroSenhaInput.value;
      const grupoNome = normalizeSingleWord(cadastroGrupoInput.value);
      cadastroGrupoInput.value = grupoNome;

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

      if (!grupoNome) {
        exibirMensagemCadastro("Informe o grupo.", "danger");
        cadastroGrupoInput.focus();
        return;
      }

      if (/\s/.test(grupoNome)) {
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
      definirEstadoCadastro(false);
      esconderSugestoesGrupo();
    });
  }

  async function processarLogin(email, senha) {
    try {
      definirEstadoLogin(true);

      const { response: resposta, data: dados } = await apiPost("/login", { email, senha });

      if (!resposta.ok) {
        exibirMensagemLogin(dados.erro || "Não foi possível entrar.", "danger");
        return;
      }

      exibirMensagemLogin("Login realizado com sucesso. Redirecionando...", "success");

      const destino = dados.usuario && dados.usuario.statusGrupo === "aceito"
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
        exibirMensagemCadastro(dados.erro || "Não foi possível criar a conta.", "danger");
        return;
      }

      const statusGrupo = dados.usuario && dados.usuario.statusGrupo ? dados.usuario.statusGrupo : "pendente";
      const mensagem = statusGrupo === "aceito"
        ? "Conta criada com sucesso. Redirecionando..."
        : "Conta criada. Agora aguarde a aprovação do administrador do grupo.";

      exibirMensagemCadastro(mensagem, "success");

      setTimeout(function () {
        if (cadastroModal) {
          cadastroModal.hide();
        }
        window.location.replace(statusGrupo === "aceito" ? "homepage.html" : "aguardando.html");
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

    try {
      const { response: resposta, data: dados } = await apiGet(`/grupos/sugestoes?termo=${encodeURIComponent(termoLimpo)}`, { signal: controladorSugestoes.signal });

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
      }
    }
  }

  function renderizarSugestoesGrupo(lista) {
    if (!cadastroSugestoesGrupo) {
      return;
    }

    clearElement(cadastroSugestoesGrupo);

    if (!Array.isArray(lista) || lista.length === 0) {
      esconderSugestoesGrupo();
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
        cadastroGrupoInput.focus();
      });
      cadastroSugestoesGrupo.appendChild(botao);
    });

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
    btnEntrar.textContent = ativo ? "Entrando..." : "Entrar";
  }

  function definirEstadoCadastro(ativo) {
    if (btnCadastrar) {
      btnCadastrar.disabled = Boolean(ativo);
      btnCadastrar.textContent = ativo ? "Cadastrando..." : "Cadastrar";
    }
  }

  function exibirMensagemLogin(texto, variante) {
    setFeedbackMessage(loginMessage, texto, variante, { classeBase: "mb-3 small" });
  }

  function limparMensagemLogin() {
    clearFeedbackMessage(loginMessage, { classeBase: "mb-3 small" });
  }

  function exibirMensagemCadastro(texto, variante) {
    setFeedbackMessage(cadastroMessage, texto, variante);
  }

  function limparMensagemCadastro() {
    clearFeedbackMessage(cadastroMessage);
  }

});
