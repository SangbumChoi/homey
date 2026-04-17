import type { Address } from "../types";

export async function searchAddress(keyword: string): Promise<Address[]> {
	// In web/AIT context, always use mock for now
	return getMockAddresses(keyword);
}

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
