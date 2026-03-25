/**
 * Este arquivo guarda middlewares de autenticação e autorização.
 * Ele existe para centralizar as barreiras de acesso reutilizadas pelas rotas.
 */
function exigirAutenticacao(req, res, next) {
  if (!req.session.usuario) {
    return res.status(401).json({ erro: "Usuário não autenticado" });
  }

  next();
}

function exigirPapel(...papeisPermitidos) {
  return (req, res, next) => {
    if (!req.session.usuario) {
      return res.status(401).json({ erro: "Usuário não autenticado" });
    }

    if (!papeisPermitidos.includes(req.session.usuario.papel)) {
      return res.status(403).json({ erro: "Acesso negado" });
    }

    next();
  };
}

function obterGrupoIdSessao(req) {
  return req.session.usuario?.grupoId;
}

function idsSaoIguais(a, b) {
  return Number(a) === Number(b);
}

module.exports = {
  exigirAutenticacao,
  exigirPapel,
  obterGrupoIdSessao,
  idsSaoIguais,
};
