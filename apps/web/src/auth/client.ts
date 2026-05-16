import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
}) as any;

export const signIn = authClient.signIn as any;
export const signUp = authClient.signUp as any;
export const signOut = authClient.signOut as any;
export const useSession = authClient.useSession as any;
