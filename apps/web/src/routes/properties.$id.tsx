import { createRoute } from "@tanstack/react-router";
import { trpc } from "../trpc/client.js";
import { Route as rootRoute } from "./__root.js";

export const Route = createRoute({
	getParentRoute: () => rootRoute,
	path: "/properties/$id",
	component: PropertyDetailComponent,
});

function PropertyDetailComponent() {
	const id = window.location.pathname.split("/").pop() ?? "";
	const utils = trpc.useUtils();
	const { data } = trpc.property.getById.useQuery({ id });
	const property = data as any;
	const triggerAnomaly = trpc.anomalyReport.triggerDetection.useMutation({
		onSuccess: () => {
			alert("Anomaly detection triggered. Check the Anomalies page in a moment.");
		},
	});

	if (!property) {
		return <div className="p-4">Loading...</div>;
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">{property.name}</h1>
					<p className="text-gray-500">{property.address}</p>
				</div>
				<div className="flex gap-2">
					<span className="rounded bg-blue-100 px-3 py-1 text-sm text-blue-700">
						{property.type ?? "Property"}
					</span>
					<button
						type="button"
						onClick={() => triggerAnomaly.mutate({ propertyId: id })}
						className="rounded bg-amber-100 px-3 py-1 text-sm text-amber-700 hover:bg-amber-200"
					>
						Scan Anomalies
					</button>
				</div>
			</div>

			<div className="grid gap-6 md:grid-cols-3">
				<StatCard title="Devices" count={property.devices?.length ?? 0} />
				<StatCard title="Reservations" count={property.reservations?.length ?? 0} />
				<StatCard title="Work Orders" count={property.workOrders?.length ?? 0} />
			</div>

			{property.description && (
				<div className="rounded-lg border p-4">
					<h2 className="mb-2 font-semibold">Description</h2>
					<p className="text-gray-600">{property.description}</p>
				</div>
			)}

			<div className="rounded-lg border p-4">
				<h2 className="mb-2 font-semibold">Devices</h2>
				<div className="space-y-2">
					{property.devices?.map((d: any) => (
						<div key={d.id} className="flex items-center justify-between rounded border p-2">
							<span>{d.name}</span>
							<span className="text-sm text-gray-500">
								{d.type} · {d.category}
							</span>
						</div>
					))}
					{!property.devices?.length && <p className="text-gray-500">No devices.</p>}
				</div>
			</div>
		</div>
	);
}

function StatCard({ title, count }: { title: string; count: number }) {
	return (
		<div className="rounded-lg border p-4 text-center">
			<p className="text-2xl font-bold">{count}</p>
			<p className="text-sm text-gray-500">{title}</p>
		</div>
	);
}
