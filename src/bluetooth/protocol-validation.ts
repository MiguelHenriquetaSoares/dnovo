import {
  NAIPES,
  VALORES_CARTA,
  type Carta,
  type EstadoPublicoPartida,
  type Jogador,
  type ResultadoPartida,
} from '../domain/models';
import { TIPOS_MENSAGEM, type MensagemBluetooth, type TipoMensagem } from './messages';
import { TAMANHO_MAXIMO_MENSAGEM } from './protocol';

export class ErroProtocolo extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErroProtocolo';
  }
}

function objeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function texto(valor: unknown, minimo = 1, maximo = 128): valor is string {
  return typeof valor === 'string' && valor.length >= minimo && valor.length <= maximo;
}

function inteiro(valor: unknown): valor is number {
  return Number.isSafeInteger(valor) && Number(valor) >= 0;
}

function jogador(valor: unknown): valor is Jogador {
  return (
    objeto(valor) &&
    texto(valor.id, 1, 128) &&
    texto(valor.nome, 2, 24) &&
    (valor.papel === 'ANFITRIAO' || valor.papel === 'CONVIDADO') &&
    inteiro(valor.ordem) &&
    typeof valor.letrasPenalidade === 'string' &&
    ['DESCONECTADO', 'CONECTANDO', 'CONECTADO', 'RECONECTANDO'].includes(String(valor.estadoConexao))
  );
}

function jogadores(valor: unknown): valor is Jogador[] {
  return Array.isArray(valor) && valor.length <= 6 && valor.every(jogador);
}

function carta(valor: unknown): valor is Carta {
  return (
    objeto(valor) &&
    texto(valor.id) &&
    NAIPES.includes(valor.naipe as Carta['naipe']) &&
    VALORES_CARTA.includes(valor.valor as Carta['valor'])
  );
}

function partidaPublica(valor: unknown): valor is EstadoPublicoPartida {
  if (!objeto(valor) || !texto(valor.id) || !texto(valor.anfitriaoId)) return false;
  if ('maos' in valor || 'cartasSelecionadas' in valor) return false;
  if (!jogadores(valor.jogadores) || !Array.isArray(valor.ordemJogadores) || !valor.ordemJogadores.every((id) => texto(id))) return false;
  if (!['SALA_DE_ESPERA', 'EM_ANDAMENTO', 'FINALIZADA', 'CANCELADA', 'INTERROMPIDA'].includes(String(valor.status))) return false;
  if (valor.iniciadaEm !== null && (!texto(valor.iniciadaEm) || Number.isNaN(Date.parse(valor.iniciadaEm)))) return false;
  if (valor.encerradaEm !== null && (!texto(valor.encerradaEm) || Number.isNaN(Date.parse(valor.encerradaEm)))) return false;
  if (!inteiro(valor.rodadaAtual) || (valor.jogadorDaVezId !== null && !texto(valor.jogadorDaVezId))) return false;
  if (!Array.isArray(valor.jogadoresQueConfirmaram) || !valor.jogadoresQueConfirmaram.every((id) => texto(id))) return false;
  return valor.resultado === null || resultado(valor.resultado);
}

function resultado(valor: unknown): valor is ResultadoPartida {
  return (
    objeto(valor) &&
    (valor.vencedorId === null || texto(valor.vencedorId)) &&
    (valor.jogadorPenalizadoId === null || texto(valor.jogadorPenalizadoId)) &&
    ['VENCEDOR', 'PENALIZADO', 'PARTICIPANTE', 'NAO_CONCLUIDO'].includes(String(valor.resultadoJogadorLocal)) &&
    ['VITORIA', 'PALAVRA_BURRO', 'ABANDONO', 'DESCONEXAO', 'CANCELAMENTO'].includes(String(valor.motivo))
  );
}

