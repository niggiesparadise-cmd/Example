package com.studydashboard.app;

import android.content.SharedPreferences;

import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Keystore-backed storage for the Supabase session.
 *
 * The WebView's `localStorage` — where supabase-js keeps its tokens by default —
 * is an unencrypted SQLite file in the app's data directory. That is fine on a
 * healthy device, where app sandboxing protects it, but it is plainly "plain
 * storage": on a rooted phone, or through an `adb backup` of a debuggable
 * build, the access and refresh tokens are readable as text.
 *
 * `EncryptedSharedPreferences` encrypts both keys and values with a master key
 * held in the Android Keystore, which is hardware-backed where the device has a
 * TEE or StrongBox. The app never sees the master key itself.
 *
 * This stores the *session*, never the password: the password is sent straight
 * to Supabase at sign-in and is not retained anywhere on the device.
 */
@CapacitorPlugin(name = "SecureStorage")
public class SecureStoragePlugin extends Plugin {

    private static final String FILE_NAME = "study_dashboard_secure_session";

    private SharedPreferences preferences;

    @Override
    public void load() {
        try {
            MasterKey masterKey = new MasterKey.Builder(getContext())
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build();

            preferences = EncryptedSharedPreferences.create(
                getContext(),
                FILE_NAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            );
        } catch (Exception error) {
            // Leaving `preferences` null makes every method below reject, which
            // the web layer turns into a refusal to hold a session on this
            // device — rather than quietly falling back to unencrypted storage.
            preferences = null;
        }
    }

    @PluginMethod
    public void get(PluginCall call) {
        String key = call.getString("key");
        if (key == null) {
            call.reject("A key is required.", "badRequest");
            return;
        }
        if (unavailable(call)) return;

        JSObject result = new JSObject();
        result.put("value", preferences.getString(key, null));
        call.resolve(result);
    }

    @PluginMethod
    public void set(PluginCall call) {
        String key = call.getString("key");
        String value = call.getString("value");
        if (key == null || value == null) {
            call.reject("A key and value are required.", "badRequest");
            return;
        }
        if (unavailable(call)) return;

        // `commit` rather than `apply`: the caller is told whether the write
        // actually landed, instead of it failing silently on a later flush.
        if (preferences.edit().putString(key, value).commit()) {
            call.resolve();
        } else {
            call.reject("Couldn't write to secure storage.", "writeFailed");
        }
    }

    @PluginMethod
    public void remove(PluginCall call) {
        String key = call.getString("key");
        if (key == null) {
            call.reject("A key is required.", "badRequest");
            return;
        }
        if (unavailable(call)) return;

        preferences.edit().remove(key).commit();
        call.resolve();
    }

    /** Wipes every stored key. Used when the user signs out. */
    @PluginMethod
    public void clear(PluginCall call) {
        if (unavailable(call)) return;
        preferences.edit().clear().commit();
        call.resolve();
    }

    private boolean unavailable(PluginCall call) {
        if (preferences == null) {
            call.reject("Secure storage is unavailable on this device.", "unavailable");
            return true;
        }
        return false;
    }
}
