"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";

/**
 * The web-side face of the native `BiometricAuth` plugin.
 *
 * Everything sensitive happens on the far side of this boundary, inside
 * Android's own prompt: the app asks "is this the device owner?" and receives
 * yes or no. No biometric template is read, stored or transmitted — an app
 * cannot obtain one.
 */

export interface BiometricAvailability {
  available: boolean;
  /** True when a fingerprint or face is actually enrolled. */
  hasBiometricEnrolled: boolean;
  /** True when only the PIN/pattern/password stands behind the prompt. */
  usesDeviceCredentialFallback: boolean;
  reason: string;
}

export type BiometricFailure =
  | "userCancelled"
  | "lockout"
  | "lockoutPermanent"
  | "noneEnrolled"
  | "noHardware"
  | "unavailable"
  | "failed";

interface BiometricAuthPlugin {
  isAvailable: () => Promise<BiometricAvailability>;
  authenticate: (options: { title?: string; subtitle?: string }) => Promise<{ verified: boolean }>;
}

const plugin = registerPlugin<BiometricAuthPlugin>("BiometricAuth");

/** True only inside the Android app; the browser build has no lock to apply. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  if (!isNativeApp()) {
    return {
      available: false,
      hasBiometricEnrolled: false,
      usesDeviceCredentialFallback: false,
      reason: "Biometric unlock is only available in the Android app.",
    };
  }
  return plugin.isAvailable();
}

export interface BiometricResult {
  ok: boolean;
  code?: BiometricFailure;
  message?: string;
}

/**
 * Shows the prompt.
 *
 * Returns a result rather than throwing, because every failure path — a wrong
 * finger, a cancelled dialog, a locked-out sensor — leads to the same place:
 * the app stays locked. Callers must treat anything other than `ok` as a
 * failure; there is no branch that unlocks on error.
 */
export async function verifyBiometric(options: {
  title?: string;
  subtitle?: string;
} = {}): Promise<BiometricResult> {
  if (!isNativeApp()) return { ok: false, code: "unavailable", message: "Not running in the Android app." };

  try {
    const { verified } = await plugin.authenticate(options);
    return verified ? { ok: true } : { ok: false, code: "failed", message: "Not verified." };
  } catch (cause) {
    const error = cause as { code?: string; message?: string };
    return {
      ok: false,
      code: (error.code as BiometricFailure) ?? "failed",
      message: error.message ?? "Biometric check failed.",
    };
  }
}
