import { describe, expect, it } from 'vitest';
import type { PartidaHistorico } from '../domain/models';
import { LocalStorageHistoricoRepository } from './local-storage-history.repository';

class MemoriaStorage implements Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  private dados = new Map<string, string>();
  getItem(chave: string) { return this.dados.get(chave) ?? null; }
  setItem(chave: string, valor: string) { this.dados.set(chave, valor); }
  removeItem(chave: string) { this.dados.delete(chave); }
}

function registro(id: string, encerradaEm: string): PartidaHistorico {
  return {
    id,
    status: 'FINALIZADA',
    iniciadaEm: '2026-09-30T10:00:00.000Z',
    encerradaEm,
    jogadores: [
      { id: 'j1', nome: 'Ana', papel: 'ANFITRIAO', ordem: 0, letrasPenalidade: '', estadoConexao: 'CONECTADO' },
      { id: 'j2', nome: 'Bia', papel: 'CONVIDADO', ordem: 1, letrasPenalidade: 'B', estadoConexao: 'CONECTADO' },
    ],
    ordemJogadores: ['j1', 'j2'],
    quantidadeJogadores: 2,
    quantidadeRodadas: 3,
    resultado: { vencedorId: 'j1', jogadorPenalizadoId: 'j2', resultadoJogadorLocal: 'VENCEDOR', motivo: 'VITORIA' },
  };
}

describe('repositório local do histórico', () => {
  it('persiste, recarrega em nova instância e substitui sem duplicar', async () => {
    const storage = new MemoriaStorage();
    const primeiro = new LocalStorageHistoricoRepository(storage);
    await primeiro.salvar(registro('p1', '2026-09-30T10:03:00.000Z'));
    await primeiro.salvar({ ...registro('p1', '2026-09-30T10:04:00.000Z'), quantidadeRodadas: 4 });
    const reaberto = new LocalStorageHistoricoRepository(storage);
    expect(await reaberto.listar()).toHaveLength(1);
    expect((await reaberto.obterPorId('p1'))?.quantidadeRodadas).toBe(4);
  });

  it('ordena, exclui uma partida e limpa tudo', async () => {
    const storage = new MemoriaStorage();
    const repositorio = new LocalStorageHistoricoRepository(storage);
    await repositorio.salvar(registro('antiga', '2026-09-30T10:03:00.000Z'));
    await repositorio.salvar(registro('nova', '2026-09-30T11:03:00.000Z'));
    expect((await repositorio.listar()).map((p) => p.id)).toEqual(['nova', 'antiga']);
    await repositorio.excluir('nova');
    expect(await repositorio.obterPorId('nova')).toBeNull();
    await repositorio.limpar();
    expect(await repositorio.listar()).toEqual([]);
  });
});
