import type { Carta, Jogador } from './models';

export const MINIMO_JOGADORES = 2;
export const MAXIMO_JOGADORES = 6;
export const CARTAS_POR_JOGADOR = 4;

export function temQuatroCartasIguais(cartas: readonly Carta[]): boolean {
  return cartas.length === CARTAS_POR_JOGADOR && cartas.every((carta) => carta.valor === cartas[0]?.valor);
}

export function obterProximoJogadorId(jogadores: readonly Jogador[], jogadorAtualId: string): string | null {
  if (jogadores.length < MINIMO_JOGADORES) return null;

  const jogadoresOrdenados = [...jogadores].sort((a, b) => a.ordem - b.ordem);
  const indiceAtual = jogadoresOrdenados.findIndex((jogador) => jogador.id === jogadorAtualId);
  if (indiceAtual < 0) return null;

  return jogadoresOrdenados[(indiceAtual + 1) % jogadoresOrdenados.length]?.id ?? null;
}
