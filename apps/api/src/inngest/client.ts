import { Inngest } from "inngest";

export const inngest = new Inngest({
	id: "homeharbor",
	eventKey: process.env.INNGEST_EVENT_KEY,
});
