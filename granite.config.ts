import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
	appName: "homey",
	brand: {
		displayName: "호미",
		primaryColor: "#1B3D35",
		icon: "",
	},
	web: {
		host: "localhost",
		port: 5173,
		commands: {
			dev: "vite dev",
			build: "vite build",
		},
	},
	permissions: [],
	outdir: "dist",
});
