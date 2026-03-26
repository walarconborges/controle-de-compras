/**
 * Utilitários de auditoria.
 * Registra operações mutáveis em log global consolidado.
 */
function inferirEntidadePorCaminho(pathname = "") {
  const mapa = [
    ["usuarios-grupos", "usuario_grupo"],
    ["usuarios", "usuario"],
    ["grupos", "grupo"],
    ["itens", "item"],
    ["compras", "compra"],
    ["movimentacoes-estoque", "movimentacao_estoque"],
    ["painel-sistema", "painel_sistema"],
    ["perfil", "perfil"],
    ["meu-grupo", "grupo"],
  ];

  const achado = mapa.find(([trecho]) => pathname.includes(trecho));
  return achado ? achado[1] : "sistema";
}

function inferirAcaoPorMetodo(method = "GET", statusCode = 200) {
  if (statusCode >= 400) {
    return "falha";
  }

  switch (String(method).toUpperCase()) {
    case "POST":
      return "criar";
    case "PUT":
      return "editar";
    case "PATCH":
      return "atualizar";
    case "DELETE":
      return "remover";
    default:
      return "acao";
  }
}

async function criarLogAuditoria(prisma, data) {
  try {
    await prisma.auditoriaLog.create({ data });
  } catch (error) {
    console.error("Falha ao registrar log de auditoria:", error);
  }
}

function criarMiddlewareAuditoria(prisma) {
  return function middlewareAuditoria(req, res, next) {
    const metodo = String(req.method || "GET").toUpperCase();
    const logar = ["POST", "PUT", "PATCH", "DELETE"].includes(metodo);

    if (!logar) {
      return next();
    }

    res.on("finish", () => {
      if (res.statusCode < 200 || res.statusCode >= 500) {
        return;
      }

      const usuario = req.session?.usuario || {};
      const entidade = inferirEntidadePorCaminho(req.path);
      const acao = inferirAcaoPorMetodo(metodo, res.statusCode);

      criarLogAuditoria(prisma, {
        entidade,
        entidadeId: Number(req.params?.id || req.params?.usuarioId || req.params?.grupoId || 0) || null,
        acao,
        descricao: `${metodo} ${req.path}`,
        usuarioAutorId: Number(usuario.id || 0) || null,
        grupoId: Number(usuario.grupoId || req.body?.grupoId || req.query?.grupoId || 0) || null,
        statusHttp: res.statusCode,
        metadados: {
          metodo,
          path: req.path,
          body: req.body || {},
          query: req.query || {},
        },
      });
    });

    next();
  };
}

module.exports = {
  criarLogAuditoria,
  criarMiddlewareAuditoria,
};
