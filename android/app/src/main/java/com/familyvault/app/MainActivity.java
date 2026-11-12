package com.familyvault.app;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
    @Override public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(FamilyVaultBackupPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
