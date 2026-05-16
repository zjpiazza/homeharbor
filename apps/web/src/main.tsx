import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { router } from "./router.js";
import { TrpcProvider } from "./trpc/provider.js";
import "./styles/globals.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
	<StrictMode>
		<TrpcProvider>
			<RouterProvider router={router} />
		</TrpcProvider>
	</StrictMode>,
);
