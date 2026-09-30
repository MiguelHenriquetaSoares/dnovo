export type CodigoErroBluetooth =
  | 'PLATAFORMA_NAO_SUPORTADA'
  | 'PERMISSAO_NEGADA'
  | 'BLUETOOTH_DESLIGADO'
  | 'ANUNCIO_NAO_SUPORTADO'
  | 'CONEXAO_FALHOU'
  | 'DESCONECTADO'
  | 'PROTOCOLO_INVALIDO'
  | 'ERRO_DESCONHECIDO';

export class ErroBluetooth extends Error {
  constructor(
    public readonly codigo: CodigoErroBluetooth,
    mensagem: string,
    public readonly causa?: unknown,
  ) {
    super(mensagem);
    this.name = 'ErroBluetooth';
  }
}

export function traduzirErroBluetooth(erro: unknown): ErroBluetooth {
  if (erro instanceof ErroBluetooth) return erro;
  const mensagem = erro instanceof Error ? erro.message : String(erro);
  const normalizada = mensagem.toLowerCase();
  if (normalizada.includes('permission') || normalizada.includes('permissão') || normalizada.includes('denied')) {
    return new ErroBluetooth('PERMISSAO_NEGADA', 'Permissão Bluetooth negada. Libere “Dispositivos próximos” nas configurações.', erro);
  }
  if (normalizada.includes('disabled') || normalizada.includes('desligado')) {
    return new ErroBluetooth('BLUETOOTH_DESLIGADO', 'O Bluetooth está desligado. Ative-o para continuar.', erro);
  }
  if (normalizada.includes('unsupported') || normalizada.includes('não suporta')) {
    return new ErroBluetooth('ANUNCIO_NAO_SUPORTADO', 'Este aparelho não oferece o recurso Bluetooth necessário.', erro);
  }
  if (normalizada.includes('disconnect')) {
    return new ErroBluetooth('DESCONECTADO', 'A conexão Bluetooth foi perdida.', erro);
  }
  return new ErroBluetooth('ERRO_DESCONHECIDO', mensagem || 'Falha inesperada no Bluetooth.', erro);
}
