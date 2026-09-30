import { Capacitor } from '@capacitor/core';
import type { EstadoPublicoPartida, PartidaHistorico } from '../domain/models';
import type { HistoricoRepository } from './history-repository';
import { LocalStorageHistoricoRepository } from './local-storage-history.repository';
import { SQLiteHistoricoRepository } from './sqlite-history.repository';

let repositorio: HistoricoRepository | null = null;

export function obterHistoricoRepository(): HistoricoRepository {
  if (repositorio) return repositorio;
  if (Capacitor.isNativePlatform()) {
    repositorio = new SQLiteHistoricoRepository();
  } else {
    repositorio = new LocalStorageHistoricoRepository(localStorage);
  }
  return repositorio;
}

export function paraHistorico(estado: EstadoPublicoPartida): PartidaHistorico {
  if (!estado.iniciadaEm || !estado.encerradaEm || !estado.resultado || estado.status === 'SALA_DE_ESPERA' || estado.status === 'EM_ANDAMENTO') {
    throw new Error('Somente partidas encerradas podem ser salvas no histórico.');
  }
  return {
    id: estado.id,
    status: estado.status,
    iniciadaEm: estado.iniciadaEm,
    encerradaEm: estado.encerradaEm,
    jogadores: estado.jogadores.map((jogador) => ({ ...jogador })),
    ordemJogadores: [...estado.ordemJogadores],
    quantidadeJogadores: estado.jogadores.length,
    quantidadeRodadas: Math.max(0, estado.rodadaAtual - 1),
    resultado: { ...estado.resultado },
  };
}

export function substituirHistoricoRepository(novo: HistoricoRepository | null): void {
  repositorio = novo;
}
