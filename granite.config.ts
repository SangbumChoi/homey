import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
	appName: "homey",
	brand: {
		displayName: "호미",
		primaryColor: "#FFD43B",
		// 공개 데이터 저장소(homey-data)에 올려둔 앱 아이콘 — 원본은 public/icon.png
		icon: "https://raw.githubusercontent.com/SangbumChoi/homey-data/main/icon.png",
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
