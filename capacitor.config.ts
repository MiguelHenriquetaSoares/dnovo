import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.edu.jogoburro',
  appName: 'Burro Bluetooth',
  webDir: 'dist',
  plugins: {
    BluetoothLe: {
      displayStrings: {
        scanning: 'Procurando partidas…',
        cancel: 'Cancelar',
        availableDevices: 'Partidas disponíveis',
        noDeviceFound: 'Nenhuma partida encontrada',
      },
    },
  },
};

export default config;
