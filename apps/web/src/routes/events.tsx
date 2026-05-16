import { createRoute } from "@tanstack/react-router";
import { trpc } from "../trpc/client.js";
import { Route as rootRoute } from "./__root.js";

export const Route = createRoute({
	getParentRoute: () => rootRoute,
	path: "/events",
	component: EventsComponent,
});

function EventsComponent() {
	const { data } = trpc.event.list.useQuery({ limit: 50 });

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">Events</h1>
			</div>
			<div className="space-y-2">
				{data?.items.map((e: any) => (
					<div key={e.id} className="flex items-center justify-between rounded-lg border p-4">
						<div>
							<p className="font-medium">
								{e.type} · {e.device?.name ?? "System"}
							</p>
							<p className="text-sm text-gray-500">{e.details}</p>
						</div>
						<div className="text-sm text-gray-400">{new Date(e.timestamp).toLocaleString()}</div>
					</div>
				))}
				{!data?.items.length && <p className="text-gray-500">No events found.</p>}
			</div>
		</div>
	);
}
