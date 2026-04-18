import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5010"
});

export const { signIn, signUp, useSession, signOut } = authClient;
