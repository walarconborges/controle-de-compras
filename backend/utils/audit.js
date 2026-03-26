const { Prisma } = require("@prisma/client");

function obterAutor(req) {
  return {
    usuarioAutorId: req.session?.usuario?.id ?? null,
    autorEmail: req.session?.usuario?.email ?? null,
    grupoId: req.session?.usuario?.grupoId ?? null,
  };
}

async function registrarAuditoria(prisma, req, dados = {}) {
  if (!prisma?.auditoriaLog) {
    return null;
  }

  const autor = obterAutor(req);

  return prisma.auditoriaLog.create({
    data: {
      entidade: dados.entidade,
      entidadeId: dados.entidadeId ?? null,
      acao: dados.acao,
      descricao: dados.descricao ?? null,
      usuarioAutorId: dados.usuarioAutorId ?? autor.usuarioAutorId,
      autorEmail: dados.autorEmail ?? autor.autorEmail,
      grupoId: dados.grupoId ?? autor.grupoId,
      itemId: dados.itemId ?? null,
      metadados: dados.metadados ?? Prisma.JsonNull,
    },
  });
}

module.exports = { registrarAuditoria, obterAutor };
