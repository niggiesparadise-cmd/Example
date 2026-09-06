package com.studydashboard.app;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * A thin bridge to the platform's own biometric prompt.
 *
 * This plugin deliberately does nothing clever. Android already owns the whole
 * sensitive path — it enrols the fingerprint or face, matches it inside the
 * Trusted Execution Environment, and tells us only whether the match succeeded.
 * No biometric data is read, transmitted or stored here, because none of it is
 * ever available to an app in the first place.
 *
 * What the prompt protects is the session already stored on the device (see
 * {@link SecureStoragePlugin}). It is not an authentication factor for Supabase:
 * Supabase remains the only thing that decides who the user is.
 */
@CapacitorPlugin(name = "BiometricAuth")
public class BiometricAuthPlugin extends Plugin {

    /**
     * Strong biometrics (Class 3) plus the device credential.
     *
     * `DEVICE_CREDENTIAL` is what keeps requirement 6 honest on hardware with no
     * sensor, or where the user has enrolled none: instead of waving the lock
     * through, the prompt falls back to the PIN, pattern or password that
     * already guards the lock screen. Weak (Class 2) biometrics are included
     * separately below only where strong ones are unavailable, so face unlock on
     * devices that classify it as Class 2 still works.
     */
    private static final int STRONG_OR_CREDENTIAL =
        BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.DEVICE_CREDENTIAL;
    private static final int WEAK_OR_CREDENTIAL =
        BiometricManager.Authenticators.BIOMETRIC_WEAK | BiometricManager.Authenticators.DEVICE_CREDENTIAL;

    /**
     * Reports what this device can actually do, so the web layer can explain
     * itself rather than failing at the prompt.
     */
    @PluginMethod
    public void isAvailable(PluginCall call) {
        BiometricManager manager = BiometricManager.from(getContext());

        int strong = manager.canAuthenticate(STRONG_OR_CREDENTIAL);
        int weak = manager.canAuthenticate(WEAK_OR_CREDENTIAL);
        int biometricOnly = manager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK);

        boolean available =
            strong == BiometricManager.BIOMETRIC_SUCCESS || weak == BiometricManager.BIOMETRIC_SUCCESS;

        JSObject result = new JSObject();
        result.put("available", available);
        result.put("hasBiometricEnrolled", biometricOnly == BiometricManager.BIOMETRIC_SUCCESS);
        // True when the only thing standing behind the prompt is the PIN/pattern.
        result.put("usesDeviceCredentialFallback", available && biometricOnly != BiometricManager.BIOMETRIC_SUCCESS);
        result.put("reason", describe(strong == BiometricManager.BIOMETRIC_SUCCESS ? strong : weak));
        call.resolve(result);
    }

    /**
     * Shows the prompt. Resolves only on a real success; every other outcome —
     * including the user cancelling — rejects, so the caller cannot mistake a
     * dismissed dialog for a passed check.
     */
    @PluginMethod
    public void authenticate(final PluginCall call) {
        AppCompatActivity activity = getActivity();
        if (activity == null) {
            call.reject("No activity available for the biometric prompt.", "unavailable");
            return;
        }

        BiometricManager manager = BiometricManager.from(getContext());
        final int authenticators =
            manager.canAuthenticate(STRONG_OR_CREDENTIAL) == BiometricManager.BIOMETRIC_SUCCESS
                ? STRONG_OR_CREDENTIAL
                : WEAK_OR_CREDENTIAL;

        int status = manager.canAuthenticate(authenticators);
        if (status != BiometricManager.BIOMETRIC_SUCCESS) {
            call.reject(describe(status), codeFor(status));
            return;
        }

        final String title = call.getString("title", "Unlock Study Dashboard");
        final String subtitle = call.getString("subtitle", "Confirm it's you to open your dashboard.");

        BiometricPrompt.PromptInfo.Builder info = new BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .setAllowedAuthenticators(authenticators);

        // With DEVICE_CREDENTIAL among the allowed authenticators the framework
        // supplies its own "Use PIN" action, and setting a negative button too
        // is rejected at runtime.
        BiometricPrompt.PromptInfo promptInfo = info.build();

        final BiometricPrompt prompt = new BiometricPrompt(
            activity,
            ContextCompat.getMainExecutor(getContext()),
            new BiometricPrompt.AuthenticationCallback() {
                @Override
                public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                    JSObject payload = new JSObject();
                    payload.put("verified", true);
                    call.resolve(payload);
                }

                @Override
                public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                    // A cancel is an error here on purpose: the app stays locked.
                    call.reject(errString.toString(), errorCodeName(errorCode));
                }

                @Override
                public void onAuthenticationFailed() {
                    // A single non-matching finger. The prompt stays up and the
                    // user can retry, so this is not a terminal outcome — the
                    // call is left unresolved until it succeeds or errors out.
                }
            }
        );

        activity.runOnUiThread(() -> {
            try {
                prompt.authenticate(promptInfo);
            } catch (Exception error) {
                call.reject("Couldn't show the biometric prompt: " + error.getMessage(), "unavailable");
            }
        });
    }

    private static String codeFor(int status) {
        switch (status) {
            case BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED:
                return "noneEnrolled";
            case BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE:
            case BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE:
                return "noHardware";
            default:
                return "unavailable";
        }
    }

    private static String describe(int status) {
        switch (status) {
            case BiometricManager.BIOMETRIC_SUCCESS:
                return "Ready.";
            case BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE:
                return "This device has no biometric hardware.";
            case BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE:
                return "The biometric hardware is unavailable right now.";
            case BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED:
                return "No fingerprint, face or screen lock is set up on this device.";
            case BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED:
                return "A security update is required before biometrics can be used.";
            default:
                return "Biometric authentication is unavailable on this device.";
        }
    }

    /** Maps the framework's error codes onto names the web layer can branch on. */
    private static String errorCodeName(int errorCode) {
        switch (errorCode) {
            case BiometricPrompt.ERROR_USER_CANCELED:
            case BiometricPrompt.ERROR_NEGATIVE_BUTTON:
            case BiometricPrompt.ERROR_CANCELED:
                return "userCancelled";
            case BiometricPrompt.ERROR_LOCKOUT:
                return "lockout";
            case BiometricPrompt.ERROR_LOCKOUT_PERMANENT:
                return "lockoutPermanent";
            case BiometricPrompt.ERROR_NO_DEVICE_CREDENTIAL:
                return "noneEnrolled";
            case BiometricPrompt.ERROR_HW_NOT_PRESENT:
            case BiometricPrompt.ERROR_HW_UNAVAILABLE:
                return "noHardware";
            default:
                return "failed";
        }
    }
}
