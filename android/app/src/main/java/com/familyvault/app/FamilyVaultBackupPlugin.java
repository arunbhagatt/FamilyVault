package com.familyvault.app;

import android.content.Intent;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.*;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import java.io.OutputStream;
import java.io.IOException;

@CapacitorPlugin(name = "FamilyVaultBackup")
public class FamilyVaultBackupPlugin extends Plugin {
    private static final String PREFS = "familyvault_backup";
    private static final String TREE = "tree_uri";
    private OutputStream output;
    private Uri activeFile;

    @PluginMethod
    public void pickFolder(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(call, intent, "folderPicked");
    }

    @ActivityCallback
    private void folderPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != android.app.Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            call.reject("Folder selection cancelled"); return;
        }
        Uri uri = result.getData().getData();
        int flags = result.getData().getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        try {
            getContext().getContentResolver().takePersistableUriPermission(uri, flags);
            getContext().getSharedPreferences(PREFS, 0).edit().putString(TREE, uri.toString()).apply();
            JSObject ret = new JSObject(); ret.put("uri", uri.toString()); call.resolve(ret);
        } catch (Exception e) { call.reject("Could not retain folder permission: " + e.getMessage()); }
    }

    @PluginMethod
    public void hasFolder(PluginCall call) {
        String value = getContext().getSharedPreferences(PREFS, 0).getString(TREE, null);
        JSObject ret = new JSObject(); ret.put("selected", value != null); call.resolve(ret);
    }

    @PluginMethod
    public void startBackup(PluginCall call) {
        try {
            String tree = getContext().getSharedPreferences(PREFS, 0).getString(TREE, null);
            if (tree == null) { call.reject("Choose a backup folder first"); return; }
            Uri treeUri = Uri.parse(tree);
            String name = call.getString("fileName", "FamilyVault_Backup.fvault");
            Uri parentDocumentUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, DocumentsContract.getTreeDocumentId(treeUri));
            Uri file = DocumentsContract.createDocument(getContext().getContentResolver(), parentDocumentUri, "application/octet-stream", name);
            if (file == null) { call.reject("Android could not create the backup file"); return; }
            output = getContext().getContentResolver().openOutputStream(file, "w");
            if (output == null) { call.reject("Could not open the backup destination"); return; }
            activeFile = file;
            JSObject ret = new JSObject(); ret.put("uri", file.toString()); call.resolve(ret);
        } catch (Exception e) { closeOutput(); call.reject("Could not start backup: " + e.getMessage()); }
    }

    @PluginMethod
    public void appendBackupChunk(PluginCall call) {
        try {
            if (output == null) { call.reject("No backup file is open"); return; }
            String encoded = call.getString("base64");
            if (encoded == null) { call.reject("Missing backup data"); return; }
            byte[] bytes = Base64.decode(encoded, Base64.DEFAULT); output.write(bytes);
            JSObject ret = new JSObject(); ret.put("written", bytes.length); call.resolve(ret);
        } catch (Exception e) { call.reject("Could not write backup data: " + e.getMessage()); }
    }

    @PluginMethod
    public void finishBackup(PluginCall call) {
        try {
            if (output != null) { output.flush(); output.close(); output = null; }
            JSObject ret = new JSObject(); ret.put("uri", activeFile == null ? "" : activeFile.toString());
            call.resolve(ret); activeFile = null;
        } catch (Exception e) { closeOutput(); call.reject("Could not finish backup: " + e.getMessage()); }
    }

    private void closeOutput() { try { if (output != null) output.close(); } catch (IOException ignored) {} output = null; }
    @Override protected void handleOnDestroy() { closeOutput(); super.handleOnDestroy(); }
}
