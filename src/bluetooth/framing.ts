import { ErroProtocolo } from './protocol-validation';

const MAGIC = 0x42;
const VERSAO_FRAME = 1;
const CABECALHO = 10;
const MAXIMO_PARTES = 1_024;
const EXPIRACAO_MS = 15_000;

function idTransferencia(): number {
  const bytes = new Uint8Array(4);
  globalThis.crypto?.getRandomValues?.(bytes);
  return new DataView(bytes.buffer).getUint32(0) || Math.floor(Math.random() * 0xffffffff);
}

export function fragmentar(texto: string, tamanhoMaximoPacote: number, id = idTransferencia()): DataView[] {
  const dados = new TextEncoder().encode(texto);
  const capacidade = tamanhoMaximoPacote - CABECALHO;
  if (capacidade < 1) throw new ErroProtocolo('MTU insuficiente para o protocolo.');

  const total = Math.max(1, Math.ceil(dados.length / capacidade));
  if (total > MAXIMO_PARTES) throw new ErroProtocolo('Mensagem exige fragmentos demais.');

  return Array.from({ length: total }, (_, indice) => {
    const inicio = indice * capacidade;
    const parte = dados.slice(inicio, inicio + capacidade);
    const pacote = new Uint8Array(CABECALHO + parte.length);
    const cabecalho = new DataView(pacote.buffer);
    cabecalho.setUint8(0, MAGIC);
    cabecalho.setUint8(1, VERSAO_FRAME);
    cabecalho.setUint32(2, id);
    cabecalho.setUint16(6, indice);
    cabecalho.setUint16(8, total);
    pacote.set(parte, CABECALHO);
    return new DataView(pacote.buffer);
  });
}

interface TransferenciaPendente {
  criadaEm: number;
  partes: Array<Uint8Array | undefined>;
  recebidas: number;
}

export class RemontadorFrames {
  private readonly pendentes = new Map<string, TransferenciaPendente>();

  adicionar(origem: string, frame: DataView): string | null {
    this.expirar();
    if (frame.byteLength < CABECALHO) throw new ErroProtocolo('Fragmento menor que o cabeçalho.');
    if (frame.getUint8(0) !== MAGIC || frame.getUint8(1) !== VERSAO_FRAME) {
      throw new ErroProtocolo('Assinatura ou versão do fragmento inválida.');
    }

    const transferenciaId = frame.getUint32(2);
    const indice = frame.getUint16(6);
    const total = frame.getUint16(8);
    if (total < 1 || total > MAXIMO_PARTES || indice >= total) throw new ErroProtocolo('Índice de fragmento inválido.');

    const chave = `${origem}:${transferenciaId}`;
    const transferencia = this.pendentes.get(chave) ?? {
      criadaEm: Date.now(),
      partes: new Array<Uint8Array | undefined>(total),
      recebidas: 0,
    };
    if (transferencia.partes.length !== total) throw new ErroProtocolo('Quantidade de fragmentos inconsistente.');

    if (!transferencia.partes[indice]) {
      transferencia.partes[indice] = new Uint8Array(frame.buffer, frame.byteOffset + CABECALHO, frame.byteLength - CABECALHO).slice();
      transferencia.recebidas += 1;
    }
    this.pendentes.set(chave, transferencia);
    if (transferencia.recebidas !== total) return null;

    this.pendentes.delete(chave);
    const tamanho = transferencia.partes.reduce((soma, parte) => soma + (parte?.length ?? 0), 0);
    const dados = new Uint8Array(tamanho);
    let deslocamento = 0;
    for (const parte of transferencia.partes) {
      if (!parte) throw new ErroProtocolo('Mensagem incompleta.');
      dados.set(parte, deslocamento);
      deslocamento += parte.length;
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(dados);
  }

  limpar(): void {
    this.pendentes.clear();
  }

  private expirar(): void {
    const limite = Date.now() - EXPIRACAO_MS;
    for (const [chave, transferencia] of this.pendentes) {
      if (transferencia.criadaEm < limite) this.pendentes.delete(chave);
    }
  }
}
