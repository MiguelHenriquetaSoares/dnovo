import type { Carta, EstadoPublicoPartida, Jogador, ResultadoPartida } from '../domain/models';

export const TIPOS_MENSAGEM = [
  'SOLICITACAO_ENTRADA',
  'RESPOSTA_ENTRADA',
  'JOGADOR_ENTROU',
  'JOGADOR_SAIU',
  'SALA_ATUALIZADA',
  'SALA_ENCERRADA',
  'PARTIDA_INICIADA',
  'JOGADA',
  'TROCA_REALIZADA',
  'JOGADOR_COMPLETOU',
  'ACAO_RECUSADA',
  'PARTIDA_FINALIZADA',
  'JOGADOR_DESCONECTADO',
  'RECONEXAO',
  'ESTADO_SINCRONIZADO',
] as const;

export type TipoMensagem = (typeof TIPOS_MENSAGEM)[number];

export interface MensagemBase<TTipo extends TipoMensagem, TDados> {
  versao: 1;
  id: string;
  tipo: TTipo;
  partidaId: string;
  remetenteId: string;
  sequencia: number;
  enviadaEm: string;
  dados: TDados;
}

export type MensagemBluetooth =
  | MensagemBase<'SOLICITACAO_ENTRADA', { jogador: Pick<Jogador, 'id' | 'nome'> }>
  | MensagemBase<
      'RESPOSTA_ENTRADA',
      { aceita: boolean; motivo?: string; anfitriao?: Jogador; jogadores?: Jogador[] }
    >
  | MensagemBase<'JOGADOR_ENTROU', { jogador: Jogador; jogadores: Jogador[] }>
  | MensagemBase<'JOGADOR_SAIU', { jogadorId: string }>
  | MensagemBase<'SALA_ATUALIZADA', { jogadores: Jogador[] }>
  | MensagemBase<'SALA_ENCERRADA', { motivo: string }>
  | MensagemBase<'PARTIDA_INICIADA', { estado: EstadoPublicoPartida; maoLocal: Carta[] }>
  | MensagemBase<'JOGADA', { cartaId: string; rodada: number }>
  | MensagemBase<'TROCA_REALIZADA', { estado: EstadoPublicoPartida; maoLocal: Carta[]; rodada: number }>
  | MensagemBase<'JOGADOR_COMPLETOU', { jogadorId: string; rodada: number }>
  | MensagemBase<'ACAO_RECUSADA', { mensagem: string }>
  | MensagemBase<'PARTIDA_FINALIZADA', { estado: EstadoPublicoPartida; resultado: ResultadoPartida }>
  | MensagemBase<'JOGADOR_DESCONECTADO', { jogadorId: string; podeReconectar: boolean }>
  | MensagemBase<'RECONEXAO', { jogadorId: string; ultimaSequenciaRecebida: number }>
  | MensagemBase<'ESTADO_SINCRONIZADO', { estado: EstadoPublicoPartida; maoLocal: Carta[] }>;
