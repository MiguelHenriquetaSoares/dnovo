import { describe, expect, it } from 'vitest';
import {
  confirmarJogada,
  criarBaralho,
  criarPartidaEmAndamento,
  declararObjetivo,
  encerrarSemVencedor,
  estadoPublico,
  validarConservacao,
} from './game-engine';
import type { Carta, Jogador } from './models';

function jogadores(quantidade = 3): Jogador[] {
  return Array.from({ length: quantidade }, (_, ordem) => ({
    id: `j${ordem + 1}`,
    nome: `Jogador ${ordem + 1}`,
    papel: ordem === 0 ? 'ANFITRIAO' as const : 'CONVIDADO' as const,
    ordem,
    letrasPenalidade: '',
    estadoConexao: 'CONECTADO' as const,
  }));
}

function partidaTresJogadores() {
  const partida = criarPartidaEmAndamento('p1', 'j1', 'j1', jogadores(), () => 0.42, '2026-09-30T10:00:00.000Z');
  partida.maos = {
    j1: cartas('AS'),
    j2: cartas('2'),
    j3: cartas('3'),
  };
  return partida;
}

function cartas(valor: Carta['valor']): Carta[] {
  return ['PAUS', 'COPAS', 'ESPADAS', 'OUROS'].map((naipe) => ({
    id: `${valor}-${naipe}`,
    valor,
    naipe: naipe as Carta['naipe'],
  }));
}

describe('motor autoritativo do jogo', () => {
  it.each([2, 3, 4, 5, 6])('monta e distribui quartetos completos para %i jogadores', (quantidade) => {
    const baralho = criarBaralho(quantidade);
    expect(baralho).toHaveLength(quantidade * 4);
    expect(new Set(baralho.map((carta) => carta.id)).size).toBe(baralho.length);
    const partida = criarPartidaEmAndamento('p', 'j1', 'j1', jogadores(quantidade), () => 0.37);
    expect(Object.values(partida.maos).every((mao) => mao.length === 4)).toBe(true);
    expect(() => validarConservacao(partida)).not.toThrow();
  });

  it('respeita o turno, rejeita repetição e executa troca circular atômica', () => {
    const partida = partidaTresJogadores();
    const enviadas = {
      j1: partida.maos.j1![0]!,
      j2: partida.maos.j2![0]!,
      j3: partida.maos.j3![0]!,
    };
    expect(() => confirmarJogada(partida, 'j2', enviadas.j2.id, 1)).toThrow('Não é a vez');
    expect(confirmarJogada(partida, 'j1', enviadas.j1.id, 1).trocaExecutada).toBe(false);
    expect(() => confirmarJogada(partida, 'j1', enviadas.j1.id, 1)).toThrow('Não é a vez');
    confirmarJogada(partida, 'j2', enviadas.j2.id, 1);
    const resultado = confirmarJogada(partida, 'j3', enviadas.j3.id, 1);
    expect(resultado).toEqual({ trocaExecutada: true, rodadaConcluida: 1 });
    expect(partida.maos.j2).toContainEqual(enviadas.j1);
    expect(partida.maos.j3).toContainEqual(enviadas.j2);
    expect(partida.maos.j1).toContainEqual(enviadas.j3);
    expect(partida.rodadaAtual).toBe(2);
    expect(partida.jogadorDaVezId).toBe('j1');
    expect(() => validarConservacao(partida)).not.toThrow();
  });

  it('rejeita carta inexistente e rodada antiga', () => {
    const partida = partidaTresJogadores();
    expect(() => confirmarJogada(partida, 'j1', 'carta-falsa', 1)).toThrow('não pertence');
    expect(() => confirmarJogada(partida, 'j1', partida.maos.j1![0]!.id, 0)).toThrow('outra rodada');
  });

  it('valida o quarteto, escolhe vencedor e penaliza o jogador anterior', () => {
    const partida = partidaTresJogadores();
    const resultado = declararObjetivo(partida, 'j1', 1, '2026-09-30T10:05:00.000Z');
    expect(resultado.vencedorId).toBe('j1');
    expect(resultado.jogadorPenalizadoId).toBe('j3');
    expect(partida.jogadores.find((j) => j.id === 'j3')?.letrasPenalidade).toBe('B');
    expect(partida.status).toBe('FINALIZADA');
    expect(partida.jogadorDaVezId).toBeNull();
  });

  it('rejeita declaração sem quarteto e não expõe mãos no estado público', () => {
    const partida = partidaTresJogadores();
    partida.maos.j1 = [cartas('AS')[0]!, cartas('2')[0]!, cartas('3')[0]!, cartas('4')[0]!];
    expect(() => declararObjetivo(partida, 'j1', 1)).toThrow('não possui');
    const publico = estadoPublico(partida, 'j1');
    expect(publico).not.toHaveProperty('maos');
    expect(JSON.stringify(publico)).not.toContain('AS-PAUS');
  });

  it('rejeita declaração depois que a carta do jogador foi comprometida', () => {
    const partida = partidaTresJogadores();
    confirmarJogada(partida, 'j1', partida.maos.j1![0]!.id, 1);
    expect(() => declararObjetivo(partida, 'j1', 1)).toThrow('já confirmou');
  });

  it.each([
    ['INTERROMPIDA', 'ABANDONO', 'j2'],
    ['INTERROMPIDA', 'DESCONEXAO', null],
    ['CANCELADA', 'CANCELAMENTO', null],
  ] as const)('encerra com status %s e motivo %s', (status, motivo, penalizadoId) => {
    const partida = partidaTresJogadores();
    const resultado = encerrarSemVencedor(partida, status, motivo, penalizadoId, '2026-09-30T10:08:00.000Z');
    expect(partida.status).toBe(status);
    expect(partida.encerradaEm).toBe('2026-09-30T10:08:00.000Z');
    expect(partida.jogadorDaVezId).toBeNull();
    expect(resultado).toMatchObject({ motivo, jogadorPenalizadoId: penalizadoId });
  });
});
