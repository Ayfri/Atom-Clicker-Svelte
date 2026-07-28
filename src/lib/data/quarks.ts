export const QUARK_CHARGE_COLORS = {
	blue: '#4a9eff',
	green: '#3ddc84',
	red: '#ff4d4d',
} as const;

/** Fallback single colour for contexts that cannot render the tri-colour identity (borders, dots, strokes). */
export const QUARK_COLOR = QUARK_CHARGE_COLORS.red;
