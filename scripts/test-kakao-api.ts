/**
 * Kakao Address API 연동 테스트 스크립트
 *
 * 사용법:
 *   KAKAO_API_KEY=your_key npx tsx scripts/test-kakao-api.ts
 *
 * 또는 .env에 VITE_KAKAO_API_KEY를 설정한 후:
 *   npx tsx scripts/test-kakao-api.ts
 */

const API_KEY =
	process.env.KAKAO_API_KEY ||
	process.env.VITE_KAKAO_API_KEY ||
	"";

const TEST_QUERIES = [
	"서울특별시 마포구 합정로",
	"강남구 테헤란로",
	"판교역로 235",
	"잠실엘스",
	"반포자이아파트",
];

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
	meta: { total_count: number; pageable_count: number; is_end: boolean };
}

async function testSearch(query: string): Promise<{
	query: string;
	success: boolean;
	count: number;
	results: string[];
	error?: string;
}> {
	try {
		const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}&size=5`;
		const res = await fetch(url, {
			headers: { Authorization: `KakaoAK ${API_KEY}` },
		});

		if (!res.ok) {
			const body = await res.text();
			return {
				query,
				success: false,
				count: 0,
				results: [],
				error: `HTTP ${res.status}: ${body}`,
			};
		}

		const data: KakaoResponse = await res.json();
		const results = data.documents.map((doc) => {
			const road = doc.road_address;
			const building = road?.building_name ? ` (${road.building_name})` : "";
			return `${road?.address_name || doc.address_name}${building}`;
		});

		return {
			query,
			success: true,
			count: data.meta.total_count,
			results,
		};
	} catch (err) {
		return {
			query,
			success: false,
			count: 0,
			results: [],
			error: String(err),
		};
	}
}

async function main() {
	console.log("=== Kakao Address API Test ===\n");

	// 1. API Key check
	if (!API_KEY) {
		console.error("❌ API 키가 설정되지 않았어요.");
		console.error("   KAKAO_API_KEY=your_key npx tsx scripts/test-kakao-api.ts");
		console.error("   또는 .env 파일에 VITE_KAKAO_API_KEY를 설정하세요.\n");
		process.exit(1);
	}
	console.log(`✅ API Key: ${API_KEY.slice(0, 6)}...${API_KEY.slice(-4)}\n`);

	// 2. Run test queries
	let passed = 0;
	let failed = 0;

	for (const query of TEST_QUERIES) {
		const result = await testSearch(query);

		if (result.success && result.count > 0) {
			passed++;
			console.log(`✅ "${query}" → ${result.count}건`);
			result.results.forEach((r, i) => console.log(`   ${i + 1}. ${r}`));
		} else if (result.success && result.count === 0) {
			passed++;
			console.log(`⚠️  "${query}" → 검색 결과 0건 (API 정상, 결과 없음)`);
		} else {
			failed++;
			console.log(`❌ "${query}" → 실패: ${result.error}`);
		}
		console.log();
	}

	// 3. Summary
	console.log("=== 결과 요약 ===");
	console.log(`총 ${TEST_QUERIES.length}건 중 ✅ ${passed}건 성공, ❌ ${failed}건 실패\n`);

	// 4. Response format check
	console.log("=== 응답 형식 검증 ===");
	const sampleResult = await testSearch("서울특별시 마포구");
	if (sampleResult.success) {
		const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent("서울특별시 마포구")}&size=1`;
		const res = await fetch(url, {
			headers: { Authorization: `KakaoAK ${API_KEY}` },
		});
		const data: KakaoResponse = await res.json();
		const doc = data.documents[0];

		console.log("Raw document sample:");
		console.log(JSON.stringify(doc, null, 2));
		console.log();

		const hasRoadAddress = !!doc?.road_address;
		const hasAddress = !!doc?.address;
		console.log(`road_address 필드: ${hasRoadAddress ? "✅" : "❌"}`);
		console.log(`address 필드:      ${hasAddress ? "✅" : "❌"}`);

		if (hasRoadAddress) {
			const road = doc.road_address!;
			console.log(`  address_name:      ${road.address_name || "❌ 없음"}`);
			console.log(`  building_name:     ${road.building_name || "(없음)"}`);
			console.log(`  zone_no (우편번호): ${road.zone_no || "❌ 없음"}`);
			console.log(`  region_1depth:     ${road.region_1depth_name || "❌ 없음"}`);
			console.log(`  region_2depth:     ${road.region_2depth_name || "❌ 없음"}`);
		}
	} else {
		console.log(`❌ 응답 형식 검증 실패: ${sampleResult.error}`);
	}

	console.log("\n=== 테스트 완료 ===");
	process.exit(failed > 0 ? 1 : 0);
}

main();
