/**
 * Middlewares de autenticação e autorização.
 * O objetivo aqui é usar a mesma leitura de papéis em todo o sistema.
 */
const { AppError } = require("../utils/errorUtils");

function obterUsuarioSessao(req) {
  return req.session?.usuario || null;
}

function exigirAutenticacao(req, res, next) {
  if (!obterUsuarioSessao(req)) {
    return next(new AppError(401, "Usuário não autenticado"));
  }

  next();
}

function expandirPapeis(papeisPermitidos = []) {
  const conjunto = new Set();

  papeisPermitidos.forEach((papel) => {
    const valor = String(papel || "").trim();

    if (!valor) return;

    if (valor === "admin") {
      conjunto.add("adminGrupo");
      conjunto.add("adminSistema");
      return;
    }

    conjunto.add(valor);
  });

  return conjunto;
}

function exigirPapel(...papeisPermitidos) {
  const papeis = expandirPapeis(papeisPermitidos);

  return (req, res, next) => {
    const usuario = obterUsuarioSessao(req);

    if (!usuario) {
      return next(new AppError(401, "Usuário não autenticado"));
    }

    const papelGrupo = String(usuario.papel || "");
    const papelGlobal = String(usuario.papelGlobal || "");
    const adminSistema = Boolean(usuario.adminSistema || papelGlobal === "adminSistema");

    if (
      adminSistema &&
      (papeis.has("adminSistema") || papeis.has("adminGrupo") || papeis.has("admin"))
    ) {
      return next();
    }

    if (papeis.has(papelGrupo) || papeis.has(papelGlobal)) {
      return next();
    }

    return next(new AppError(403, "Acesso negado"));
  };
}

function exigirAdminSistema(req, res, next) {
  const usuario = obterUsuarioSessao(req);

  if (!usuario) {
    return next(new AppError(401, "Usuário não autenticado"));
  }

  if (!usuario.adminSistema && usuario.papelGlobal !== "adminSistema") {
    return next(new AppError(403, "Acesso restrito ao administrador do sistema"));
  }

  next();
}

function exigirGrupoAtivoAceito(req, res, next) {
  const usuario = obterUsuarioSessao(req);

  if (!usuario) {
    return next(new AppError(401, "Usuário não autenticado"));
  }

  if (usuario.adminSistema && !usuario.grupoId) {
    return next();
  }

  if (!usuario.grupoId || usuario.statusGrupo !== "aceito") {
    return next(new AppError(403, "Selecione um grupo ativo aceito no perfil"));
  }

  next();
}

function obterGrupoIdSessao(req) {
  return req.session?.usuario?.grupoId || null;
}

function idsSaoIguais(a, b) {
  return Number(a) === Number(b);
}

function usuarioTemAcessoAoGrupo(req, grupoId) {
  const usuario = obterUsuarioSessao(req);

  if (!usuario) {
    return false;
  }

  return Boolean(usuario.adminSistema) || idsSaoIguais(usuario.grupoId, grupoId);
}

module.exports = {
  obterUsuarioSessao,
  exigirAutenticacao,
  exigirPapel,
  exigirAdminSistema,
  exigirGrupoAtivoAceito,
  obterGrupoIdSessao,
  idsSaoIguais,
  usuarioTemAcessoAoGrupo,
};
