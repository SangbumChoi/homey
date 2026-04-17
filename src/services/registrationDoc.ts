/**
 * 등기부등본 관련 서비스
 *
 * - 발급 API (TBD): 등기부등본을 자동 발급받아 파싱
 * - 업로드 파싱: 사용자가 올린 PDF/이미지를 OCR로 파싱 (CLOVA OCR 사용)
 */

import type { ParsedRegistrationDoc } from "../types";
import { callClovaOcr } from "./clovaOcr";

/**
 * 등기부등본 자동 발급 API (TBD)
 *
 * 실제 구현 시:
 * - 인터넷등기소(IROS) 또는 프록시 서비스(등기24, 씨리얼 등) 연동
 * - 주소 기반으로 등기부등본을 자동 발급 → OCR 파싱 → 결과 반환
 *
 * @param address 도로명 주소
 * @returns 파싱된 등기부등본 정보
 */
export async function fetchRegistrationDoc(
	address: string,
): Promise<ParsedRegistrationDoc> {
	// TODO: 실제 API 연동 시 이 부분을 교체
	// const res = await fetch(`${API_BASE}/registration-doc`, {
	//   method: "POST",
	//   headers: { "Content-Type": "application/json" },
	//   body: JSON.stringify({ address }),
	// });
	// return res.json();

	// Mock: 주소 기반 시뮬레이션 데이터
	await new Promise((r) => setTimeout(r, 1500)); // API 호출 시뮬레이션

	// 강남/서초 → 높은 근저당, 나머지 → 낮은 근저당
	const isHighRisk =
		address.includes("강남") || address.includes("서초");

	if (isHighRisk) {
		return {
			owner: "김OO",
			seniorDebt: 42000,
			mortgages: [
				{ creditor: "국민은행", amount: 30000 },
				{ creditor: "신한은행", amount: 12000 },
			],
			hasSeizure: false,
			hasAuction: false,
			ownershipTransferCount: 1,
			warnings: ["근저당 설정 금액이 높아요"],
		};
	}

	return {
		owner: "박OO",
		seniorDebt: 4200,
		mortgages: [{ creditor: "우리은행", amount: 4200 }],
		hasSeizure: false,
		hasAuction: false,
		ownershipTransferCount: 0,
		warnings: [],
	};
}

/**
 * 업로드된 등기부등본 파일 파싱
 *
 * - CLOVA OCR API 호출하여 PDF/이미지에서 텍스트 추출
 * - 텍스트에서 소유자, 근저당, 경고 정보 파싱
 * - 개인/법인 등기부등본 모두 지원
 */
export async function parseUploadedDoc(file: File): Promise<ParsedRegistrationDoc> {
	const fullText = await callClovaOcr(file);

	let owner = "미확인";

	// 법인명 추출 (상호/명칭)
	const corpMatch = fullText.match(/(?:상호|명칭)\s*[:\s]*((?:주식회사|유한책임|합자회사|사단법인|학교법인|의료법인|[가-힣]+(?:유한|합자))[^,\s]*)/);
	if (corpMatch?.[1]) {
		owner = corpMatch[1].trim();
	}

	// 개인명 추출 (소유자 다음)
	if (owner === "미확인") {
		const personalMatch = fullText.match(/소유자\s+([가-힣]{2,6})/);
		if (personalMatch?.[1]) {
			owner = personalMatch[1];
		}
	}

	// 상호 직접 찾기
	if (owner === "미확인") {
		const directCorp = fullText.match(/(?:상호|명칭)\s*((?:주식회사|유한책임)[^,\s]{0,30})/);
		if (directCorp?.[1]) {
			owner = directCorp[1].trim();
		}
	}

	const mortgages: { creditor: string; amount: number }[] = [];

	// 채권최고액 찾기
	const amountRe = /채권최고액\s*금\s*([\d,]+)\s*원/g;
	let m: RegExpExecArray | null;
	while ((m = amountRe.exec(fullText)) !== null) {
		const amount = Math.round(parseInt(m[1].replace(/,/g, ""), 10) / 10000);
		const before = fullText.substring(Math.max(0, m.index - 400), m.index);
		const creditorMatch = before.match(
			/([가-힣]+(?:은행|증권|캐피탈|저축은행|카드|생명|화재|신협|새마을금고|농협|수협|우체국))/g,
		);
		const creditor = creditorMatch?.at(-1) ?? "금융기관";
		mortgages.push({ creditor, amount });
	}

	const seniorDebt = mortgages.reduce((s, x) => s + x.amount, 0);

	const warnings: string[] = [];
	if (fullText.includes("가압류")) warnings.push("가압류 등기가 발견되었습니다");
	if (fullText.includes("가처분")) warnings.push("가처분 등기가 발견되었습니다");
	if (fullText.includes("경매개시")) warnings.push("경매개시결정 등기가 있습니다");
	if (fullText.includes("압류") && !fullText.includes("가압류")) {
		warnings.push("압류 등기가 발견되었습니다");
	}
	if (fullText.includes("전세권")) warnings.push("선순위 전세권이 설정되어 있습니다");

	return {
		owner,
		seniorDebt,
		mortgages,
		hasSeizure: warnings.some((w) => w.includes("가압류") || w.includes("압류")),
		hasAuction: warnings.some((w) => w.includes("경매")),
		ownershipTransferCount: 0,
		warnings,
	};
}
