import { z } from "zod";

const envSchema = z.object({
	DATABASE_URL: z.string().url(),
	BETTER_AUTH_SECRET: z.string().min(1),
	BETTER_AUTH_URL: z.string().url(),
	INTERNAL_REQUEST_SECRET: z.string().min(1),
	PERMIT_API_KEY: z.string().min(1),
	PERMIT_PDP_URL: z.string().url(),
	INNGEST_BASE_URL: z.string().url(),
	INNGEST_EVENT_KEY: z.string().min(1),
	INNGEST_SIGNING_KEY: z.string().min(1),
	OPENAI_API_KEY: z.string().min(1),
	S3_ENDPOINT: z.string().url(),
	S3_BUCKET: z.string().min(1),
	S3_ACCESS_KEY_ID: z.string().min(1),
	S3_SECRET_ACCESS_KEY: z.string().min(1),
	S3_REGION: z.string().default("us-east-1"),
	S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).default("true"),
	AGENT_IDENTITY: z.string().min(1),
	NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
	PORT: z.string().default("3000"),
});

export const env = envSchema.parse(process.env);
