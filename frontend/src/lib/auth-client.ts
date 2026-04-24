import { createAuthClient } from "better-auth/react";

const isCapacitor =
  typeof window !== 'undefined' &&
  (window.location.protocol === 'capacitor:' ||
    !!(window as any).Capacitor?.isNativePlatform?.());

export const authClient = createAuthClient({
    baseURL: isCapacitor
      ? (import.meta.env.VITE_AUTH_URL || "https://britsyncai.com")
      : (import.meta.env.VITE_AUTH_URL || ""),
    fetchOptions: {
      credentials: "include",
    },
});

export const { signIn, signUp, useSession, signOut } = authClient;

// Better-Auth maps the server route `/request-password-reset` to the client
// method `requestPasswordReset`. We alias it as `forgetPassword` so the UI
// stays readable.
export const forgetPassword = (args: { email: string; redirectTo?: string }) =>
  authClient.requestPasswordReset(args);

export const resetPassword = (args: { newPassword: string; token: string }) =>
  authClient.resetPassword(args);
