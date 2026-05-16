import { serve } from "inngest/hono";
import { inngest } from "./client.js";
import { functions } from "./functions/index.js";

export const inngestHandler = serve({
	client: inngest,
	functions,
});
