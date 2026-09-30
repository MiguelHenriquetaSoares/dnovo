import type { Jogador } from '../domain/models';
import { MAXIMO_JOGADORES } from '../bluetooth/protocol';

export interface DecisaoEntrada {
  aceita: boolean;
  motivo?: string;
}

export function criarJogadorDaSala(
  jogador: Pick<Jogador, 'id' | 'nome'>,
  papel: Jogador['papel'],
  ordem: number,
): Jogador {
  return {
    ...jogador,
    papel,
    ordem,
    letrasPenalidade: '',
    estadoConexao: 'CONECTADO',
  };
}

export function avaliarEntrada(
  jogadores: readonly Jogador[],
  candidato: Pick<Jogador, 'id' | 'nome'>,
): DecisaoEntrada {
  if (jogadores.some((jogador) => jogador.id === candidato.id)) {
    return { aceita: false, motivo: 'Este jogador já pertence à sala.' };
  }
  if (jogadores.length >= MAXIMO_JOGADORES) {
    return { aceita: false, motivo: 'A sala atingiu o limite de seis jogadores.' };
  }
  return { aceita: true };
}

export function podeIniciarPartida(jogadores: readonly Jogador[]): boolean {
  return jogadores.length >= 2 && jogadores.every((jogador) => jogador.estadoConexao === 'CONECTADO');
}

export function podeReconectarJogador(jogadores: readonly Jogador[], jogadorId: string): boolean {
  return jogadores.some((jogador) => jogador.id === jogadorId);
}

export function definirEstadoConexao(
  jogadores: Jogador[],
  jogadorId: string,
  estadoConexao: Jogador['estadoConexao'],
): boolean {
  const jogador = jogadores.find((item) => item.id === jogadorId);
  if (!jogador) return false;
  jogador.estadoConexao = estadoConexao;
  return true;
}
