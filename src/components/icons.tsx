/** 네오브루탈 모노 스트로크 아이콘 — 탭바·휴지통 아이콘과 같은 언어예요 */

interface IconProps {
	size?: number;
	color?: string;
}

function Svg({
	size = 14,
	children,
	fill = "none",
	color = "#111",
}: IconProps & { children: React.ReactNode; fill?: string }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill={fill}
			stroke={color}
			strokeWidth="2.2"
			strokeLinecap="round"
			strokeLinejoin="round"
			style={{ flexShrink: 0, verticalAlign: "-2px" }}
		>
			{children}
		</svg>
	);
}

/** 신건 — 반짝임 */
export function SparkleIcon(p: IconProps) {
	return (
		<Svg {...p}>
			<path d="M12 3l2 5.5L19.5 10 14 12l-2 5.5L10 12 4.5 10 10 8.5z" />
			<line x1="19" y1="3" x2="19" y2="7" />
			<line x1="17" y1="5" x2="21" y2="5" />
		</Svg>
	);
}

/** 유찰 — 하락 추세 */
export function TrendDownIcon(p: IconProps) {
	return (
		<Svg {...p}>
			<polyline points="2 7 8.5 13.5 13.5 8.5 22 17" />
			<polyline points="16 17 22 17 22 11" />
		</Svg>
	);
}

/** 가격 — 프라이스 태그 */
export function TagIcon(p: IconProps) {
	return (
		<Svg {...p}>
			<path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8z" />
			<circle cx="7.5" cy="7.5" r="1.2" />
		</Svg>
	);
}

/** 평형 — 면적 */
export function AreaIcon(p: IconProps) {
	return (
		<Svg {...p}>
			<rect x="4" y="4" width="16" height="16" rx="2" />
			<path d="M9 15L15 9" />
			<polyline points="11 9 15 9 15 13" />
		</Svg>
	);
}

/** 관심 — 별 */
export function StarIcon(p: IconProps) {
	return (
		<Svg {...p}>
			<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
		</Svg>
	);
}

/** 기일 — 달력 */
export function CalendarIcon(p: IconProps) {
	return (
		<Svg {...p}>
			<rect x="3" y="5" width="18" height="16" rx="2" />
			<line x1="3" y1="10" x2="21" y2="10" />
			<line x1="8" y1="3" x2="8" y2="7" />
			<line x1="16" y1="3" x2="16" y2="7" />
		</Svg>
	);
}

/** 분포 — 막대 차트 */
export function ChartIcon(p: IconProps) {
	return (
		<Svg {...p}>
			<line x1="3" y1="21" x2="21" y2="21" />
			<line x1="7" y1="21" x2="7" y2="13" />
			<line x1="12" y1="21" x2="12" y2="6" />
			<line x1="17" y1="21" x2="17" y2="16" />
		</Svg>
	);
}

/** 기록 — 연필 */
export function PencilIcon(p: IconProps) {
	return (
		<Svg {...p}>
			<path d="M12 20h9" />
			<path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
		</Svg>
	);
}

/** 물건 없음 — 집 */
export function HouseIcon(p: IconProps) {
	return (
		<Svg {...p}>
			<path d="M4 10L12 4l8 6v9a1 1 0 01-1 1H5a1 1 0 01-1-1z" />
			<path d="M9 20v-6h6v6" />
		</Svg>
	);
}

/** 번개 — 브랜드 포인트 (노랑 채움) */
export function BoltIcon({ size = 22 }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="#FFD43B"
			stroke="#111"
			strokeWidth="2"
			strokeLinejoin="round"
			style={{ flexShrink: 0, verticalAlign: "-2px" }}
		>
			<path d="M13 2L4 14h6l-2 8 9-12h-6l2-8z" />
		</svg>
	);
}
