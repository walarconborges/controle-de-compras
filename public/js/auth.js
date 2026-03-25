// Utilitários de autenticação e sessão: validam acesso, redirecionam conforme status do grupo e executam logout.
import { apiGet, apiPost } from "./api.js";
import { PAGE_URLS } from "./constants.js";

function redirecionar(destino) {
  window.location.replace(destino);
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
    if (!response.ok || !usuario) {
      return null;
    }

    redirecionar(String(usuario.statusGrupo || "").toLowerCase() === "aceito" ? PAGE_URLS.home : PAGE_URLS.pending);
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

  const statusGrupo = String(usuario.statusGrupo || "").toLowerCase();
  if (statusGrupo && statusGrupo !== "aceito") {
    redirecionar(PAGE_URLS.pending);
    throw new Error("Usuário ainda não foi aceito no grupo");
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

export async function logoutAndRedirect(destino = PAGE_URLS.login) {
  try {
    await apiPost("/logout", {});
  } finally {
    redirecionar(destino);
  }
}
