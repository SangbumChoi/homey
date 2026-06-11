import { useEffect, useState } from "react";
import "./App.css";

import { useAppStore } from "./store/useAppStore";
import { seedMockData } from "./services/mockData";

import { HomePage, type HomeTab } from "./pages/HomePage";
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
	| { type: "home"; tab?: HomeTab }
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

	const nav = (p: Page) => setPage(p);
	const goHome = (tab?: HomeTab) => nav({ type: "home", tab });

	switch (page.type) {
		case "home":
			return <HomePage activeTab={page.tab} />;
		case "diagnosis-search":
			return (
				<DiagnosisSearchPage
					mode={page.mode}
					onBack={() => goHome()}
					nav={nav}
				/>
			);
		case "diagnosis-deposit":
			return <DiagnosisDepositPage onBack={() => goHome()} nav={nav} />;
		case "diagnosis-doc":
			return (
				<DiagnosisDocPage
					deposit={page.deposit}
					monthlyRent={page.monthlyRent}
					onBack={() => nav({ type: "diagnosis-deposit" })}
					nav={nav}
				/>
			);
		case "diagnosis-result":
			return <DiagnosisResultPage id={page.id} onBack={() => goHome()} nav={nav} />;
		case "myhome-register":
			return (
				<MyhomeRegisterPage onBack={() => goHome()} onDone={() => goHome()} />
			);
		case "checklist":
			return (
				<ChecklistPage
					diagnosisId={page.diagnosisId}
					onBack={() =>
						page.diagnosisId
							? nav({ type: "diagnosis-result", id: page.diagnosisId })
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
