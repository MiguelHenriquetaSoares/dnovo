import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite';
import type { PartidaHistorico } from '../domain/models';
import type { HistoricoRepository } from './history-repository';
import { CRIAR_INDICE_HISTORICO_DATA, CRIAR_TABELA_HISTORICO, VERSAO_BANCO } from './sqlite-schema';

const BANCO = 'burro_historico';

export class SQLiteHistoricoRepository implements HistoricoRepository {
  private readonly sqlite = new SQLiteConnection(CapacitorSQLite);
  private banco: SQLiteDBConnection | null = null;
  private inicializacao: Promise<void> | null = null;

  async inicializar(): Promise<void> {
    if (this.banco) return;
    if (this.inicializacao) return this.inicializacao;
    this.inicializacao = this.abrirBanco();
    try {
      await this.inicializacao;
    } finally {
      this.inicializacao = null;
    }
  }

  private async abrirBanco(): Promise<void> {
    const existente = await this.sqlite.isConnection(BANCO, false);
    const banco = existente.result
      ? await this.sqlite.retrieveConnection(BANCO, false)
      : await this.sqlite.createConnection(BANCO, false, 'no-encryption', VERSAO_BANCO, false);
    const aberto = await banco.isDBOpen();
    if (!aberto.result) await banco.open();
    await banco.execute(`${CRIAR_TABELA_HISTORICO}\n${CRIAR_INDICE_HISTORICO_DATA}`);
    this.banco = banco;
  }

  async listar(): Promise<PartidaHistorico[]> {
    const banco = await this.obterBanco();
    const resposta = await banco.query('SELECT dados_json FROM historico_partidas ORDER BY encerrada_em DESC');
    return (resposta.values ?? []).map((linha) => JSON.parse(String(linha.dados_json)) as PartidaHistorico);
  }

  async obterPorId(partidaId: string): Promise<PartidaHistorico | null> {
    const banco = await this.obterBanco();
    const resposta = await banco.query('SELECT dados_json FROM historico_partidas WHERE id = ? LIMIT 1', [partidaId]);
    const linha = resposta.values?.[0];
    return linha ? JSON.parse(String(linha.dados_json)) as PartidaHistorico : null;
  }

  async salvar(partida: PartidaHistorico): Promise<void> {
    const banco = await this.obterBanco();
    await banco.run(
      `INSERT OR REPLACE INTO historico_partidas
       (id, status, iniciada_em, encerrada_em, quantidade_rodadas, dados_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [partida.id, partida.status, partida.iniciadaEm, partida.encerradaEm, partida.quantidadeRodadas, JSON.stringify(partida)],
    );
  }

  async excluir(partidaId: string): Promise<void> {
    const banco = await this.obterBanco();
    await banco.run('DELETE FROM historico_partidas WHERE id = ?', [partidaId]);
  }

  async limpar(): Promise<void> {
    const banco = await this.obterBanco();
    await banco.run('DELETE FROM historico_partidas');
  }

  private async obterBanco(): Promise<SQLiteDBConnection> {
    await this.inicializar();
    return this.banco!;
  }
}
