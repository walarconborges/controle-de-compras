// Camada compartilhada de comunicação HTTP: padroniza headers, credenciais e leitura segura de JSON.
import { JSON_ACCEPT_HEADERS } from "./constants.js";

function mesclarHeaders(headers = {}) {
  return {
    ...JSON_ACCEPT_HEADERS,
    ...headers
  };
}

export async function readJsonSafe(response) {
  const texto = await response.text();
  if (!texto) {
    return {};
  }

  try {
    return JSON.parse(texto);
  } catch {
    return {};
  }
}

export async function apiRequest(url, options = {}) {
  const headers = mesclarHeaders(options.headers || {});
  const configuracao = {
    credentials: "include",
    ...options,
    headers
  };

  const body = configuracao.body;
  if (
    body &&
    typeof body === "object" &&
    !(body instanceof FormData) &&
    !(body instanceof URLSearchParams) &&
    !headers["Content-Type"]
  ) {
    configuracao.body = JSON.stringify(body);
    configuracao.headers = {
      ...headers,
      "Content-Type": "application/json"
    };
  }

  const response = await fetch(url, configuracao);
  const data = await readJsonSafe(response);
  return { response, data };
}

export function apiGet(url, options = {}) {
  return apiRequest(url, {
    method: "GET",
    ...options
  });
}

export function apiPost(url, body, options = {}) {
  return apiRequest(url, {
    method: "POST",
    body,
    ...options
  });
}

export function apiPatch(url, body, options = {}) {
  return apiRequest(url, {
    method: "PATCH",
    body,
    ...options
  });
}

export function apiDelete(url, options = {}) {
  return apiRequest(url, {
    method: "DELETE",
    ...options
  });
}
