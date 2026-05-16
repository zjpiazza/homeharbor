import { prisma } from "../../db.js";
import { inngest } from "../client.js";

export const detectAnomaliesFn = inngest.createFunction(
	{ id: "detect-anomalies", retries: 2 },
	{ event: "anomaly/detection.requested" },
	async ({ event, step }: { event: any; step: any }) => {
		const { propertyId, tenantId } = event.data;

		// Create a detection job record
		const job = await step.run("create-job", async () => {
			return prisma.anomalyDetectionJob.create({
				data: {
					propertyId,
					tenantId,
					triggerType: "MANUAL",
					status: "RUNNING",
					startedAt: new Date(),
				},
			});
		});

		// Fetch devices for the property
		const devices = await step.run("fetch-devices", async () => {
			return prisma.device.findMany({
				where: { propertyId, tenantId },
				include: { deviceReadings: { orderBy: { timestamp: "desc" }, take: 10 } },
			});
		});

		// Simple anomaly detection: flag devices with no recent readings
		const findings: Array<{
			deviceId: string;
			metric: string;
			description: string;
			severity: string;
		}> = [];
		for (const device of devices) {
			const lastReading = device.deviceReadings[0];
			const hoursSinceReading = lastReading
				? (Date.now() - lastReading.timestamp.getTime()) / (1000 * 60 * 60)
				: Number.POSITIVE_INFINITY;

			if (hoursSinceReading > 24) {
				findings.push({
					deviceId: device.id,
					metric: "connectivity",
					description: `Device has not reported readings for ${Math.round(hoursSinceReading)} hours`,
					severity: hoursSinceReading > 72 ? "critical" : "warning",
				});
			}

			// Check for out-of-range values
			for (const reading of device.deviceReadings) {
				if (reading.metric === "temperature" && (reading.value > 35 || reading.value < 5)) {
					findings.push({
						deviceId: device.id,
						metric: "temperature",
						description: `Temperature reading ${reading.value}°C is outside normal range`,
						severity: reading.value > 40 || reading.value < 0 ? "critical" : "warning",
					});
				}
				if (reading.metric === "battery" && reading.value < 20) {
					findings.push({
						deviceId: device.id,
						metric: "battery",
						description: `Battery level at ${reading.value}%`,
						severity: reading.value < 10 ? "critical" : "warning",
					});
				}
			}
		}

		// Create anomaly report
		const report = await step.run("create-report", async () => {
			return prisma.anomalyReport.create({
				data: {
					propertyId,
					tenantId,
					triggerType: "MANUAL",
					status: findings.length > 0 ? "NEW" : "COMPLETED",
					anomalyDetectionJob: { connect: { id: job.id } },
					findings: {
						create: findings.map((f) => ({
							device: { connect: { id: f.deviceId } },
							metric: f.metric,
							description: f.description,
							severity: f.severity,
							tenant: { connect: { id: tenantId } },
							suggestedCommand: undefined,
						})),
					},
				},
			});
		});

		// Finalize job
		await step.run("finalize-job", async () => {
			return prisma.anomalyDetectionJob.update({
				where: { id: job.id },
				data: {
					status: "COMPLETED",
					completedAt: new Date(),
					anomalyReportId: report.id,
				},
			});
		});

		return { reportId: report.id, findingsCount: findings.length };
	},
);
