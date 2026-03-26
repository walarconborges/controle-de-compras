/**
 * Este arquivo guarda a lógica de montagem e atualização da sessão do usuário.
 * Ele existe para separar conta global, vínculos por grupo e grupo ativo escolhido.
 */
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

function createSessionService(prisma) {
  async function montarSessaoUsuarioPorUsuarioId(usuarioId) {
    const usuarioNumero = Number(usuarioId);

    if (!Number.isInteger(usuarioNumero) || usuarioNumero <= 0) {
      return null;
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioNumero },
      select: {
        id: true,
        nome: true,
        sobrenome: true,
        email: true,
        ativo: true,
        usuariosGrupos: {
          where: {
            excluidoEm: null,
            grupo: {
              excluidoEm: null,
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

    if (!usuario) {
      return null;
    }

    const adminSistema = false;
    const vinculosRelevantes = (usuario.usuariosGrupos || []).filter((vinculo) =>
      ["pendente", "convidado", "aceito", "recusado", "removido", "saiu", "cancelado"].includes(vinculo.status)
    );

    const vinculosAceitos = vinculosRelevantes.filter(
      (vinculo) =>
        vinculo.status === "aceito" &&
        !vinculo.grupo?.excluidoEm &&
        !vinculo.grupo?.desativadoEm
    );

    let vinculoAtivo = null;

    if (vinculosAceitos.length === 1) {
      vinculoAtivo = vinculosAceitos[0];
    }

    const contextoPrimario = vinculoAtivo || vinculosRelevantes[0] || null;

    return {
      id: usuario.id,
      nome: usuario.nome,
      sobrenome: usuario.sobrenome || "",
      nomeCompleto: montarNomeCompleto(usuario.nome, usuario.sobrenome),
      email: usuario.email,
      papelGlobal: "usuario",
      adminSistema,
      ativo: Boolean(usuario.ativo),
      grupoId: vinculoAtivo?.grupoId || null,
      grupoAtivoId: vinculoAtivo?.grupoId || null,
      grupoNome: vinculoAtivo?.grupo?.nome || contextoPrimario?.grupo?.nome || null,
      grupoCodigo: vinculoAtivo?.grupo?.codigo || contextoPrimario?.grupo?.codigo || null,
      papel: vinculoAtivo?.papel || null,
      statusGrupo: contextoPrimario?.status || null,
      temGrupoAceito: vinculosAceitos.length > 0,
      quantidadeGruposAceitos: vinculosAceitos.length,
      quantidadeVinculosRelevantes: vinculosRelevantes.length,
      precisaSelecionarGrupo: !vinculoAtivo && vinculosAceitos.length > 1,
      podeAcessarPainelSistema: adminSistema,
      vinculos: vinculosRelevantes.map((vinculo) => ({
        id: vinculo.id,
        grupoId: vinculo.grupoId,
        grupoNome: vinculo.grupo?.nome || null,
        grupoCodigo: vinculo.grupo?.codigo || null,
        papel: vinculo.papel,
        status: vinculo.status,
        solicitadoEm: vinculo.solicitadoEm,
        aprovadoEm: vinculo.aprovadoEm,
        removidoEm: vinculo.removidoEm,
        canceladoEm: vinculo.canceladoEm,
      })),
    };
  }

  async function atualizarSessaoUsuario(req, usuarioId) {
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
