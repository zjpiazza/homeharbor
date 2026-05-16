import { Link, createRoute } from "@tanstack/react-router";
import { trpc } from "../trpc/client.js";
import { Route as rootRoute } from "./__root.js";

export const Route = createRoute({
	getParentRoute: () => rootRoute,
	path: "/devices",
	component: DevicesComponent,
});

function DevicesComponent() {
	const { data } = trpc.device.list.useQuery({ limit: 50 });

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">Devices</h1>
			</div>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{data?.items.map((d: any) => (
					<Link
						to="/devices/$id"
						params={{ id: d.id }}
						key={d.id}
						className="rounded-lg border p-4 hover:bg-gray-50"
					>
						<h2 className="font-semibold">{d.name}</h2>
						<p className="text-sm text-gray-500">
							{d.type} · {d.category}
						</p>
						<p className="text-xs text-gray-400">{d.property?.name ?? "Unknown property"}</p>
					</Link>
				))}
				{!data?.items.length && <p className="text-gray-500">No devices found.</p>}
			</div>
		</div>
	);
}
