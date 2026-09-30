import { BleClient } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';
import { ErroBluetooth, traduzirErroBluetooth } from '../bluetooth-error';
import { fragmentar, RemontadorFrames } from '../framing';
import type { MensagemBluetooth } from '../messages';
import { BurroBlePeripheral } from '../peripheral-plugin';
import type { ApresentacaoPartida, BluetoothPeripheralPort } from '../ports';
import { desserializarMensagem, serializarMensagem } from '../protocol-validation';

function dataViewParaBase64(view: DataView): string {
  const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  let binario = '';
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario);
}

function base64ParaDataView(valor: string): DataView {
  const binario = atob(valor);
  const bytes = Uint8Array.from(binario, (caractere) => caractere.charCodeAt(0));
  return new DataView(bytes.buffer);
}

export class PeripheralBleTransport implements BluetoothPeripheralPort {
  private readonly dispositivos = new Set<string>();
  private readonly remontador = new RemontadorFrames();
  private readonly recebedores = new Set<(dispositivoId: string, mensagem: MensagemBluetooth) => void>();
  private readonly conexoes = new Set<(dispositivoId: string, conectado: boolean) => void>();
  private listenersProntos = false;

  async preparar(): Promise<void> {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      throw new ErroBluetooth('PLATAFORMA_NAO_SUPORTADA', 'Para criar uma partida, instale o aplicativo em um aparelho Android com BLE.');
    }
    try {
      await this.prepararListeners();
      const permissao = await BurroBlePeripheral.requestNearbyPermissions();
      if (!permissao.granted) {
        throw new ErroBluetooth('PERMISSAO_NEGADA', 'Permissão para dispositivos próximos foi negada.');
      }
      const status = await BurroBlePeripheral.getStatus();
      if (!status.supported) throw new ErroBluetooth('PLATAFORMA_NAO_SUPORTADA', 'Bluetooth LE não está disponível neste aparelho.');
      if (!status.enabled) throw new ErroBluetooth('BLUETOOTH_DESLIGADO', 'O Bluetooth está desligado. Ative-o para continuar.');
      if (!status.peripheralSupported) {
        throw new ErroBluetooth('ANUNCIO_NAO_SUPORTADO', 'Este aparelho não pode anunciar partidas BLE e só poderá entrar como convidado.');
      }
    } catch (erro) {
      throw traduzirErroBluetooth(erro);
    }
  }

  async solicitarAtivacao(): Promise<void> {
    try {
      await BleClient.initialize({ androidNeverForLocation: true });
      await BleClient.requestEnable();
      await this.preparar();
    } catch (erro) {
      throw traduzirErroBluetooth(erro);
    }
  }

  async abrirConfiguracoes(): Promise<void> {
    await BleClient.openAppSettings();
  }

  async anunciarPartida(apresentacao: ApresentacaoPartida): Promise<void> {
    await this.preparar();
    try {
      await BurroBlePeripheral.startAdvertising({
        matchId: apresentacao.partidaId,
        hostId: apresentacao.anfitriaoId,
        name: apresentacao.nome,
      });
    } catch (erro) {
      throw traduzirErroBluetooth(erro);
    }
  }

  async pararAnuncio(): Promise<void> {
    await BurroBlePeripheral.stopAdvertising().catch(() => undefined);
  }

  async enviarPara(dispositivoId: string, mensagem: MensagemBluetooth): Promise<void> {
    if (!this.dispositivos.has(dispositivoId)) throw new ErroBluetooth('DESCONECTADO', 'O jogador não está conectado.');
    try {
      // 20 bytes é o tamanho garantido pelo MTU BLE mínimo (23 menos 3 bytes ATT).
      for (const frame of fragmentar(serializarMensagem(mensagem), 20)) {
        await BurroBlePeripheral.sendPacket({ deviceId: dispositivoId, data: dataViewParaBase64(frame) });
      }
    } catch (erro) {
      throw traduzirErroBluetooth(erro);
    }
  }

  async transmitir(mensagem: MensagemBluetooth): Promise<void> {
    const resultados = await Promise.allSettled(
      Array.from(this.dispositivos, (dispositivoId) => this.enviarPara(dispositivoId, mensagem)),
    );
    const falha = resultados.find((resultado) => resultado.status === 'rejected');
    if (falha?.status === 'rejected') throw traduzirErroBluetooth(falha.reason);
  }

  async desconectarTodos(): Promise<void> {
    await BurroBlePeripheral.disconnectAll().catch(() => undefined);
    this.dispositivos.clear();
    this.remontador.limpar();
  }

  aoReceber(callback: (dispositivoId: string, mensagem: MensagemBluetooth) => void): () => void {
    this.recebedores.add(callback);
    return () => this.recebedores.delete(callback);
  }

  aoAlterarConexao(callback: (dispositivoId: string, conectado: boolean) => void): () => void {
    this.conexoes.add(callback);
    return () => this.conexoes.delete(callback);
  }

  private async prepararListeners(): Promise<void> {
    if (this.listenersProntos) return;
    await BurroBlePeripheral.addListener('packetReceived', ({ deviceId, data }) => {
      try {
        const completa = this.remontador.adicionar(deviceId, base64ParaDataView(data));
        if (!completa) return;
        const mensagem = desserializarMensagem(completa);
        for (const callback of this.recebedores) callback(deviceId, mensagem);
      } catch (erro) {
        console.warn('Mensagem BLE descartada pelo anfitrião:', erro);
      }
    });
    await BurroBlePeripheral.addListener('connectionChanged', ({ deviceId, connected }) => {
      if (connected) this.dispositivos.add(deviceId);
      else this.dispositivos.delete(deviceId);
      for (const callback of this.conexoes) callback(deviceId, connected);
    });
    await BurroBlePeripheral.addListener('bluetoothStateChanged', ({ enabled }) => {
      if (!enabled) {
        for (const dispositivoId of this.dispositivos) {
          for (const callback of this.conexoes) callback(dispositivoId, false);
        }
        this.dispositivos.clear();
      }
    });
    this.listenersProntos = true;
  }
}

export const peripheralBleTransport = new PeripheralBleTransport();
