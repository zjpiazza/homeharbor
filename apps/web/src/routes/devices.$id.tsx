import { createRoute } from "@tanstack/react-router";
import { trpc } from "../trpc/client.js";
import { Route as rootRoute } from "./__root.js";

export const Route = createRoute({
	getParentRoute: () => rootRoute,
	path: "/devices/$id",
	component: DeviceDetailComponent,
});

function DeviceDetailComponent() {
	const id = window.location.pathname.split("/").pop() ?? "";
	const utils = trpc.useUtils();
	const { data } = trpc.device.getById.useQuery({ id });
	const device = data as any;
	const sendCommand = trpc.device.sendCommand.useMutation({
		onSuccess: () => utils.device.getById.invalidate({ id }),
	});

	if (!device) {
		return <div className="p-4">Loading...</div>;
	}

	const state = (device.state as Record<string, unknown> | null) ?? {};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">{device.name}</h1>
					<p className="text-gray-500">
						{device.type} · {device.category} · {device.property?.name ?? "Unknown"}
					</p>
				</div>
			</div>

			<div className="rounded-lg border p-4">
				<h2 className="mb-2 font-semibold">Controls</h2>
				<div className="flex flex-wrap gap-2">
					{device.capabilities?.includes("on") && (
						<button
							type="button"
							onClick={() => sendCommand.mutate({ id, command: "status", value: "on" })}
							className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
						>
							Turn On
						</button>
					)}
					{device.capabilities?.includes("off") && (
						<button
							type="button"
							onClick={() => sendCommand.mutate({ id, command: "status", value: "off" })}
							className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
						>
							Turn Off
						</button>
					)}
					{device.type === "THERMOSTAT" && (
						<button
							type="button"
							onClick={() => sendCommand.mutate({ id, command: "temperature", value: 22 })}
							className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
						>
							Set 22°C
						</button>
					)}
					{device.type === "LOCK" && (
						<button
							type="button"
							onClick={() => sendCommand.mutate({ id, command: "locked", value: true })}
							className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
						>
							Lock
						</button>
					)}
				</div>
			</div>

			<div className="rounded-lg border p-4">
				<h2 className="mb-2 font-semibold">State</h2>
				<div className="grid gap-2 md:grid-cols-2">
					{Object.entries(state).map(([key, value]) => (
						<div key={key} className="flex justify-between rounded bg-gray-50 p-2">
							<span className="font-medium">{key}</span>
							<span className="text-gray-600">{String(value)}</span>
						</div>
					))}
					{!Object.keys(state).length && <p className="text-gray-500">No state data.</p>}
				</div>
			</div>

			<div className="rounded-lg border p-4">
				<h2 className="mb-2 font-semibold">Capabilities</h2>
				<div className="flex gap-2">
					{device.capabilities.map((cap: string) => (
						<span key={cap} className="rounded bg-blue-100 px-2 py-1 text-sm text-blue-700">
							{cap}
						</span>
					))}
				</div>
			</div>

			<div className="rounded-lg border p-4">
				<h2 className="mb-2 font-semibold">Recent Events</h2>
				<div className="space-y-2">
					{device.events.map((e: any) => (
						<div key={e.id} className="flex items-center justify-between border-b py-2">
							<span>
								{e.type} · {e.details}
							</span>
							<span className="text-sm text-gray-400">
								{new Date(e.timestamp).toLocaleString()}
							</span>
						</div>
					))}
					{!device.events.length && <p className="text-gray-500">No events.</p>}
				</div>
			</div>
		</div>
	);
}
