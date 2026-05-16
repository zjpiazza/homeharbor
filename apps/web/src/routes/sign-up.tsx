import { createRoute } from "@tanstack/react-router";
import { useState } from "react";
import { signUp } from "../auth/client.js";
import { Route as rootRoute } from "./__root.js";

export const Route = createRoute({
	getParentRoute: () => rootRoute,
	path: "/sign-up",
	component: SignUpComponent,
});

function SignUpComponent() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		const result = await signUp.email({ name, email, password });
		if (result.error) {
			setError(result.error.message || "Sign up failed");
		} else {
			window.location.href = "/";
		}
	};

	return (
		<div className="mx-auto max-w-md space-y-6 p-6">
			<h1 className="text-2xl font-bold">Sign Up</h1>
			{error && <p className="text-red-500">{error}</p>}
			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label htmlFor="name" className="block text-sm font-medium">
						Name
					</label>
					<input
						id="name"
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						className="mt-1 w-full rounded border px-3 py-2"
						required
					/>
				</div>
				<div>
					<label htmlFor="email" className="block text-sm font-medium">
						Email
					</label>
					<input
						id="email"
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						className="mt-1 w-full rounded border px-3 py-2"
						required
					/>
				</div>
				<div>
					<label htmlFor="password" className="block text-sm font-medium">
						Password
					</label>
					<input
						id="password"
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						className="mt-1 w-full rounded border px-3 py-2"
						required
					/>
				</div>
				<button
					type="submit"
					className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
				>
					Sign Up
				</button>
			</form>
		</div>
	);
}
