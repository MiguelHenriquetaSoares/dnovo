export const NAIPES = ['PAUS', 'COPAS', 'ESPADAS', 'OUROS'] as const;
export const VALORES_CARTA = ['AS', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'VALETE', 'DAMA', 'REI'] as const;

export type Naipe = (typeof NAIPES)[number];
export type ValorCarta = (typeof VALORES_CARTA)[number];

export interface Carta {
  id: string;
  naipe: Naipe;
  valor: ValorCarta;
}

export type PapelJogador = 'ANFITRIAO' | 'CONVIDADO';
export type EstadoConexao = 'DESCONECTADO' | 'CONECTANDO' | 'CONECTADO' | 'RECONECTANDO';

export interface Jogador {
  id: string;
  nome: string;
  papel: PapelJogador;
  ordem: number;
  letrasPenalidade: string;
  estadoConexao: EstadoConexao;
}

export type StatusPartida =
  | 'SALA_DE_ESPERA'
  | 'EM_ANDAMENTO'
  | 'FINALIZADA'
  | 'CANCELADA'
  | 'INTERROMPIDA';

export type MotivoEncerramento = 'VITORIA' | 'PALAVRA_BURRO' | 'ABANDONO' | 'DESCONEXAO' | 'CANCELAMENTO';
export type ResultadoJogadorLocal = 'VENCEDOR' | 'PENALIZADO' | 'PARTICIPANTE' | 'NAO_CONCLUIDO';

export interface ResultadoPartida {
  vencedorId: string | null;
  jogadorPenalizadoId: string | null;
  resultadoJogadorLocal: ResultadoJogadorLocal;
  motivo: MotivoEncerramento;
}

export interface Partida {
  id: string;
  anfitriaoId: string;
  jogadorLocalId: string;
  jogadores: Jogador[];
  ordemJogadores: string[];
  status: StatusPartida;
  iniciadaEm: string | null;
  encerradaEm: string | null;
  rodadaAtual: number;
  jogadorDaVezId: string | null;
  maos: Record<string, Carta[]>;
  cartasSelecionadas: Record<string, string>;
  resultado: ResultadoPartida | null;
}

/** Estado que pode ser transmitido sem revelar as mãos ou cartas escolhidas. */
export interface EstadoPublicoPartida {
  id: string;
  anfitriaoId: string;
  jogadores: Jogador[];
  ordemJogadores: string[];
  status: StatusPartida;
  iniciadaEm: string | null;
  encerradaEm: string | null;
  rodadaAtual: number;
  jogadorDaVezId: string | null;
  jogadoresQueConfirmaram: string[];
  resultado: ResultadoPartida | null;
}

export interface PartidaHistorico {
  id: string;
  status: Extract<StatusPartida, 'FINALIZADA' | 'CANCELADA' | 'INTERROMPIDA'>;
  iniciadaEm: string;
  encerradaEm: string;
  jogadores: Jogador[];
  ordemJogadores: string[];
  quantidadeJogadores: number;
  quantidadeRodadas: number;
  resultado: ResultadoPartida;
}
