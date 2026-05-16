import { faker } from "@faker-js/faker";
import type { DeviceCategory, DeviceType } from "@prisma/client";
import { prisma } from "../../db.js";
import { inngest } from "../client.js";

export interface SeedConfig {
	numProperties?: number;
	numDevicesPerProperty?: number;
	numWorkOrdersPerProperty?: number;
	numReservationsPerProperty?: number;
	numEventsPerDevice?: number;
}

const DEFAULTS = {
	numProperties: 1,
	numDevicesPerProperty: 10,
	numWorkOrdersPerProperty: 5,
	numReservationsPerProperty: 8,
	numEventsPerDevice: 20,
};

const environmentalDevices = [
	{ name: "Living Room Thermostat", type: "THERMOSTAT" },
	{ name: "Bedroom Thermostat", type: "THERMOSTAT" },
	{ name: "Humidity Sensor", type: "WATERSENSOR" },
	{ name: "Air Quality Monitor", type: "SMOKEDETECTOR" },
	{ name: "Window Sensor", type: "WINDOWSENSOR" },
];

const securityDevices = [
	{ name: "Front Door Lock", type: "LOCK" },
	{ name: "Back Door Lock", type: "LOCK" },
	{ name: "Security Camera", type: "CAMERA" },
	{ name: "Motion Sensor", type: "MOTIONSENSOR" },
	{ name: "Doorbell Camera", type: "DOORBELL" },
];

const entertainmentDevices = [
	{ name: "Living Room Light", type: "LIGHT" },
	{ name: "Kitchen Light", type: "LIGHT" },
	{ name: "Smart Speaker", type: "SPEAKER" },
	{ name: "TV", type: "TV" },
	{ name: "Alarm", type: "ALARM" },
];

function getCategory(type: string): DeviceCategory {
	const t = type.toUpperCase();
	if (["THERMOSTAT", "WATERSENSOR", "SMOKEDETECTOR", "WINDOWSENSOR"].includes(t))
		return "ENVIRONMENTAL";
	if (["LOCK", "CAMERA", "MOTIONSENSOR", "DOORBELL"].includes(t)) return "SECURITY";
	return "ENTERTAINMENT";
}

export interface CreateTenantEvent {
	data: {
		userId: string;
		userEmail: string;
		tenantName: string;
		runId: string;
		seedConfig?: SeedConfig;
	};
}

export const createTenantAndSeedFn = inngest.createFunction(
	{ id: "create-tenant-and-seed", timeouts: { finish: "20m" }, retries: 2 },
	{ event: "tenant/create.requested" },
	async ({ event, step }: { event: CreateTenantEvent; step: any }) => {
		const { userId, userEmail, tenantName, runId, seedConfig } = event.data;

		const cfg = { ...DEFAULTS, ...seedConfig };

		// Step 1: Create tenant
		const tenant = await step.run("create-tenant", async () => {
			return prisma.tenant.create({
				data: {
					name: tenantName,
					ownerId: userId,
					metadata: {
						seedRunId: runId,
						seedStartTime: new Date().toISOString(),
						seedComplete: false,
					},
				},
			});
		});

		// Step 2: Seed properties and related data
		for (let p = 0; p < cfg.numProperties; p++) {
			await step.run(`seed-property-${p}`, async () => {
				const propertyName = faker.location.street();
				const property = await prisma.property.create({
					data: {
						name: propertyName,
						address: faker.location.streetAddress(),
						type: faker.helpers.arrayElement(["House", "Apartment", "Condo", "Villa"]),
						description: faker.lorem.paragraph(),
						ownerId: userId,
						tenantId: tenant.id,
					},
				});

				// Seed devices
				const devices = [...environmentalDevices, ...securityDevices, ...entertainmentDevices];
				const numDevices = Math.min(cfg.numDevicesPerProperty, devices.length);
				const shuffled = faker.helpers.shuffle(devices).slice(0, numDevices);

				for (const d of shuffled) {
					const device = await prisma.device.create({
						data: {
							name: d.name,
							propertyId: property.id,
							type: d.type as DeviceType,
							category: getCategory(d.type),
							capabilities: ["on", "off", "status"],
							state: { status: faker.helpers.arrayElement(["on", "off", "standby"]) },
							tenantId: tenant.id,
						},
					});

					// Seed events for device
					const events = Array.from({ length: cfg.numEventsPerDevice }).map(() => ({
						timestamp: faker.date.recent({ days: 30 }),
						type: faker.helpers.arrayElement(["status_change", "alert", "command"]),
						details: faker.lorem.sentence(),
						data: {},
						deviceId: device.id,
						tenantId: tenant.id,
					}));
					await prisma.event.createMany({ data: events });

					// Seed readings for device
					const readings = Array.from({ length: 10 }).map(() => ({
						timestamp: faker.date.recent({ days: 7 }),
						metric: faker.helpers.arrayElement(["temperature", "humidity", "battery"]),
						value: faker.number.float({ min: 0, max: 100 }),
						unit: faker.helpers.arrayElement(["°C", "%", "V"]),
						deviceId: device.id,
						tenantId: tenant.id,
					}));
					await prisma.deviceReading.createMany({ data: readings });
				}

				// Seed work orders
				const workOrders = Array.from({ length: cfg.numWorkOrdersPerProperty }).map(() => ({
					issue: faker.lorem.sentence(),
					details: faker.lorem.paragraph(),
					status: faker.helpers.arrayElement(["PENDING", "IN_PROGRESS", "COMPLETED"]),
					priority: faker.helpers.arrayElement(["LOW", "MEDIUM", "HIGH"]),
					propertyId: property.id,
					tenantId: tenant.id,
					reportedById: userId,
				}));
				await prisma.workOrder.createMany({ data: workOrders });

				// Seed reservations
				const reservations = Array.from({ length: cfg.numReservationsPerProperty }).map(() => {
					const checkIn = faker.date.future({ years: 1 });
					const checkOut = new Date(
						checkIn.getTime() + faker.number.int({ min: 1, max: 14 }) * 86400000,
					);
					return {
						propertyId: property.id,
						guestId: faker.string.alphanumeric({ length: 10 }),
						checkIn,
						checkOut,
						notes: faker.lorem.sentence(),
						tenantId: tenant.id,
					};
				});
				await prisma.reservation.createMany({ data: reservations });
			});
		}

		// Step 3: Finalize tenant metadata
		await step.run("finalize-tenant", async () => {
			await prisma.tenant.update({
				where: { id: tenant.id },
				data: {
					metadata: {
						seedRunId: runId,
						seedStartTime: new Date().toISOString(),
						seedComplete: true,
					},
				},
			});
		});

		return { tenantId: tenant.id, message: "Tenant created and seeded successfully" };
	},
);
