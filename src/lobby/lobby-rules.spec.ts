import { describe, expect, it } from 'vitest';
import type { Jogador } from '../domain/models';
import {
  avaliarEntrada,
  criarJogadorDaSala,
  definirEstadoConexao,
  podeIniciarPartida,
  podeReconectarJogador,
} from './lobby-rules';

function anfitriao(): Jogador {
  return criarJogadorDaSala({ id: 'j1', nome: 'Ana' }, 'ANFITRIAO', 0);
}

describe('regras da sala de espera', () => {
  it('cria a sala com o anfitrião e bloqueia início com uma pessoa', () => {
    const sala = [anfitriao()];
    expect(sala[0]).toMatchObject({ id: 'j1', papel: 'ANFITRIAO', ordem: 0 });
    expect(podeIniciarPartida(sala)).toBe(false);
  });

  it('aceita o segundo jogador e habilita o início', () => {
    const sala = [anfitriao()];
    const candidato = { id: 'j2', nome: 'Bia' };
    expect(avaliarEntrada(sala, candidato)).toEqual({ aceita: true });
    sala.push(criarJogadorDaSala(candidato, 'CONVIDADO', 1));
    expect(podeIniciarPartida(sala)).toBe(true);
  });

  it('aceita vários jogadores até seis e recusa o sétimo', () => {
    const sala = [anfitriao()];
    for (let indice = 2; indice <= 6; indice += 1) {
      const candidato = { id: `j${indice}`, nome: `Jogador ${indice}` };
      expect(avaliarEntrada(sala, candidato).aceita).toBe(true);
      sala.push(criarJogadorDaSala(candidato, 'CONVIDADO', indice - 1));
    }
    expect(avaliarEntrada(sala, { id: 'j7', nome: 'Jogador 7' })).toEqual({
      aceita: false,
      motivo: 'A sala atingiu o limite de seis jogadores.',
    });
  });

  it('recusa identidade duplicada', () => {
    expect(avaliarEntrada([anfitriao()], { id: 'j1', nome: 'Outra pessoa' })).toEqual({
      aceita: false,
      motivo: 'Este jogador já pertence à sala.',
    });
  });

  it('pausa com desconexão e só permite reconectar membro conhecido', () => {
    const sala = [
      anfitriao(),
      criarJogadorDaSala({ id: 'j2', nome: 'Bia' }, 'CONVIDADO', 1),
    ];
    expect(definirEstadoConexao(sala, 'j2', 'DESCONECTADO')).toBe(true);
    expect(podeIniciarPartida(sala)).toBe(false);
    expect(podeReconectarJogador(sala, 'j2')).toBe(true);
    expect(podeReconectarJogador(sala, 'desconhecido')).toBe(false);
    expect(definirEstadoConexao(sala, 'j2', 'CONECTADO')).toBe(true);
    expect(podeIniciarPartida(sala)).toBe(true);
  });
});
