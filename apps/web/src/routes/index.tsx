import { createRoute } from "@tanstack/react-router";
import { trpc } from "../trpc/client.js";
import { Route as rootRoute } from "./__root.js";

export const Route = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: DashboardComponent,
});

function DashboardComponent() {
	const { data: properties } = trpc.property.list.useQuery({ limit: 5 });
	const { data: devices } = trpc.device.list.useQuery({ limit: 5 });
	const { data: workOrders } = trpc.workOrder.list.useQuery({ limit: 5 });
	const { data: reservations } = trpc.reservation.list.useQuery({ limit: 5 });
	const { data: statusCounts } = trpc.device.getStatusCountsByTenant.useQuery();

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-bold">Dashboard</h1>

			<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
				<SummaryCard title="Properties" value={properties?.items.length ?? 0} />
				<SummaryCard title="Devices" value={statusCounts?.total ?? 0} />
				<SummaryCard title="Work Orders" value={workOrders?.items.length ?? 0} />
				<SummaryCard title="Reservations" value={reservations?.items.length ?? 0} />
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				<ListCard title="Recent Properties">
					{properties?.items.map((p: any) => (
						<li key={p.id} className="flex items-center justify-between border-b py-2">
							<span>{p.name}</span>
							<span className="text-sm text-gray-500">{p.address}</span>
						</li>
					))}
					{!properties?.items.length && <li className="py-2 text-gray-500">No properties yet.</li>}
				</ListCard>

				<ListCard title="Recent Devices">
					{devices?.items.map((d: any) => (
						<li key={d.id} className="flex items-center justify-between border-b py-2">
							<span>{d.name}</span>
							<span className="text-sm text-gray-500">{d.type}</span>
						</li>
					))}
					{!devices?.items.length && <li className="py-2 text-gray-500">No devices yet.</li>}
				</ListCard>

				<ListCard title="Recent Work Orders">
					{workOrders?.items.map((wo: any) => (
						<li key={wo.id} className="flex items-center justify-between border-b py-2">
							<span>{wo.issue}</span>
							<span className={`text-sm ${statusColor(wo.status)}`}>{wo.status}</span>
						</li>
					))}
					{!workOrders?.items.length && <li className="py-2 text-gray-500">No work orders yet.</li>}
				</ListCard>

				<ListCard title="Upcoming Reservations">
					{reservations?.items.map((r: any) => (
						<li key={r.id} className="flex items-center justify-between border-b py-2">
							<span>{r.property?.name ?? "Unknown"}</span>
							<span className="text-sm text-gray-500">
								{new Date(r.checkIn).toLocaleDateString()} -{" "}
								{new Date(r.checkOut).toLocaleDateString()}
							</span>
						</li>
					))}
					{!reservations?.items.length && (
						<li className="py-2 text-gray-500">No reservations yet.</li>
					)}
				</ListCard>
			</div>
		</div>
	);
}

function SummaryCard({ title, value }: { title: string; value: number }) {
	return (
		<div className="rounded-lg border p-4">
			<p className="text-sm text-gray-600">{title}</p>
			<p className="text-2xl font-bold">{value}</p>
		</div>
	);
}

function ListCard({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="rounded-lg border p-4">
			<h2 className="mb-2 font-semibold">{title}</h2>
			<ul>{children}</ul>
		</div>
	);
}

function statusColor(status: string) {
	switch (status) {
		case "COMPLETED":
			return "text-green-600";
		case "IN_PROGRESS":
			return "text-blue-600";
		case "PENDING":
			return "text-yellow-600";
		default:
			return "text-gray-500";
	}
}
