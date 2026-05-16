import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
	console.log("Seeding database...");

	const tenant = await prisma.tenant.create({
		data: {
			name: "Demo Tenant",
			ownerId: "demo-owner-id",
		},
	});

	const property = await prisma.property.create({
		data: {
			name: "Demo Property",
			address: "123 Demo Street",
			type: "House",
			ownerId: "demo-owner-id",
			tenantId: tenant.id,
		},
	});

	await prisma.device.create({
		data: {
			name: "Living Room Thermostat",
			type: "THERMOSTAT",
			category: "ENVIRONMENTAL",
			propertyId: property.id,
			tenantId: tenant.id,
		},
	});

	console.log("Seed complete.");
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
