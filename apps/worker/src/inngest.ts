import { Inngest } from "inngest";
import type { InngestFunction } from "inngest";

export const inngest = new Inngest({
	id: "homeharbor",
	eventKey: process.env.INNGEST_EVENT_KEY,
});

export const functions: InngestFunction.Like[] = [];
