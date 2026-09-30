package br.edu.jogoburro;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.bluetooth.BluetoothGattServer;
import android.bluetooth.BluetoothGattServerCallback;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothProfile;
import android.bluetooth.BluetoothStatusCodes;
import android.bluetooth.le.AdvertiseCallback;
import android.bluetooth.le.AdvertiseData;
import android.bluetooth.le.AdvertiseSettings;
import android.bluetooth.le.BluetoothLeAdvertiser;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelUuid;
import android.util.Base64;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@CapacitorPlugin(
    name = "BurroBlePeripheral",
    permissions = {
        @Permission(
            alias = "nearby",
            strings = { Manifest.permission.BLUETOOTH_ADVERTISE, Manifest.permission.BLUETOOTH_CONNECT }
        )
    }
)
@SuppressWarnings("deprecation")
public class BurroBlePeripheralPlugin extends Plugin {

    private static final UUID SERVICE_UUID = UUID.fromString("7b757272-6f00-4a6f-676f-427572726f01");
    private static final UUID INPUT_UUID = UUID.fromString("7b757272-6f00-4a6f-676f-427572726f02");
    private static final UUID EVENTS_UUID = UUID.fromString("7b757272-6f00-4a6f-676f-427572726f03");
    private static final UUID CCCD_UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");
    private static final int MAX_PACKET_BYTES = 512;

    private final Map<String, BluetoothDevice> connectedDevices = new ConcurrentHashMap<>();
    private final Set<String> subscribedDevices = ConcurrentHashMap.newKeySet();
    private final Map<String, PluginCall> pendingNotifications = new ConcurrentHashMap<>();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private BluetoothManager bluetoothManager;
    private BluetoothAdapter bluetoothAdapter;
    private BluetoothGattServer gattServer;
    private BluetoothGattCharacteristic eventCharacteristic;
    private BluetoothLeAdvertiser advertiser;
    private AdvertiseCallback advertiseCallback;
    private PluginCall pendingStartCall;
    private byte[] presentationValue = new byte[0];
    private boolean advertising;

