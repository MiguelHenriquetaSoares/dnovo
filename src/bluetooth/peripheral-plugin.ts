import { registerPlugin, type PermissionState, type PluginListenerHandle } from '@capacitor/core';

export interface PeripheralStatus {
  supported: boolean;
  enabled: boolean;
  peripheralSupported: boolean;
  advertising: boolean;
  connectedCount: number;
}

interface BurroBlePeripheralPlugin {
  requestNearbyPermissions(): Promise<{ granted: boolean }>;
  checkPermissions(): Promise<{ nearby: PermissionState }>;
  getStatus(): Promise<PeripheralStatus>;
  startAdvertising(options: { matchId: string; hostId: string; name: string }): Promise<void>;
  stopAdvertising(): Promise<void>;
  sendPacket(options: { deviceId: string; data: string }): Promise<void>;
  disconnectAll(): Promise<void>;
  addListener(
    eventName: 'packetReceived',
    listener: (event: { deviceId: string; data: string }) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'connectionChanged',
    listener: (event: { deviceId: string; connected: boolean; status: number }) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'bluetoothStateChanged',
    listener: (event: { enabled: boolean }) => void,
  ): Promise<PluginListenerHandle>;
}

export const BurroBlePeripheral = registerPlugin<BurroBlePeripheralPlugin>('BurroBlePeripheral');
