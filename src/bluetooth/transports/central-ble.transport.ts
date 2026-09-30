import {
  BleClient,
  dataViewToText,
  textToDataView,
  type ScanResult,
} from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';
import { ErroBluetooth, traduzirErroBluetooth } from '../bluetooth-error';
import { fragmentar, RemontadorFrames } from '../framing';
import type { MensagemBluetooth } from '../messages';
import type { ApresentacaoPartida, BluetoothCentralPort, PartidaAnunciada } from '../ports';
import {
  UUID_CARACTERISTICA_ENVIO,
  UUID_CARACTERISTICA_EVENTOS,
  UUID_SERVICO_BURRO,
} from '../protocol';
import { desserializarMensagem, serializarMensagem } from '../protocol-validation';

function apresentarScan(resultado: ScanResult): PartidaAnunciada {
  return {
    dispositivoId: resultado.device.deviceId,
    nome: resultado.localName || resultado.device.name || 'Partida próxima',
    intensidadeSinal: resultado.rssi,
  };
}

function validarApresentacao(valor: unknown): valor is ApresentacaoPartida {
  if (typeof valor !== 'object' || valor === null) return false;
  const item = valor as Record<string, unknown>;
  return (
    typeof item.partidaId === 'string' &&
    /^[0-9a-f]{8}$/i.test(item.partidaId) &&
    typeof item.nome === 'string' &&
    item.nome.length >= 2 &&
    item.nome.length <= 24 &&
    typeof item.anfitriaoId === 'string' &&
    item.anfitriaoId.length > 0 &&
    item.versaoProtocolo === 1
  );
}

export class CentralBleTransport implements BluetoothCentralPort {
  private dispositivoId: string | null = null;
  private tamanhoPacote = 20;
  private readonly remontador = new RemontadorFrames();
  private readonly recebedores = new Set<(mensagem: MensagemBluetooth) => void>();
  private readonly desconexoes = new Set<() => void>();
  private inicializado = false;

  async preparar(): Promise<void> {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      throw new ErroBluetooth('PLATAFORMA_NAO_SUPORTADA', 'Bluetooth real está disponível somente no aplicativo Android instalado.');
    }
    try {
      if (!this.inicializado) {
        await BleClient.initialize({ androidNeverForLocation: true });
        await BleClient.startEnabledNotifications((ativado) => {
          if (!ativado) this.notificarDesconexao();
        });
        this.inicializado = true;
      }
      if (!(await BleClient.isEnabled())) {
        throw new ErroBluetooth('BLUETOOTH_DESLIGADO', 'O Bluetooth está desligado. Ative-o para continuar.');
      }
    } catch (erro) {
      throw traduzirErroBluetooth(erro);
    }
  }

  async solicitarAtivacao(): Promise<void> {
    try {
      await BleClient.requestEnable();
      await this.preparar();
    } catch (erro) {
      throw traduzirErroBluetooth(erro);
    }
  }

  async abrirConfiguracoes(): Promise<void> {
    await BleClient.openAppSettings();
  }

  async procurarPartidas(callback: (partida: PartidaAnunciada) => void): Promise<() => Promise<void>> {
    await this.preparar();
    const vistos = new Map<string, PartidaAnunciada>();
    try {
      await BleClient.requestLEScan(
        { services: [UUID_SERVICO_BURRO], allowDuplicates: true },
        (resultado) => {
          const partida = apresentarScan(resultado);
          const anterior = vistos.get(partida.dispositivoId);
          if (!anterior || anterior.nome !== partida.nome || anterior.intensidadeSinal !== partida.intensidadeSinal) {
            vistos.set(partida.dispositivoId, partida);
            callback(partida);
          }
        },
      );
      return async () => BleClient.stopLEScan();
    } catch (erro) {
      throw traduzirErroBluetooth(erro);
    }
  }

  async conectar(dispositivoId: string): Promise<ApresentacaoPartida> {
    await this.preparar();
    try {
      await BleClient.stopLEScan().catch(() => undefined);
      await BleClient.disconnect(dispositivoId).catch(() => undefined);
      await BleClient.connect(dispositivoId, () => this.notificarDesconexao(), {
        timeout: 12_000,
      });

      const apresentacaoView = await BleClient.read(
        dispositivoId,
        UUID_SERVICO_BURRO,
        UUID_CARACTERISTICA_EVENTOS,
      );
      const valor: unknown = JSON.parse(dataViewToText(apresentacaoView));
      if (!validarApresentacao(valor)) throw new Error('Apresentação da partida inválida.');

      await BleClient.startNotifications(
        dispositivoId,
        UUID_SERVICO_BURRO,
        UUID_CARACTERISTICA_EVENTOS,
        (frame) => this.receberFrame(dispositivoId, frame),
      );
      const mtu = await BleClient.getMtu(dispositivoId).catch(() => 23);
      this.tamanhoPacote = Math.max(20, Math.min(512, mtu - 3));
      this.dispositivoId = dispositivoId;
      return valor;
    } catch (erro) {
      await BleClient.disconnect(dispositivoId).catch(() => undefined);
      throw new ErroBluetooth('CONEXAO_FALHOU', 'Não foi possível conectar à partida.', erro);
    }
  }

  async desconectar(): Promise<void> {
    const dispositivoId = this.dispositivoId;
    this.dispositivoId = null;
    this.remontador.limpar();
    if (!dispositivoId) return;
    await BleClient.stopNotifications(dispositivoId, UUID_SERVICO_BURRO, UUID_CARACTERISTICA_EVENTOS).catch(() => undefined);
    await BleClient.disconnect(dispositivoId).catch(() => undefined);
  }

  async enviar(mensagem: MensagemBluetooth): Promise<void> {
    if (!this.dispositivoId) throw new ErroBluetooth('DESCONECTADO', 'Nenhum anfitrião está conectado.');
    try {
      for (const frame of fragmentar(serializarMensagem(mensagem), this.tamanhoPacote)) {
        await BleClient.write(
          this.dispositivoId,
          UUID_SERVICO_BURRO,
          UUID_CARACTERISTICA_ENVIO,
          frame,
          { timeout: 5_000 },
        );
      }
    } catch (erro) {
      throw traduzirErroBluetooth(erro);
    }
  }

  aoReceber(callback: (mensagem: MensagemBluetooth) => void): () => void {
    this.recebedores.add(callback);
    return () => this.recebedores.delete(callback);
  }

  aoDesconectar(callback: () => void): () => void {
    this.desconexoes.add(callback);
    return () => this.desconexoes.delete(callback);
  }

  private receberFrame(dispositivoId: string, frame: DataView): void {
    try {
      const completa = this.remontador.adicionar(dispositivoId, frame);
      if (!completa) return;
      const mensagem = desserializarMensagem(completa);
      for (const callback of this.recebedores) callback(mensagem);
    } catch (erro) {
      console.warn('Mensagem BLE descartada:', erro);
    }
  }

  private notificarDesconexao(): void {
    this.dispositivoId = null;
    this.remontador.limpar();
    for (const callback of this.desconexoes) callback();
  }
}

export const centralBleTransport = new CentralBleTransport();
