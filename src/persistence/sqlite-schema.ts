export const VERSAO_BANCO = 1;

export const CRIAR_TABELA_HISTORICO = `
  CREATE TABLE IF NOT EXISTS historico_partidas (
    id TEXT PRIMARY KEY NOT NULL,
    status TEXT NOT NULL,
    iniciada_em TEXT NOT NULL,
    encerrada_em TEXT NOT NULL,
    quantidade_rodadas INTEGER NOT NULL,
    dados_json TEXT NOT NULL
  );
`;

export const CRIAR_INDICE_HISTORICO_DATA = `
  CREATE INDEX IF NOT EXISTS idx_historico_encerrada_em
  ON historico_partidas(encerrada_em DESC);
`;
