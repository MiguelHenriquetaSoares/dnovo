import { describe, expect, it } from 'vitest';
import { obterProximoJogadorId, temQuatroCartasIguais } from './game-rules';
import type { Carta, Jogador } from './models';

const cartas: Carta[] = ['PAUS', 'COPAS', 'ESPADAS', 'OUROS'].map((naipe, indice) => ({
  id: `c${indice}`,
  naipe: naipe as Carta['naipe'],
  valor: '7',
}));

const jogadores: Jogador[] = [
  { id: 'b', nome: 'Bia', papel: 'CONVIDADO', ordem: 2, letrasPenalidade: '', estadoConexao: 'CONECTADO' },
  { id: 'a', nome: 'Ana', papel: 'ANFITRIAO', ordem: 1, letrasPenalidade: '', estadoConexao: 'CONECTADO' },
];

describe('regras básicas do domínio', () => {
  it('detecta exatamente quatro cartas do mesmo valor', () => {
    expect(temQuatroCartasIguais(cartas)).toBe(true);
    expect(temQuatroCartasIguais(cartas.slice(0, 3))).toBe(false);
    expect(temQuatroCartasIguais([{ ...cartas[0]!, valor: '8' }, ...cartas.slice(1)])).toBe(false);
  });

  it('respeita a ordem circular dos jogadores', () => {
    expect(obterProximoJogadorId(jogadores, 'a')).toBe('b');
    expect(obterProximoJogadorId(jogadores, 'b')).toBe('a');
    expect(obterProximoJogadorId(jogadores, 'inexistente')).toBeNull();
  });
});
