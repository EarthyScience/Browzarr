declare module "js-colormaps-es" {
	export function evaluate_cmap(
		value: number,
		name: string,
		reverse?: boolean,
	): [number, number, number];
	export const data: Record<string, unknown>;
}
