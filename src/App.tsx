import { useEffect, useState } from "react";
import "./App.css";

import { useAppStore } from "./store/useAppStore";
import { seedMockData } from "./services/mockData";

import { OnboardingPage } from "./pages/OnboardingPage";
import { HomePage } from "./pages/HomePage";
import { DiagnosisSearchPage } from "./pages/DiagnosisSearchPage";
import { DiagnosisDepositPage } from "./pages/DiagnosisDepositPage";
import { DiagnosisDocPage } from "./pages/DiagnosisDocPage";
import { DiagnosisResultPage } from "./pages/DiagnosisResultPage";
import { MyhomeRegisterPage } from "./pages/MyhomeRegisterPage";
import { ChecklistPage } from "./pages/ChecklistPage";
import { InAppPurchasePage } from "./pages/InAppPurchasePage";
import { InAppAdsPage } from "./pages/InAppAdsPage";

/* ── Navigation state ── */
export type Page =
	| { type: "onboarding" }
	| { type: "home"; tab?: "diagnosis" | "auction" | "myhome" | "history" }
	| { type: "diagnosis-search"; mode?: "myhome" }
	| { type: "diagnosis-deposit" }
	| { type: "diagnosis-doc"; deposit: string; monthlyRent: string }
	| { type: "diagnosis-result"; id: string }
	| { type: "myhome-register" }
	| { type: "checklist"; diagnosisId?: string }
	| { type: "iap" }
	| { type: "iaa" };

function App() {
	const store = useAppStore();
	const [page, setPage] = useState<Page>({ type: "home" });

	// Seed mock data on mount
	useEffect(() => {
		seedMockData(store);
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	// If no userType, show onboarding (unless already there)
	const effectivePage =
		!store.userType && page.type !== "onboarding"
			? { type: "onboarding" as const }
			: page;

	const nav = (p: Page) => setPage(p);
	const goHome = (tab?: "diagnosis" | "auction" | "myhome" | "history") =>
		nav({ type: "home", tab });

	switch (effectivePage.type) {
		case "onboarding":
			return <OnboardingPage onDone={() => goHome()} />;
		case "home":
			return <HomePage nav={nav} activeTab={effectivePage.tab} />;
		case "diagnosis-search":
			return (
				<DiagnosisSearchPage
					mode={effectivePage.mode}
					onBack={() => goHome()}
					nav={nav}
				/>
			);
		case "diagnosis-deposit":
			return <DiagnosisDepositPage onBack={() => goHome()} nav={nav} />;
		case "diagnosis-doc":
			return (
				<DiagnosisDocPage
					deposit={effectivePage.deposit}
					monthlyRent={effectivePage.monthlyRent}
					onBack={() => nav({ type: "diagnosis-deposit" })}
					nav={nav}
				/>
			);
		case "diagnosis-result":
			return (
				<DiagnosisResultPage
					id={effectivePage.id}
					onBack={() => goHome()}
					nav={nav}
				/>
			);
		case "myhome-register":
			return (
				<MyhomeRegisterPage
					onBack={() => goHome("myhome")}
					onDone={() => goHome("myhome")}
				/>
			);
		case "checklist":
			return (
				<ChecklistPage
					diagnosisId={effectivePage.diagnosisId}
					onBack={() =>
						effectivePage.diagnosisId
							? nav({ type: "diagnosis-result", id: effectivePage.diagnosisId })
							: goHome()
					}
				/>
			);
		case "iap":
			return <InAppPurchasePage onBack={() => goHome()} />;
		case "iaa":
			return <InAppAdsPage onBack={() => goHome()} />;
	}
}

export default App;
