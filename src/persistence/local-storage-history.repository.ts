import type { PartidaHistorico } from '../domain/models';
import type { HistoricoRepository } from './history-repository';

export class LocalStorageHistoricoRepository implements HistoricoRepository {
  constructor(
    private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
    private readonly chave = 'burro:historico:v1',
  ) {}

  async inicializar(): Promise<void> {
    this.ler();
  }

  async listar(): Promise<PartidaHistorico[]> {
    return this.ler().sort((a, b) => b.encerradaEm.localeCompare(a.encerradaEm));
  }

  async obterPorId(partidaId: string): Promise<PartidaHistorico | null> {
    return this.ler().find((partida) => partida.id === partidaId) ?? null;
  }

  async salvar(partida: PartidaHistorico): Promise<void> {
    const partidas = this.ler().filter((item) => item.id !== partida.id);
    partidas.push(JSON.parse(JSON.stringify(partida)) as PartidaHistorico);
    this.storage.setItem(this.chave, JSON.stringify(partidas));
  }

  async excluir(partidaId: string): Promise<void> {
    this.storage.setItem(this.chave, JSON.stringify(this.ler().filter((partida) => partida.id !== partidaId)));
  }

  async limpar(): Promise<void> {
    this.storage.removeItem(this.chave);
  }

  private ler(): PartidaHistorico[] {
    const bruto = this.storage.getItem(this.chave);
    if (!bruto) return [];
    try {
      const valor = JSON.parse(bruto) as unknown;
      return Array.isArray(valor) ? valor.filter(partidaHistoricoValida) : [];
    } catch {
      return [];
    }
  }
}

function partidaHistoricoValida(valor: unknown): valor is PartidaHistorico {
  if (!valor || typeof valor !== 'object') return false;
  const partida = valor as Partial<PartidaHistorico>;
  return typeof partida.id === 'string' && typeof partida.iniciadaEm === 'string' &&
    typeof partida.encerradaEm === 'string' && Array.isArray(partida.jogadores) &&
    Array.isArray(partida.ordemJogadores) && typeof partida.quantidadeJogadores === 'number' &&
    typeof partida.quantidadeRodadas === 'number' && !!partida.resultado;
}
