import type { Address } from "../types";

const KAKAO_API_KEY = import.meta.env.VITE_KAKAO_API_KEY as string | undefined;

/**
 * Search addresses using Kakao Address API.
 * Falls back to mock data if VITE_KAKAO_API_KEY is not set.
 */
export async function searchAddress(keyword: string): Promise<Address[]> {
	if (!KAKAO_API_KEY) {
		console.warn("[addressSearch] VITE_KAKAO_API_KEY not set — using mock data");
		return getMockAddresses(keyword);
	}

	try {
		const res = await fetch(
			`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(keyword)}&size=10`,
			{
				headers: { Authorization: `KakaoAK ${KAKAO_API_KEY}` },
			},
		);

		if (!res.ok) {
			console.error(`[addressSearch] Kakao API error: ${res.status}`);
			return getMockAddresses(keyword);
		}

		const data = await res.json();
		return parseKakaoResponse(data);
	} catch (err) {
		console.error("[addressSearch] Kakao API request failed:", err);
		return getMockAddresses(keyword);
	}
}

// ── Kakao API response types ──

interface KakaoDocument {
	address_name: string;
	address_type: string;
	road_address?: {
		address_name: string;
		building_name: string;
		zone_no: string;
		region_1depth_name: string;
		region_2depth_name: string;
	};
	address?: {
		address_name: string;
		region_1depth_name: string;
		region_2depth_name: string;
	};
}

interface KakaoResponse {
	documents: KakaoDocument[];
	meta: { total_count: number };
}

function parseKakaoResponse(data: KakaoResponse): Address[] {
	return data.documents
		.filter((doc) => doc.road_address || doc.address)
		.map((doc) => {
			const road = doc.road_address;
			const addr = doc.address;
			return {
				roadAddress: road?.address_name || addr?.address_name || doc.address_name,
				jibunAddress: addr?.address_name || doc.address_name,
				buildingName: road?.building_name || undefined,
				zipCode: road?.zone_no || "",
				sido: road?.region_1depth_name || addr?.region_1depth_name || "",
				sigungu: road?.region_2depth_name || addr?.region_2depth_name || "",
			};
		});
}

// ── Mock fallback ──

function getMockAddresses(keyword: string): Address[] {
	const pool: Address[] = [
		{
			roadAddress: "서울특별시 마포구 합정로 123",
			jibunAddress: "서울특별시 마포구 합정동 123-45",
			buildingName: "행복빌라",
			zipCode: "04001",
			sido: "서울특별시",
			sigungu: "마포구",
		},
		{
			roadAddress: "서울특별시 강남구 테헤란로 456",
			jibunAddress: "서울특별시 강남구 역삼동 456-78",
			buildingName: "역삼아이파크",
			zipCode: "06135",
			sido: "서울특별시",
			sigungu: "강남구",
		},
		{
			roadAddress: "서울특별시 송파구 올림픽로 300",
			jibunAddress: "서울특별시 송파구 방이동 300-1",
			buildingName: "잠실엘스아파트",
			zipCode: "05551",
			sido: "서울특별시",
			sigungu: "송파구",
		},
		{
			roadAddress: "서울특별시 서초구 반포대로 201",
			jibunAddress: "서울특별시 서초구 반포동 201-7",
			buildingName: "반포자이아파트",
			zipCode: "06541",
			sido: "서울특별시",
			sigungu: "서초구",
		},
		{
			roadAddress: "서울특별시 용산구 이태원로 200",
			jibunAddress: "서울특별시 용산구 이태원동 200-5",
			buildingName: "",
			zipCode: "04348",
			sido: "서울특별시",
			sigungu: "용산구",
		},
		{
			roadAddress: "경기도 성남시 분당구 판교역로 235",
			jibunAddress: "경기도 성남시 분당구 백현동 235-1",
			buildingName: "알파리움",
			zipCode: "13494",
			sido: "경기도",
			sigungu: "성남시 분당구",
		},
	];
	const filtered = pool.filter(
		(a) =>
			a.roadAddress.includes(keyword) ||
			a.jibunAddress.includes(keyword) ||
			(a.buildingName && a.buildingName.includes(keyword)) ||
			a.sigungu.includes(keyword),
	);
	if (filtered.length === 0)
		return [
			{
				roadAddress: `서울특별시 마포구 ${keyword}로 123`,
				jibunAddress: "서울특별시 마포구 합정동 123-45",
				buildingName: `${keyword}빌라`,
				zipCode: "04001",
				sido: "서울특별시",
				sigungu: "마포구",
			},
		];
	return filtered;
}
