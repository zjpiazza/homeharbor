import { createRoute } from "@tanstack/react-router";
import { trpc } from "../trpc/client.js";
import { Route as rootRoute } from "./__root.js";

export const Route = createRoute({
	getParentRoute: () => rootRoute,
	path: "/anomaly-reports",
	component: AnomalyReportsComponent,
});

function AnomalyReportsComponent() {
	const { data } = trpc.anomalyReport.list.useQuery({ limit: 50 });

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">Anomaly Reports</h1>
			</div>
			<div className="space-y-2">
				{data?.items.map((r: any) => (
					<div key={r.id} className="rounded-lg border p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="font-medium">
									{r.property?.name ?? "Unknown"} · {r.triggerType}
								</p>
								<p className="text-sm text-gray-500">
									{r.findings?.length ?? 0} findings · {r.status}
								</p>
							</div>
							<span className={`rounded px-2 py-1 text-sm ${statusClass(r.status)}`}>
								{r.status}
							</span>
						</div>
					</div>
				))}
				{!data?.items.length && <p className="text-gray-500">No anomaly reports found.</p>}
			</div>
		</div>
	);
}

function statusClass(s: string) {
	switch (s) {
		case "COMPLETED":
			return "bg-green-100 text-green-700";
		case "REVIEWED":
			return "bg-blue-100 text-blue-700";
		case "NEW":
			return "bg-yellow-100 text-yellow-700";
		case "ERROR":
			return "bg-red-100 text-red-700";
		default:
			return "bg-gray-100 text-gray-700";
	}
}
