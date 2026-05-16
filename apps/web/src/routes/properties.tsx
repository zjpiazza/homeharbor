import { Link, createRoute } from "@tanstack/react-router";
import { trpc } from "../trpc/client.js";
import { Route as rootRoute } from "./__root.js";

export const Route = createRoute({
	getParentRoute: () => rootRoute,
	path: "/properties",
	component: PropertiesComponent,
});

function PropertiesComponent() {
	const { data } = trpc.property.list.useQuery({ limit: 50 });

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">Properties</h1>
			</div>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{data?.items.map((p: any) => (
					<Link
						to="/properties/$id"
						params={{ id: p.id }}
						key={p.id}
						className="rounded-lg border p-4 hover:bg-gray-50"
					>
						<h2 className="font-semibold">{p.name}</h2>
						<p className="text-sm text-gray-500">{p.address}</p>
						<div className="mt-2 flex gap-2 text-xs text-gray-400">
							<span>{p.devices?.length ?? 0} devices</span>
							<span>{p.reservations?.length ?? 0} reservations</span>
							<span>{p.workOrders?.length ?? 0} work orders</span>
						</div>
					</Link>
				))}
				{!data?.items.length && <p className="text-gray-500">No properties found.</p>}
			</div>
		</div>
	);
}
