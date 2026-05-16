import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc.js";

export const roleRouter = createTRPCRouter({
	list: protectedProcedure.query(async () => {
		return [
			{ id: "owner", name: "Owner", description: "Full access to tenant" },
			{ id: "manager", name: "Manager", description: "Can manage properties and devices" },
			{ id: "maintenance", name: "Maintenance", description: "Can manage work orders" },
			{ id: "guest", name: "Guest", description: "Can view reservations" },
		];
	}),
});
