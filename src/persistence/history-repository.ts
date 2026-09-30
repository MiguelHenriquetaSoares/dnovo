import type { PartidaHistorico } from '../domain/models';

export interface HistoricoRepository {
  inicializar(): Promise<void>;
  listar(): Promise<PartidaHistorico[]>;
  obterPorId(partidaId: string): Promise<PartidaHistorico | null>;
  salvar(partida: PartidaHistorico): Promise<void>;
  excluir(partidaId: string): Promise<void>;
  limpar(): Promise<void>;
}