    private final BroadcastReceiver bluetoothStateReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (!BluetoothAdapter.ACTION_STATE_CHANGED.equals(intent.getAction())) return;
            int state = intent.getIntExtra(BluetoothAdapter.EXTRA_STATE, BluetoothAdapter.ERROR);
            JSObject data = new JSObject();
            data.put("enabled", state == BluetoothAdapter.STATE_ON);
            notifyListeners("bluetoothStateChanged", data);
            if (state == BluetoothAdapter.STATE_OFF) closeServer("Bluetooth desligado.");
        }
    };

    @Override
    public void load() {
        bluetoothManager = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        bluetoothAdapter = bluetoothManager == null ? null : bluetoothManager.getAdapter();
        IntentFilter filter = new IntentFilter(BluetoothAdapter.ACTION_STATE_CHANGED);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(bluetoothStateReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(bluetoothStateReceiver, filter);
        }
    }

    @PluginMethod
    public void requestNearbyPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || getPermissionState("nearby") == PermissionState.GRANTED) {
            resolvePermission(call);
            return;
        }
        requestPermissionForAlias("nearby", call, "nearbyPermissionsCallback");
    }

    @PermissionCallback
    private void nearbyPermissionsCallback(PluginCall call) {
        resolvePermission(call);
    }

    private void resolvePermission(PluginCall call) {
        boolean granted = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || getPermissionState("nearby") == PermissionState.GRANTED;
        JSObject result = new JSObject();
        result.put("granted", granted);
        call.resolve(result);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject result = new JSObject();
        boolean supported = getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE);
        boolean enabled = false;
        boolean peripheralSupported = false;
        try {
            enabled = bluetoothAdapter != null && bluetoothAdapter.isEnabled();
            peripheralSupported = bluetoothAdapter != null && bluetoothAdapter.isMultipleAdvertisementSupported();
        } catch (SecurityException ignored) {
            // O chamador usa requestNearbyPermissions antes de operações protegidas.
        }
        result.put("supported", supported);
        result.put("enabled", enabled);
        result.put("peripheralSupported", peripheralSupported);
        result.put("advertising", advertising);
        result.put("connectedCount", connectedDevices.size());
        call.resolve(result);
    }

    @PluginMethod
    public void startAdvertising(PluginCall call) {
        if (!hasNearbyPermission()) {
            call.reject("Permissão para dispositivos próximos foi negada.", "PERMISSION_DENIED");
            return;
        }
        if (bluetoothAdapter == null || !getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE)) {
            call.reject("Bluetooth LE não está disponível neste aparelho.", "BLE_UNSUPPORTED");
            return;
        }
        try {
            if (!bluetoothAdapter.isEnabled()) {
                call.reject("Bluetooth está desligado.", "BLUETOOTH_DISABLED");
                return;
            }
            if (!bluetoothAdapter.isMultipleAdvertisementSupported()) {
                call.reject("Este aparelho não suporta anúncio BLE.", "ADVERTISING_UNSUPPORTED");
                return;
            }

            String matchId = call.getString("matchId");
            String hostId = call.getString("hostId");
            String name = call.getString("name");
            if (matchId == null || hostId == null || name == null) {
                call.reject("Apresentação da partida incompleta.", "INVALID_ARGUMENT");
                return;
            }

            closeServer("Novo anúncio iniciado.");
            JSObject presentation = new JSObject();
            presentation.put("partidaId", matchId);
            presentation.put("anfitriaoId", hostId);
            presentation.put("nome", name);
            presentation.put("versaoProtocolo", 1);
            presentationValue = presentation.toString().getBytes(StandardCharsets.UTF_8);

            gattServer = bluetoothManager.openGattServer(getContext(), gattCallback);
            if (gattServer == null) {
                call.reject("Não foi possível abrir o servidor GATT.", "GATT_SERVER_FAILED");
                return;
            }

            BluetoothGattService service = new BluetoothGattService(SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY);
            BluetoothGattCharacteristic input = new BluetoothGattCharacteristic(
                INPUT_UUID,
                BluetoothGattCharacteristic.PROPERTY_WRITE | BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE,
                BluetoothGattCharacteristic.PERMISSION_WRITE
            );
            eventCharacteristic = new BluetoothGattCharacteristic(
                EVENTS_UUID,
                BluetoothGattCharacteristic.PROPERTY_READ | BluetoothGattCharacteristic.PROPERTY_NOTIFY,
                BluetoothGattCharacteristic.PERMISSION_READ
            );
            BluetoothGattDescriptor cccd = new BluetoothGattDescriptor(
                CCCD_UUID,
                BluetoothGattDescriptor.PERMISSION_READ | BluetoothGattDescriptor.PERMISSION_WRITE
            );
            eventCharacteristic.addDescriptor(cccd);
            service.addCharacteristic(input);
            service.addCharacteristic(eventCharacteristic);

            pendingStartCall = call;
            if (!gattServer.addService(service)) {
                pendingStartCall = null;
                closeServer("Falha ao publicar serviço GATT.");
                call.reject("Não foi possível publicar o serviço GATT.", "GATT_SERVICE_FAILED");
            }
        } catch (SecurityException error) {
            call.reject("Permissão Bluetooth insuficiente.", "PERMISSION_DENIED", error);
        }
    }

    private void beginAdvertising() {
        PluginCall call = pendingStartCall;
        if (call == null) return;
        try {
            advertiser = bluetoothAdapter.getBluetoothLeAdvertiser();
            if (advertiser == null) {
                pendingStartCall = null;
                call.reject("Anúncio BLE indisponível.", "ADVERTISING_UNSUPPORTED");
                return;
            }
            AdvertiseSettings settings = new AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM)
                .setConnectable(true)
                .setTimeout(0)
                .build();
            AdvertiseData data = new AdvertiseData.Builder()
                .setIncludeDeviceName(false)
                .addServiceUuid(new ParcelUuid(SERVICE_UUID))
                .build();
            advertiseCallback = new AdvertiseCallback() {
                @Override
                public void onStartSuccess(AdvertiseSettings settingsInEffect) {
                    advertising = true;
                    pendingStartCall = null;
                    call.resolve();
                }

                @Override
                public void onStartFailure(int errorCode) {
                    advertising = false;
                    pendingStartCall = null;
                    call.reject(advertiseError(errorCode), "ADVERTISING_FAILED_" + errorCode);
                }
            };
            advertiser.startAdvertising(settings, data, advertiseCallback);
        } catch (SecurityException error) {
            pendingStartCall = null;
            call.reject("Permissão para anunciar foi negada.", "PERMISSION_DENIED", error);
        }
    }

    @PluginMethod
    public void stopAdvertising(PluginCall call) {
        stopAdvertiser();
        call.resolve();
    }

    @PluginMethod
    public void sendPacket(PluginCall call) {
        String deviceId = call.getString("deviceId");
        String encoded = call.getString("data");
        if (deviceId == null || encoded == null) {
            call.reject("Pacote ou dispositivo ausente.", "INVALID_ARGUMENT");
            return;
        }
        BluetoothDevice device = connectedDevices.get(deviceId);
        if (device == null || gattServer == null || eventCharacteristic == null) {
            call.reject("Dispositivo não está conectado.", "DEVICE_DISCONNECTED");
            return;
        }
        if (!subscribedDevices.contains(deviceId)) {
            call.reject("Dispositivo ainda não assinou as notificações.", "NOTIFICATIONS_NOT_READY");
            return;
        }
        if (pendingNotifications.putIfAbsent(deviceId, call) != null) {
            call.reject("Há uma notificação pendente para este dispositivo.", "NOTIFICATION_BUSY");
            return;
        }

        byte[] value;
        try {
            value = Base64.decode(encoded, Base64.NO_WRAP);
        } catch (IllegalArgumentException error) {
            pendingNotifications.remove(deviceId);
            call.reject("Pacote base64 inválido.", "INVALID_ARGUMENT", error);
            return;
        }
        if (value.length == 0 || value.length > MAX_PACKET_BYTES) {
            pendingNotifications.remove(deviceId);
            call.reject("Tamanho de pacote inválido.", "INVALID_ARGUMENT");
            return;
        }

        try {
            boolean queued;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                queued = gattServer.notifyCharacteristicChanged(device, eventCharacteristic, false, value) == BluetoothStatusCodes.SUCCESS;
            } else {
                eventCharacteristic.setValue(value);
                queued = gattServer.notifyCharacteristicChanged(device, eventCharacteristic, false);
            }
            if (!queued) {
                pendingNotifications.remove(deviceId);
                call.reject("O Android recusou a notificação BLE.", "NOTIFICATION_FAILED");
                return;
            }
            mainHandler.postDelayed(() -> {
                PluginCall pending = pendingNotifications.remove(deviceId);
                if (pending != null) pending.reject("Tempo esgotado ao enviar notificação.", "NOTIFICATION_TIMEOUT");
            }, 5_000);
        } catch (SecurityException error) {
            pendingNotifications.remove(deviceId);
            call.reject("Permissão Bluetooth insuficiente.", "PERMISSION_DENIED", error);
        }
    }

    @PluginMethod
    public void disconnectAll(PluginCall call) {
        if (gattServer != null) {
            try {
                for (BluetoothDevice device : new ArrayList<>(connectedDevices.values())) gattServer.cancelConnection(device);
            } catch (SecurityException error) {
                call.reject("Permissão Bluetooth insuficiente.", "PERMISSION_DENIED", error);
                return;
            }
        }
        call.resolve();
    }

    private final BluetoothGattServerCallback gattCallback = new BluetoothGattServerCallback() {
        @Override
        public void onServiceAdded(int status, BluetoothGattService service) {
            if (status == BluetoothGatt.GATT_SUCCESS && SERVICE_UUID.equals(service.getUuid())) {
                beginAdvertising();
            } else if (pendingStartCall != null) {
                PluginCall call = pendingStartCall;
                pendingStartCall = null;
                call.reject("Android recusou o serviço GATT: " + status, "GATT_SERVICE_FAILED");
            }
        }

        @Override
        public void onConnectionStateChange(BluetoothDevice device, int status, int newState) {
            String deviceId = device.getAddress();
            boolean connected = status == BluetoothGatt.GATT_SUCCESS && newState == BluetoothProfile.STATE_CONNECTED;
            if (connected) connectedDevices.put(deviceId, device);
            else {
                connectedDevices.remove(deviceId);
                subscribedDevices.remove(deviceId);
                PluginCall pending = pendingNotifications.remove(deviceId);
                if (pending != null) pending.reject("Dispositivo desconectado durante o envio.", "DEVICE_DISCONNECTED");
            }
            JSObject event = new JSObject();
            event.put("deviceId", deviceId);
            event.put("connected", connected);
            event.put("status", status);
            notifyListeners("connectionChanged", event);
        }

        @Override
        public void onCharacteristicReadRequest(
            BluetoothDevice device,
            int requestId,
            int offset,
            BluetoothGattCharacteristic characteristic
        ) {
            if (!EVENTS_UUID.equals(characteristic.getUuid()) || offset < 0 || offset > presentationValue.length) {
                gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_INVALID_OFFSET, offset, null);
                return;
            }
            byte[] response = new byte[presentationValue.length - offset];
            System.arraycopy(presentationValue, offset, response, 0, response.length);
            gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, response);
        }

        @Override
        public void onCharacteristicWriteRequest(
            BluetoothDevice device,
            int requestId,
            BluetoothGattCharacteristic characteristic,
            boolean preparedWrite,
            boolean responseNeeded,
            int offset,
            byte[] value
        ) {
            boolean valid = INPUT_UUID.equals(characteristic.getUuid()) && !preparedWrite && offset == 0 && value != null && value.length > 0;
            if (responseNeeded) {
                gattServer.sendResponse(
                    device,
                    requestId,
                    valid ? BluetoothGatt.GATT_SUCCESS : BluetoothGatt.GATT_REQUEST_NOT_SUPPORTED,
                    offset,
                    null
                );
            }
            if (!valid) return;
            JSObject event = new JSObject();
            event.put("deviceId", device.getAddress());
            event.put("data", Base64.encodeToString(value, Base64.NO_WRAP));
            notifyListeners("packetReceived", event);
        }

        @Override
        public void onDescriptorReadRequest(BluetoothDevice device, int requestId, int offset, BluetoothGattDescriptor descriptor) {
            byte[] value = subscribedDevices.contains(device.getAddress())
                ? BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                : BluetoothGattDescriptor.DISABLE_NOTIFICATION_VALUE;
            gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, value);
        }

        @Override
        public void onDescriptorWriteRequest(
            BluetoothDevice device,
            int requestId,
            BluetoothGattDescriptor descriptor,
            boolean preparedWrite,
            boolean responseNeeded,
            int offset,
            byte[] value
        ) {
            boolean valid = CCCD_UUID.equals(descriptor.getUuid()) && !preparedWrite && offset == 0;
            if (valid && java.util.Arrays.equals(value, BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE)) {
                subscribedDevices.add(device.getAddress());
            } else if (valid) {
                subscribedDevices.remove(device.getAddress());
            }
            if (responseNeeded) {
                gattServer.sendResponse(device, requestId, valid ? BluetoothGatt.GATT_SUCCESS : BluetoothGatt.GATT_REQUEST_NOT_SUPPORTED, offset, null);
            }
        }

        @Override
        public void onNotificationSent(BluetoothDevice device, int status) {
            PluginCall call = pendingNotifications.remove(device.getAddress());
            if (call == null) return;
            if (status == BluetoothGatt.GATT_SUCCESS) call.resolve();
            else call.reject("Falha GATT ao notificar: " + status, "NOTIFICATION_FAILED");
        }
    };

    private boolean hasNearbyPermission() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.S || getPermissionState("nearby") == PermissionState.GRANTED;
    }

    private String advertiseError(int code) {
        switch (code) {
            case AdvertiseCallback.ADVERTISE_FAILED_DATA_TOO_LARGE:
                return "Dados do anúncio BLE excedem o limite.";
            case AdvertiseCallback.ADVERTISE_FAILED_TOO_MANY_ADVERTISERS:
                return "O aparelho atingiu o limite de anúncios BLE.";
            case AdvertiseCallback.ADVERTISE_FAILED_ALREADY_STARTED:
                return "O anúncio BLE já foi iniciado.";
            case AdvertiseCallback.ADVERTISE_FAILED_FEATURE_UNSUPPORTED:
                return "Anúncio BLE não é suportado neste aparelho.";
            default:
                return "Falha ao iniciar anúncio BLE (" + code + ").";
        }
    }

    private void closeServer(String reason) {
        if (pendingStartCall != null) {
            pendingStartCall.reject(reason, "SERVER_CLOSED");
            pendingStartCall = null;
        }
        stopAdvertiser();
        try {
            if (gattServer != null) gattServer.close();
        } catch (SecurityException ignored) {
            // O estado local ainda deve ser limpo se a permissão for revogada.
        }
        gattServer = null;
        eventCharacteristic = null;
        advertising = false;
        connectedDevices.clear();
        subscribedDevices.clear();
        for (PluginCall call : pendingNotifications.values()) call.reject(reason, "SERVER_CLOSED");
        pendingNotifications.clear();
    }

    private void stopAdvertiser() {
        try {
            if (advertiser != null && advertiseCallback != null) advertiser.stopAdvertising(advertiseCallback);
        } catch (SecurityException ignored) {
            // O estado local ainda deve ser limpo se a permissão for revogada.
        }
        advertiser = null;
        advertiseCallback = null;
        advertising = false;
    }

    @Override
    protected void handleOnDestroy() {
        closeServer("Aplicativo encerrado.");
        try {
            getContext().unregisterReceiver(bluetoothStateReceiver);
        } catch (IllegalArgumentException ignored) {
            // Receiver já removido.
        }
    }
}
