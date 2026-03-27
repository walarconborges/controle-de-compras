/**
 * Monta e atualiza a sessão autenticada a partir do schema real.
 * A sessão precisa refletir papel global, vínculo por grupo e grupo ativo persistido.
 */

const STATUS_VINCULO_RELEVANTES = new Set([
  "pendente",
  "convidado",
  "aceito",
  "recusado",
  "removido",
  "saiu",
  "cancelado",
]);

function montarNomeCompleto(nome, sobrenome) {
  return [String(nome || "").trim(), String(sobrenome || "").trim()]
    .filter(Boolean)
    .join(" ");
}

function normalizarUsuarioResposta(usuario) {
  if (!usuario) return usuario;

  return {
    ...usuario,
    sobrenome: usuario.sobrenome || "",
    nomeCompleto: montarNomeCompleto(usuario.nome, usuario.sobrenome),
  };
}

function mapearVinculo(vinculo) {
  return {
    id: vinculo.id,
    grupoId: vinculo.grupoId,
    grupoNome: vinculo.grupo?.nome || null,
    grupoCodigo: vinculo.grupo?.codigo || null,
    papel: vinculo.papel || null,
    status: vinculo.status || null,
    solicitadoEm: vinculo.solicitadoEm || null,
    aprovadoEm: vinculo.aprovadoEm || null,
    aprovadoPorEmail: vinculo.aprovadoPorEmail || null,
    removidoEm: vinculo.removidoEm || null,
    canceladoEm: vinculo.canceladoEm || null,
  };
}

function createSessionService(prisma) {
  if (!prisma?.usuario) {
    throw new Error("Prisma inválido ao criar sessionService.");
  }

  async function montarSessaoUsuarioPorUsuarioId(usuarioId) {
    const id = Number(usuarioId);

    if (!Number.isInteger(id) || id <= 0) {
      return null;
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        sobrenome: true,
        email: true,
        papelGlobal: true,
        grupoAtivoId: true,
        ativo: true,
        desativadoEm: true,
        excluidoEm: true,
        usuariosGrupos: {
          where: {
            excluidoEm: null,
            grupo: {
              is: {
                excluidoEm: null,
              },
            },
          },
          orderBy: [{ criadoEm: "desc" }, { id: "desc" }],
          select: {
            id: true,
            grupoId: true,
            papel: true,
            status: true,
            solicitadoEm: true,
            aprovadoEm: true,
            aprovadoPorEmail: true,
            removidoEm: true,
            canceladoEm: true,
            criadoEm: true,
            grupo: {
              select: {
                id: true,
                nome: true,
                codigo: true,
                desativadoEm: true,
                excluidoEm: true,
              },
            },
          },
        },
      },
    });

    if (!usuario || usuario.excluidoEm || !usuario.ativo) {
      return null;
    }

    const vinculosRelevantes = (usuario.usuariosGrupos || []).filter((vinculo) =>
      STATUS_VINCULO_RELEVANTES.has(vinculo.status)
    );

    const vinculosAceitos = vinculosRelevantes.filter(
      (vinculo) =>
        vinculo.status === "aceito" &&
        vinculo.grupo &&
        !vinculo.grupo.excluidoEm &&
        !vinculo.grupo.desativadoEm
    );

    let vinculoAtivo = null;

    if (usuario.grupoAtivoId) {
      vinculoAtivo =
        vinculosAceitos.find((vinculo) => Number(vinculo.grupoId) === Number(usuario.grupoAtivoId)) || null;
    }

    if (!vinculoAtivo && vinculosAceitos.length === 1) {
      vinculoAtivo = vinculosAceitos[0];
    }

    const contextoPrimario = vinculoAtivo || vinculosRelevantes[0] || null;
    const papelGlobal = usuario.papelGlobal || "usuario";
    const adminSistema = papelGlobal === "adminSistema";

    return {
      id: usuario.id,
      nome: usuario.nome || "",
      sobrenome: usuario.sobrenome || "",
      nomeCompleto: montarNomeCompleto(usuario.nome, usuario.sobrenome),
      email: usuario.email || "",
      papelGlobal,
      adminSistema,
      ativo: Boolean(usuario.ativo),
      desativadoEm: usuario.desativadoEm || null,
      excluidoEm: usuario.excluidoEm || null,
      grupoId: vinculoAtivo?.grupoId || null,
      grupoAtivoId: vinculoAtivo?.grupoId || usuario.grupoAtivoId || null,
      grupoNome: vinculoAtivo?.grupo?.nome || contextoPrimario?.grupo?.nome || null,
      grupoCodigo: vinculoAtivo?.grupo?.codigo || contextoPrimario?.grupo?.codigo || null,
      papel: vinculoAtivo?.papel || null,
      statusGrupo: contextoPrimario?.status || null,
      temGrupoAceito: vinculosAceitos.length > 0,
      quantidadeGruposAceitos: vinculosAceitos.length,
      quantidadeVinculosRelevantes: vinculosRelevantes.length,
      precisaSelecionarGrupo: !vinculoAtivo && vinculosAceitos.length > 1,
      podeAcessarPainelSistema: adminSistema,
      vinculos: vinculosRelevantes.map(mapearVinculo),
    };
  }

  async function atualizarSessaoUsuario(req, usuarioId) {
    if (!req?.session) {
      throw new Error("Sessão não disponível para atualização.");
    }

    const sessaoUsuario = await montarSessaoUsuarioPorUsuarioId(usuarioId);

    if (!sessaoUsuario) {
      req.session.usuario = null;
      return null;
    }

    req.session.usuario = sessaoUsuario;
    return sessaoUsuario;
  }

  return {
    montarNomeCompleto,
    normalizarUsuarioResposta,
    montarSessaoUsuarioPorUsuarioId,
    atualizarSessaoUsuario,
  };
}

module.exports = {
  montarNomeCompleto,
  normalizarUsuarioResposta,
  createSessionService,
};
