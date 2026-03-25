/**
 * Este arquivo guarda a lógica de montagem e atualização da sessão do usuário.
 * Ele existe para separar a regra de escolha do vínculo ativo da camada de rota.
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
        usuariosGrupos: {
          select: {
            id: true,
            grupoId: true,
            papel: true,
            status: true,
            aprovadoEm: true,
            solicitadoEm: true,
            grupo: {
              select: {
                nome: true,
                codigo: true,
              },
            },
          },
        },
      },
    });

    if (!usuario || !usuario.usuariosGrupos.length) {
      return null;
    }

    const prioridadeStatus = {
      aceito: 0,
      pendente: 1,
      recusado: 2,
    };

    const vinculosOrdenados = [...usuario.usuariosGrupos].sort((a, b) => {
      const prioridadeA = prioridadeStatus[a.status] ?? 99;
      const prioridadeB = prioridadeStatus[b.status] ?? 99;

      if (prioridadeA !== prioridadeB) {
        return prioridadeA - prioridadeB;
      }

      const aprovadoATime = a.aprovadoEm ? new Date(a.aprovadoEm).getTime() : 0;
      const aprovadoBTime = b.aprovadoEm ? new Date(b.aprovadoEm).getTime() : 0;

      if (aprovadoATime !== aprovadoBTime) {
        return aprovadoBTime - aprovadoATime;
      }

      const solicitadoATime = a.solicitadoEm ? new Date(a.solicitadoEm).getTime() : 0;
      const solicitadoBTime = b.solicitadoEm ? new Date(b.solicitadoEm).getTime() : 0;

      if (solicitadoATime !== solicitadoBTime) {
        return solicitadoBTime - solicitadoATime;
      }

      return (b.id ?? 0) - (a.id ?? 0);
    });

    const vinculoAtivo = vinculosOrdenados[0];

    if (!vinculoAtivo) {
      return null;
    }

    return {
      id: usuario.id,
      nome: usuario.nome,
      sobrenome: usuario.sobrenome || "",
      nomeCompleto: montarNomeCompleto(usuario.nome, usuario.sobrenome),
      email: usuario.email,
      grupoId: vinculoAtivo.grupoId,
      grupoNome: vinculoAtivo.grupo?.nome || null,
      grupoCodigo: vinculoAtivo.grupo?.codigo || null,
      papel: vinculoAtivo.papel,
      statusGrupo: vinculoAtivo.status,
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
