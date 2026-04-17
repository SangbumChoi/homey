import { Button, Top } from "@toss/tds-mobile";
import { useAppStore } from "../store/useAppStore";

interface Props {
	onDone: () => void;
}

export function OnboardingPage({ onDone }: Props) {
	const { setUserType } = useAppStore();

	const select = (type: "seeker" | "resident") => {
		setUserType(type);
		onDone();
	};

	return (
		<>
			<Top
				title={
					<Top.TitleParagraph size={22}>
						호미에 오신 걸 환영해요
					</Top.TitleParagraph>
				}
				subtitleBottom={
					<Top.SubtitleParagraph size={17}>
						어떤 상황인지 알려주세요
					</Top.SubtitleParagraph>
				}
			/>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "12px",
					padding: "24px",
				}}
			>
				<Button color="dark" onClick={() => select("seeker")}>
					🔍 전세 구하는 중이에요
				</Button>
				<Button variant="weak" onClick={() => select("resident")}>
					🏠 이미 거주 중이에요
				</Button>
			</div>
		</>
	);
}
