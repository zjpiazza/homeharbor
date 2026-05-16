import { createRoute } from "@tanstack/react-router";
import { useState } from "react";
import { trpc } from "../trpc/client.js";
import { Route as rootRoute } from "./__root.js";

export const Route = createRoute({
	getParentRoute: () => rootRoute,
	path: "/setup",
	component: SetupComponent,
});

function SetupComponent() {
	const [name, setName] = useState("");
	const [runId] = useState(() => crypto.randomUUID());
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");
	const createMutation = trpc.tenant.create.useMutation();
	const utils = trpc.useUtils();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setIsSubmitting(true);
		try {
			await createMutation.mutateAsync({ name, runId });
			// Poll for status
			const interval = setInterval(async () => {
				const status = await utils.tenant.getStatus.fetch();
				if (status?.seedComplete) {
					clearInterval(interval);
					window.location.href = "/";
				}
			}, 2000);
			// Safety timeout after 5 minutes
			setTimeout(() => clearInterval(interval), 300000);
		} catch (err: any) {
			setError(err.message || "Failed to create tenant");
			setIsSubmitting(false);
		}
	};

	if (isSubmitting) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
					<p className="text-lg font-medium">Setting up your home...</p>
					<p className="text-sm text-gray-500">This may take a minute.</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50">
			<div className="w-full max-w-md rounded-lg bg-white p-8 shadow">
				<h1 className="mb-2 text-2xl font-bold">Welcome to HomeHarbor</h1>
				<p className="mb-6 text-gray-600">Create your home to get started.</p>
				{error && <p className="mb-4 text-red-500">{error}</p>}
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label htmlFor="name" className="block text-sm font-medium">
							Home Name
						</label>
						<input
							id="name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="mt-1 w-full rounded border px-3 py-2"
							placeholder="My Smart Home"
							required
						/>
					</div>
					<button
						type="submit"
						className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
					>
						Create Home
					</button>
				</form>
			</div>
		</div>
	);
}
