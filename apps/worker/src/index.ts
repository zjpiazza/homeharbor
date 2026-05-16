import { createServer } from "node:http";
import { serve } from "inngest/node";
import { functions, inngest } from "./inngest.js";

const handler = serve({
	client: inngest,
	functions,
});

const port = Number(process.env.PORT) || 3001;

const server = createServer(handler);
server.listen(port, () => {
	console.log(`Worker listening on http://localhost:${port}`);
});
