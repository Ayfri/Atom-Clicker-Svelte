const SUFFIXES = [
	"",
	"K",
	"M",
	"B",
	"T",
	"Qa",
	"Qi",
	"Sx",
	"Sp",
	"Oc",
	"No",
	"Dc",
	"UDc",
	"DDc",
	"TDc",
	"QaDc",
	"QiDc",
	"SxDc",
	"SpDc",
	"OcDc",
	"NoDc",
	"Vg",
	"UVg",
	"DVg",
	"TVg",
	"QaVg",
	"QiVg",
	"SxVg",
	"SpVg",
	"OcVg",
	"NoVg",
	"Tg",
	"UTg",
	"DTg",
	"TTg",
	"QaTg",
	"QiTg",
	"SxTg",
	"SpTg",
	"OcTg",
	"NoTg",
	"Qag",
	"UQag",
	"DQag",
	"TQag",
	"QaQag",
	"QiQag",
	"SxQag",
	"SpQag",
	"OcQag",
	"NoQag",
	"Qig",
	"UQig",
	"DQig",
	"TQig",
	"QaQig",
	"QiQig",
	"SxQig",
	"SpQig",
	"OcQig",
	"NoQig",
	"Sxg",
	"USxg",
	"DSxg",
	"TSxg",
	"QaSxg",
	"QiSxg",
	"SxSxg",
	"SpSxg",
	"OcSxg",
	"NoSxg",
	"Spg",
	"USpg",
	"DSpg",
	"TSpg",
	"QaSpg",
	"QiSpg",
	"SxSpg",
	"SpSpg",
	"OcSpg",
	"NoSpg",
	"Ocg",
	"UOcg",
	"DOcg",
	"TOcg",
	"QaOcg",
	"QiOcg",
	"SxOcg",
	"SpOcg",
	"OcOcg",
	"NoOcg",
	"Nog",
	"UNog",
	"DNog",
	"TNog",
	"QaNog",
	"QiNog",
	"SxNog",
	"SpNog",
	"OcNog",
	"NoNog",
	"Dg",
	"UDg",
	"DDg",
	"TDg",
	"QaDg",
	"QiDg",
	"SxDg",
	"SpDg",
	"OcDg",
	"NoDg",
];

export function formatNumber(num: number, precision = 2): string {
	if (!Number.isFinite(num)) {
		throw new Error(`Number '${num}' must be finite.`);
	}

	const absNum = Math.abs(num);

	if (absNum < 1000) {
		return `${num.toFixed(precision)}`;
	}

	const exponent = Math.floor(Math.log(absNum) / Math.log(1000));
	const suffixIndex = Math.min(exponent, SUFFIXES.length - 1);
	const suffix = SUFFIXES[suffixIndex];
	const scaled = num / Math.pow(1000, suffixIndex);

	return `${scaled.toFixed(precision)}${suffix}`;
}

export function shortNumberText(num: number): string {
	const names = [
		'double',
		'triple',
		'quadruple',
		'quintuple',
		'sextuple',
		'septuple',
		'octuple',
		'nonuple',
		'decuple',
	];
	return names[num - 2] || `${num}x`;
}

export function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export function randomBetween(min: number, max: number): number {
	return Math.random() * (max - min) + min;
}

export function randomValue<T>(array: T[]): T {
	return array[Math.floor(Math.random() * array.length)];
}
