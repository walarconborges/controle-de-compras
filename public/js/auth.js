import { apiGet, apiPost } from "./api.js";
import { PAGE_URLS } from "./constants.js";

function redirecionar(destino) {
  window.location.replace(destino);
}

function resolverDestinoPorSessao(usuario) {
  if (!usuario) return PAGE_URLS.login;
  if (usuario.adminSistema && !usuario.temGrupoAceito) return PAGE_URLS.profile;
  if (usuario.precisaSelecionarGrupo) return PAGE_URLS.profile;
  if (usuario.temGrupoAceito && usuario.grupoId) return PAGE_URLS.home;
  return PAGE_URLS.pending;
}

export async function getSession() {
  const { response, data } = await apiGet("/sessao");
  return {
    response,
    data,
    usuario: data?.usuario || null
  };
}

export async function redirectIfSessionExists() {
  try {
    const { response, usuario } = await getSession();
    if (!response.ok || !usuario) return null;
    redirecionar(resolverDestinoPorSessao(usuario));
    return usuario;
  } catch {
    return null;
  }
}

export async function ensureAcceptedSession() {
  const { response, usuario } = await getSession();

  if (!response.ok || !usuario) {
    redirecionar(PAGE_URLS.login);
    throw new Error("Sessão não encontrada");
  }

  if (!usuario.temGrupoAceito || !usuario.grupoId) {
    redirecionar(usuario.adminSistema ? PAGE_URLS.profile : PAGE_URLS.pending);
    throw new Error("Usuário sem grupo ativo aceito");
  }

  return usuario;
}

export async function ensureAnySession() {
  const { response, usuario } = await getSession();

  if (!response.ok || !usuario) {
    redirecionar(PAGE_URLS.login);
    throw new Error("Sessão não encontrada");
  }

  return usuario;
}

export async function ensureAdminSistemaSession() {
  const { response, usuario } = await getSession();

  if (!response.ok || !usuario) {
    redirecionar(PAGE_URLS.login);
    throw new Error("Sessão não encontrada");
  }

  if (!usuario.adminSistema) {
    redirecionar(PAGE_URLS.profile);
    throw new Error("Acesso restrito ao administrador do sistema");
  }

  return usuario;
}

export async function logoutAndRedirect(destino = PAGE_URLS.login) {
  try {
    await apiPost("/logout", {});
  } finally {
    redirecionar(destino);
  }
}
