import { Link, Navigate, Outlet, createRootRoute } from "@tanstack/react-router";
import { signOut, useSession } from "../auth/client.js";
import { trpc } from "../trpc/client.js";

export const Route = createRootRoute({
	component: RootComponent,
});

function ReseedButton() {
	const reseed = trpc.tenant.reseed.useMutation({
		onSuccess: () => {
			window.location.href = "/setup";
		},
	});
	return (
		<button
			type="button"
			onClick={() => {
				if (confirm("Reset all data? This cannot be undone.")) {
					reseed.mutate();
				}
			}}
			className="text-sm text-amber-600 hover:underline"
		>
			Reset
		</button>
	);
}

function RootComponent() {
	const { data: session, isPending } = useSession();
	const { data: tenantStatus } = trpc.tenant.getStatus.useQuery(undefined, {
		enabled: !!session,
	});

	if (isPending) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
			</div>
		);
	}

	if (session && !tenantStatus?.seedComplete) {
		return <Navigate to="/setup" />;
	}

	return (
		<div className="min-h-screen bg-background text-foreground">
			<nav className="border-b px-4 py-3">
				<div className="flex items-center gap-4">
					<Link to="/" className="font-semibold">
						HomeHarbor
					</Link>
					{session ? (
						<>
							<Link to="/properties">Properties</Link>
							<Link to="/devices">Devices</Link>
							<Link to="/work-orders">Work Orders</Link>
							<Link to="/reservations">Reservations</Link>
							<Link to="/events">Events</Link>
							<Link to="/anomaly-reports">Anomalies</Link>
							<Link to="/users">Users</Link>
							<span className="ml-auto text-sm">{session.user.name || session.user.email}</span>
							<ReseedButton />
							<button
								type="button"
								onClick={() => signOut()}
								className="text-sm text-red-600 hover:underline"
							>
								Sign Out
							</button>
						</>
					) : (
						<>
							<Link to="/sign-in">Sign In</Link>
							<Link to="/sign-up">Sign Up</Link>
						</>
					)}
				</div>
			</nav>
			<main className="p-4">
				<Outlet />
			</main>
		</div>
	);
}