const validadoresDados: Record<TipoMensagem, (dados: unknown) => boolean> = {
  SOLICITACAO_ENTRADA: (dados) =>
    objeto(dados) && objeto(dados.jogador) && texto(dados.jogador.id) && texto(dados.jogador.nome, 2, 24),
  RESPOSTA_ENTRADA: (dados) =>
    objeto(dados) &&
    typeof dados.aceita === 'boolean' &&
    (dados.motivo === undefined || texto(dados.motivo, 1, 160)) &&
    (dados.anfitriao === undefined || jogador(dados.anfitriao)) &&
    (dados.jogadores === undefined || jogadores(dados.jogadores)),
  JOGADOR_ENTROU: (dados) => objeto(dados) && jogador(dados.jogador) && jogadores(dados.jogadores),
  JOGADOR_SAIU: (dados) => objeto(dados) && texto(dados.jogadorId),
  SALA_ATUALIZADA: (dados) => objeto(dados) && jogadores(dados.jogadores),
  SALA_ENCERRADA: (dados) => objeto(dados) && texto(dados.motivo, 1, 160),
  PARTIDA_INICIADA: (dados) =>
    objeto(dados) && partidaPublica(dados.estado) && Array.isArray(dados.maoLocal) && dados.maoLocal.length === 4 && dados.maoLocal.every(carta),
  JOGADA: (dados) => objeto(dados) && texto(dados.cartaId) && inteiro(dados.rodada),
  TROCA_REALIZADA: (dados) =>
    objeto(dados) &&
    partidaPublica(dados.estado) &&
    Array.isArray(dados.maoLocal) && dados.maoLocal.length === 4 && dados.maoLocal.every(carta) &&
    inteiro(dados.rodada),
  JOGADOR_COMPLETOU: (dados) => objeto(dados) && texto(dados.jogadorId) && inteiro(dados.rodada),
  ACAO_RECUSADA: (dados) => objeto(dados) && texto(dados.mensagem, 1, 160),
  PARTIDA_FINALIZADA: (dados) => objeto(dados) && partidaPublica(dados.estado) && resultado(dados.resultado),
  JOGADOR_DESCONECTADO: (dados) =>
    objeto(dados) && texto(dados.jogadorId) && typeof dados.podeReconectar === 'boolean',
  RECONEXAO: (dados) => objeto(dados) && texto(dados.jogadorId) && inteiro(dados.ultimaSequenciaRecebida),
  ESTADO_SINCRONIZADO: (dados) =>
    objeto(dados) && partidaPublica(dados.estado) && Array.isArray(dados.maoLocal) && dados.maoLocal.length === 4 && dados.maoLocal.every(carta),
};

export function validarMensagem(valor: unknown): valor is MensagemBluetooth {
  if (!objeto(valor) || valor.versao !== 1) return false;
  if (!texto(valor.id) || !texto(valor.partidaId) || !texto(valor.remetenteId)) return false;
  if (!inteiro(valor.sequencia) || !texto(valor.enviadaEm, 20, 40) || Number.isNaN(Date.parse(valor.enviadaEm))) return false;
  if (!TIPOS_MENSAGEM.includes(valor.tipo as TipoMensagem)) return false;
  return validadoresDados[valor.tipo as TipoMensagem](valor.dados);
}

export function serializarMensagem(mensagem: MensagemBluetooth): string {
  if (!validarMensagem(mensagem)) throw new ErroProtocolo('Mensagem de saída inválida.');
  const textoMensagem = JSON.stringify(mensagem);
  if (new TextEncoder().encode(textoMensagem).byteLength > TAMANHO_MAXIMO_MENSAGEM) {
    throw new ErroProtocolo('Mensagem excede o limite de 8 KiB.');
  }
  return textoMensagem;
}

export function desserializarMensagem(textoMensagem: string): MensagemBluetooth {
  if (new TextEncoder().encode(textoMensagem).byteLength > TAMANHO_MAXIMO_MENSAGEM) {
    throw new ErroProtocolo('Mensagem recebida excede o limite permitido.');
  }
  let valor: unknown;
  try {
    valor = JSON.parse(textoMensagem);
  } catch {
    throw new ErroProtocolo('Mensagem recebida não contém JSON válido.');
  }
  if (!validarMensagem(valor)) throw new ErroProtocolo('Formato da mensagem recebida é inválido.');
  return valor;
}

export class RegistroMensagens {
  private readonly ids = new Set<string>();
  private readonly sequencias = new Map<string, number>();

  aceitar(
    mensagem: MensagemBluetooth,
    contexto: { partidaId: string; remetenteEsperado?: string },
  ): void {
    if (mensagem.partidaId !== contexto.partidaId) throw new ErroProtocolo('Mensagem pertence a outra partida.');
    if (contexto.remetenteEsperado && mensagem.remetenteId !== contexto.remetenteEsperado) {
      throw new ErroProtocolo('Remetente não corresponde ao dispositivo conectado.');
    }
    if (this.ids.has(mensagem.id)) throw new ErroProtocolo('Mensagem duplicada.');

    const ultima = this.sequencias.get(mensagem.remetenteId) ?? -1;
    if (mensagem.sequencia <= ultima) throw new ErroProtocolo('Sequência repetida ou fora de ordem.');

    this.ids.add(mensagem.id);
    this.sequencias.set(mensagem.remetenteId, mensagem.sequencia);
    if (this.ids.size > 1_000) this.ids.delete(this.ids.values().next().value as string);
  }

  ultimaSequencia(remetenteId: string): number {
    return this.sequencias.get(remetenteId) ?? -1;
  }

  esquecerRemetente(remetenteId: string): void {
    this.sequencias.delete(remetenteId);
  }

  limpar(): void {
    this.ids.clear();
    this.sequencias.clear();
  }
}
