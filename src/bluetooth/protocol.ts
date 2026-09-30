export const VERSAO_PROTOCOLO = 1 as const;
export const UUID_SERVICO_BURRO = '7b757272-6f00-4a6f-676f-427572726f01';
export const UUID_CARACTERISTICA_ENVIO = '7b757272-6f00-4a6f-676f-427572726f02';
export const UUID_CARACTERISTICA_EVENTOS = '7b757272-6f00-4a6f-676f-427572726f03';
export const TAMANHO_MAXIMO_MENSAGEM = 8_192;
export const MAXIMO_JOGADORES = 6;

export function gerarId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function gerarIdPartida(): string {
  const bytes = new Uint8Array(4);
  globalThis.crypto?.getRandomValues?.(bytes);
  if (bytes.every((valor) => valor === 0)) {
    const alternativo = Math.floor(Math.random() * 0xffffffff);
    new DataView(bytes.buffer).setUint32(0, alternativo);
  }
  return Array.from(bytes, (valor) => valor.toString(16).padStart(2, '0')).join('');
}
