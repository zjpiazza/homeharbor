import { createRoute } from "@tanstack/react-router";
import { trpc } from "../trpc/client.js";
import { Route as rootRoute } from "./__root.js";

export const Route = createRoute({
	getParentRoute: () => rootRoute,
	path: "/work-orders",
	component: WorkOrdersComponent,
});

function WorkOrdersComponent() {
	const { data } = trpc.workOrder.list.useQuery({ limit: 50 });

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">Work Orders</h1>
			</div>
			<div className="space-y-2">
				{data?.items.map((wo: any) => (
					<div key={wo.id} className="flex items-center justify-between rounded-lg border p-4">
						<div>
							<p className="font-medium">{wo.issue}</p>
							<p className="text-sm text-gray-500">
								{wo.property?.name ?? "Unknown"} · {wo.Device?.name ?? "No device"}
							</p>
						</div>
						<div className="flex gap-2 text-sm">
							<span className={`rounded px-2 py-1 ${priorityClass(wo.priority)}`}>
								{wo.priority}
							</span>
							<span className={`rounded px-2 py-1 ${statusClass(wo.status)}`}>{wo.status}</span>
						</div>
					</div>
				))}
				{!data?.items.length && <p className="text-gray-500">No work orders found.</p>}
			</div>
		</div>
	);
}

function priorityClass(p: string) {
	switch (p) {
		case "URGENT":
			return "bg-red-100 text-red-700";
		case "HIGH":
			return "bg-orange-100 text-orange-700";
		case "MEDIUM":
			return "bg-yellow-100 text-yellow-700";
		default:
			return "bg-gray-100 text-gray-700";
	}
}

function statusClass(s: string) {
	switch (s) {
		case "COMPLETED":
			return "bg-green-100 text-green-700";
		case "IN_PROGRESS":
			return "bg-blue-100 text-blue-700";
		case "PENDING":
			return "bg-yellow-100 text-yellow-700";
		default:
			return "bg-gray-100 text-gray-700";
	}
}
