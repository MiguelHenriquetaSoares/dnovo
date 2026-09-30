package br.edu.jogoburro;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(BurroBlePeripheralPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
