import type { MensagemBluetooth } from './messages';

export type EstadoBluetooth =
  | 'NAO_INICIALIZADO'
  | 'PRONTO'
  | 'PROCURANDO'
  | 'CONECTANDO'
  | 'CONECTADO'
  | 'RECONECTANDO'
  | 'DESCONECTADO'
  | 'DESLIGADO'
  | 'PERMISSAO_NEGADA'
  | 'ERRO';

export interface PartidaAnunciada {
  dispositivoId: string;
  nome: string;
  intensidadeSinal?: number;
}

export interface ApresentacaoPartida {
  partidaId: string;
  nome: string;
  anfitriaoId: string;
  versaoProtocolo: 1;
}

export interface BluetoothCentralPort {
  preparar(): Promise<void>;
  solicitarAtivacao(): Promise<void>;
  abrirConfiguracoes(): Promise<void>;
  procurarPartidas(callback: (partida: PartidaAnunciada) => void): Promise<() => Promise<void>>;
  conectar(dispositivoId: string): Promise<ApresentacaoPartida>;
  desconectar(): Promise<void>;
  enviar(mensagem: MensagemBluetooth): Promise<void>;
  aoReceber(callback: (mensagem: MensagemBluetooth) => void): () => void;
  aoDesconectar(callback: () => void): () => void;
}

export interface BluetoothPeripheralPort {
  preparar(): Promise<void>;
  solicitarAtivacao(): Promise<void>;
  abrirConfiguracoes(): Promise<void>;
  anunciarPartida(apresentacao: ApresentacaoPartida): Promise<void>;
  pararAnuncio(): Promise<void>;
  enviarPara(dispositivoId: string, mensagem: MensagemBluetooth): Promise<void>;
  transmitir(mensagem: MensagemBluetooth): Promise<void>;
  desconectarTodos(): Promise<void>;
  aoReceber(callback: (dispositivoId: string, mensagem: MensagemBluetooth) => void): () => void;
  aoAlterarConexao(callback: (dispositivoId: string, conectado: boolean) => void): () => void;
}
