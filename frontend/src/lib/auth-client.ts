import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: import.meta.env.VITE_AUTH_URL || "" 
});

export const { signIn, signUp, useSession, signOut } = authClient;

// Better-Auth maps the server route `/request-password-reset` to the client
// method `requestPasswordReset`. We alias it as `forgetPassword` so the UI
// stays readable.
export const forgetPassword = (args: { email: string; redirectTo?: string }) =>
  authClient.requestPasswordReset(args);

export const resetPassword = (args: { newPassword: string; token: string }) =>
  authClient.resetPassword(args);
