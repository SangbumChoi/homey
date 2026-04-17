import { callClovaOcr } from "./clovaOcr";

export interface ParsedLeaseContract {
  isLeaseContract: boolean;
  contractType: "jeonse" | "monthly" | undefined;
  moveInDate: string | undefined;
  tenantName: string | undefined;
  contractAddress: string | undefined;
  addressMatched: boolean;
  debugInfo: {
    registeredAddress: string;
    contractAddress: string;
    ocrSample: string;
    [key: string]: unknown;
  };
}

export async function parseLeaseContract(
  file: File,
  registeredAddress: string,
): Promise<ParsedLeaseContract> {
  const fullText = await callClovaOcr(file);
  return parseLeaseContractText(fullText, registeredAddress);
}

function parseLeaseContractText(
  fullText: string,
  registeredAddress: string,
): ParsedLeaseContract {
  const leaseKeywords = [
    "임대차",
    "임대인",
    "임차인",
    "계약서",
    "보증금",
    "전세",
    "월세",
    "임차",
  ];
  const hitCount = leaseKeywords.filter((k) => fullText.includes(k)).length;
  const isLeaseContract = hitCount >= 3;

  let contractType: "jeonse" | "monthly" | undefined;
  if (
    fullText.includes("전세보증금") ||
    (fullText.includes("전세") && !fullText.includes("월세"))
  ) {
    contractType = "jeonse";
  } else if (fullText.includes("월세") || fullText.includes("월 차임")) {
    contractType = "monthly";
  }

  let moveInDate: string | undefined;
  const periodMatch = fullText.match(
    /계약기간[^0-]*(\d{4})[년./\-\s]*(\d{1,2})[월.]/,
  );
  if (periodMatch) {
    moveInDate = `${periodMatch[1]}-${periodMatch[2].padStart(2, "0")}`;
  }

  if (!moveInDate) {
    const moveInMatch = fullText.match(
      /(?:입주일|잔금)[^0-]*(\d{4})[년./\-\s]*(\d{1,2})[월.]/,
    );
    if (moveInMatch) {
      moveInDate = `${moveInMatch[1]}-${moveInMatch[2].padStart(2, "0")}`;
    }
  }

  if (!moveInDate) {
    const allDates = [
      ...fullText.matchAll(/(\d{4})[년./\-\s]*(\d{1,2})[월.]/g),
    ];
    for (const d of allDates) {
      const y = parseInt(d[1]);
      if (y >= 2015 && y <= 2035) {
        moveInDate = `${d[1]}-${d[2].padStart(2, "0")}`;
        break;
      }
    }
  }

  const contractAddress = extractPropertyAddress(fullText);

  const { matched: addressMatched, debug: addressDebug } =
    registeredAddress
      ? checkAddressMatch(registeredAddress, contractAddress, fullText)
      : { matched: false, debug: { reason: "등록 주소 없음" } };

  const tenantMatch = fullText.match(/임차인\s*[:：]?\s*([가-힣]{2,5})/);
  const tenantName = tenantMatch?.[1];

  const debugInfo = {
    registeredAddress,
    ...addressDebug,
    contractAddress: contractAddress ?? "추출 실패",
    ocrSample: fullText.slice(0, 400),
  };

  return {
    isLeaseContract,
    contractType,
    moveInDate,
    tenantName,
    contractAddress,
    addressMatched,
    debugInfo,
  };
}

function extractPropertyAddress(text: string): string | undefined {
  const patterns = [
    /(?:소재지|물건지|목적물의\s*표시|부동산의\s*표시)[^가-힣]*([가-힣]+(?:특별시|광역시|특별자치시|도|특별자치도)[가-힣\s\d.()]+(?:로|길|동|읍|면)[가-힣\s\d.()]{2,60})/,
    /([가-힣]+(?:특별시|광역시|도)\s+[가-힣]+(?:구|군|시)\s+[가-힣]+(?:로|길)\s+[\d-]+)/,
  ];

  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m?.[1]) return m[1].trim().replace(/\s{2,}/g, " ");
  }

  return undefined;
}

function checkAddressMatch(
  registered: string,
  contractAddress: string | undefined,
  fullText: string,
): { matched: boolean; debug: Record<string, unknown> } {
  const tokens = registered.split(/\s+/);
  const district = tokens.find((t) => /^[가-힣]+(?:구|군)$/.test(t));
  const road = tokens.find((t) => /^[가-힣]+(?:대로|로|길)$/.test(t));
  const streetNum = registered.match(/(?:대로|로|길)\s*(\d+)/)?.[1];

  let unitNum: string | undefined;
  const unitWithHo = [...registered.matchAll(/(\d+)호/g)];
  if (unitWithHo.length > 0) {
    unitNum = unitWithHo[unitWithHo.length - 1][1];
  } else if (streetNum) {
    const streetIdx = registered.indexOf(streetNum);
    const afterStreet = registered.slice(streetIdx + streetNum.length);
    const m = afterStreet.match(/\b(\d+)\b/);
    if (m) unitNum = m[1];
  }

  if (!district || !road) {
    return {
      matched: false,
      debug: { reason: "구/로 토큰 추출 실패", tokens, registered },
    };
  }

  const proximityPattern = new RegExp(district + ".{0,20}?" + road);

  const testSrc = (src: string): boolean => {
    const norm = src.replace(/\s+/g, "");
    if (!proximityPattern.test(norm)) return false;
    if (streetNum && !norm.includes(streetNum)) return false;
    if (unitNum && !norm.includes(unitNum + "호")) return false;
    return true;
  };

  const debug: Record<string, unknown> = {
    district,
    road,
    streetNum: streetNum ?? "없음",
    unitNum: unitNum ?? "없음",
    pattern: `${district}.{0,20}?${road}`,
    contractAddress: contractAddress ?? "추출 실패",
    normOcrSample: fullText.replace(/\s+/g, "").slice(0, 200),
  };

  if (contractAddress) {
    const hit = testSrc(contractAddress);
    debug.contractAddressHit = hit;
    if (hit) {
      debug.matchedBy = "소재지 섹션";
      return { matched: true, debug };
    }
  }

  const hit = testSrc(fullText);
  debug.fullTextHit = hit;
  debug.matchedBy = hit ? "전체 OCR" : "불일치";

  return { matched: hit, debug };
}
