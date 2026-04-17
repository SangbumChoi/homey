import { create } from "zustand";
import type { UserType, DiagnosisResult, MyHome, Address } from "../types";

interface AppState {
	userType: UserType | null;
	setUserType: (type: UserType) => void;

	diagnosisHistory: DiagnosisResult[];
	addDiagnosis: (result: DiagnosisResult) => void;
	updateDiagnosis: (id: string, patch: Partial<DiagnosisResult>) => void;

	myHome: MyHome | null;
	setMyHome: (home: MyHome) => void;
	clearMyHome: () => void;

	currentAddress: Address | null;
	setCurrentAddress: (address: Address | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
	userType: null,
	setUserType: (type) => set({ userType: type }),

	diagnosisHistory: [],
	addDiagnosis: (result) =>
		set((state) => {
			if (state.diagnosisHistory.some((d) => d.id === result.id)) return state;
			const updatedMyHome =
				state.myHome &&
				state.myHome.address.roadAddress === result.address.roadAddress
					? { ...state.myHome, grade: result.grade }
					: state.myHome;
			return {
				diagnosisHistory: [result, ...state.diagnosisHistory].slice(0, 20),
				myHome: updatedMyHome,
			};
		}),

	updateDiagnosis: (id, patch) =>
		set((state) => ({
			diagnosisHistory: state.diagnosisHistory.map((d) =>
				d.id === id ? { ...d, ...patch } : d,
			),
		})),

	myHome: null,
	setMyHome: (home) => set({ myHome: home }),
	clearMyHome: () => set({ myHome: null }),

	currentAddress: null,
	setCurrentAddress: (address) => set({ currentAddress: address }),
}));
