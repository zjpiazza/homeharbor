import { createRoute } from "@tanstack/react-router";
import { trpc } from "../trpc/client.js";
import { Route as rootRoute } from "./__root.js";

export const Route = createRoute({
	getParentRoute: () => rootRoute,
	path: "/users",
	component: UsersComponent,
});

function UsersComponent() {
	const { data: users } = trpc.user.list.useQuery();
	const { data: me } = trpc.user.me.useQuery();

	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-bold">Users</h1>

			{me && (
				<div className="rounded-lg border p-4">
					<h2 className="mb-2 font-semibold">Current User</h2>
					<div className="flex items-center gap-4">
						<div className="h-10 w-10 rounded-full bg-blue-600 text-center leading-10 text-white">
							{me.name?.[0] ?? me.email[0]}
						</div>
						<div>
							<p className="font-medium">{me.name ?? me.email}</p>
							<p className="text-sm text-gray-500">{me.email}</p>
						</div>
					</div>
				</div>
			)}

			<div className="rounded-lg border p-4">
				<h2 className="mb-2 font-semibold">Tenant Users</h2>
				<div className="space-y-2">
					{users?.map((u: any) => (
						<div key={u.id} className="flex items-center gap-4 border-b py-2">
							<div className="h-8 w-8 rounded-full bg-gray-200 text-center leading-8 text-gray-600">
								{u.name?.[0] ?? u.email[0]}
							</div>
							<div>
								<p className="font-medium">{u.name ?? u.email}</p>
								<p className="text-sm text-gray-500">{u.email}</p>
							</div>
						</div>
					))}
					{!users?.length && <p className="text-gray-500">No users found.</p>}
				</div>
			</div>
		</div>
	);
}
