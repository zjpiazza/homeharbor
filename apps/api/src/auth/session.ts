import { auth } from "./better-auth.js";

export type AuthSession = typeof auth.$Infer.Session;

export async function getSession(req: Request) {
	return auth.api.getSession({ headers: req.headers });
}
