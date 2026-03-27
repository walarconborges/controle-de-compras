/**
 * Monta e atualiza a sessão autenticada a partir do schema real.
 * A sessão reflete papel global, vínculos por grupo e grupo ativo persistido.
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

/**
 * Regra única do sistema:
 * - se o grupo ativo salvo ainda for válido, mantém
 * - se houver apenas 1 vínculo aceito válido, usa esse
 * - se houver mais de 1 vínculo aceito válido e o salvo estiver inválido, zera
 * - se não houver vínculo aceito válido, zera
 */
async function sincronizarGrupoAtivoPersistido(prisma, usuarioId, grupoAtivoPersistido, grupoAtivoCorrigido) {
  if ((grupoAtivoPersistido || null) === (grupoAtivoCorrigido || null)) {
    return;
  }

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { grupoAtivoId: grupoAtivoCorrigido },
  });
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
                desativadoEm: null,
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

    if (!usuario || usuario.excluidoEm || !usuario.ativo || usuario.desativadoEm) {
      return null;
    }

    const vinculosRelevantes = (usuario.usuariosGrupos || []).filter((vinculo) =>
      STATUS_VINCULO_RELEVANTES.has(vinculo.status)
    );

    const vinculosAceitos = vinculosRelevantes.filter((vinculo) => vinculo.status === "aceito");

    let vinculoAtivo = null;
    const grupoAtivoPersistido = usuario.grupoAtivoId ? Number(usuario.grupoAtivoId) : null;

    if (grupoAtivoPersistido) {
      vinculoAtivo =
        vinculosAceitos.find((vinculo) => Number(vinculo.grupoId) === grupoAtivoPersistido) || null;
    }

    if (!vinculoAtivo && vinculosAceitos.length === 1) {
      vinculoAtivo = vinculosAceitos[0];
    }

    const grupoAtivoCorrigido = vinculoAtivo?.grupoId || null;

    await sincronizarGrupoAtivoPersistido(prisma, usuario.id, grupoAtivoPersistido, grupoAtivoCorrigido);

    const contextoPrimario = vinculoAtivo || vinculosAceitos[0] || vinculosRelevantes[0] || null;
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
      grupoId: grupoAtivoCorrigido,
      grupoAtivoId: grupoAtivoCorrigido,
      grupoNome: vinculoAtivo?.grupo?.nome || contextoPrimario?.grupo?.nome || null,
      grupoCodigo: vinculoAtivo?.grupo?.codigo || contextoPrimario?.grupo?.codigo || null,
      papel: vinculoAtivo?.papel || null,
      statusGrupo: vinculoAtivo?.status || contextoPrimario?.status || null,
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

    req.session.usuario = sessaoUsuario || null;
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
