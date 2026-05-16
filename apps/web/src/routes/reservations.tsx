import { createRoute } from "@tanstack/react-router";
import { trpc } from "../trpc/client.js";
import { Route as rootRoute } from "./__root.js";

export const Route = createRoute({
	getParentRoute: () => rootRoute,
	path: "/reservations",
	component: ReservationsComponent,
});

function ReservationsComponent() {
	const { data } = trpc.reservation.list.useQuery({ limit: 50 });

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">Reservations</h1>
			</div>
			<div className="space-y-2">
				{data?.items.map((r: any) => (
					<div key={r.id} className="flex items-center justify-between rounded-lg border p-4">
						<div>
							<p className="font-medium">{r.property?.name ?? "Unknown"}</p>
							<p className="text-sm text-gray-500">Guest: {r.guestId}</p>
						</div>
						<div className="text-sm text-gray-500">
							{new Date(r.checkIn).toLocaleDateString()} -{" "}
							{new Date(r.checkOut).toLocaleDateString()}
						</div>
					</div>
				))}
				{!data?.items.length && <p className="text-gray-500">No reservations found.</p>}
			</div>
		</div>
	);
}
