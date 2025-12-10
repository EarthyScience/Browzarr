// Made by Gemini

type SizeCalculator<T> = (value: T) => number;

function defaultSizeCalculator<T>(value: T): number {
	if (value instanceof ArrayBuffer) {
		return value.byteLength;
	}
	if (ArrayBuffer.isView(value)) {
		return value.byteLength;
	}
	if (typeof value === "object" && value !== null && "data" in value) {
		const data = (value as any).data;
		if (ArrayBuffer.isView(data)) {
			return data.byteLength;
		}
	}
	// Fallback: use JSON.stringify
	try {
		return JSON.stringify(value).length;
	} catch {
		return 0;
	}
}

interface MemoryLRUOptions<T> {
	maxSize: number;
	sizeCalculator?: SizeCalculator<T>;
}

export class MemoryLRU<K, V> {
	private cache = new Map<K, V>();
	private order: K[] = [];
	public totalSize = 0;
	private maxSize: number;
	private readonly sizeCalculator: SizeCalculator<V>;
	private sizes = new Map<K, number>();

	constructor(options: MemoryLRUOptions<V>) {
		this.maxSize = options.maxSize;
		this.sizeCalculator = options.sizeCalculator ?? defaultSizeCalculator;
	}

	get(key: K): V | undefined {
		if (!this.cache.has(key)) return undefined;
		// Move key to end (most recently used)
		this.order = this.order.filter((k) => k !== key);
		this.order.push(key);
		return this.cache.get(key);
	}

	set(key: K, value: V): void {
		const valueSize = this.sizeCalculator(value);

		if (this.cache.has(key)) {
			// Remove old size
			this.totalSize -= this.sizes.get(key) ?? 0;
		}

		this.cache.set(key, value);
		this.sizes.set(key, valueSize);
		this.totalSize += valueSize;

		// Move key to end (most recently used)
		this.order = this.order.filter((k) => k !== key);
		this.order.push(key);

		// Evict least recently used until under maxSize
		while (this.totalSize > this.maxSize && this.order.length > 0) {
			const oldestKey = this.order[0];
			this.order.shift();
			const oldestSize = this.sizes.get(oldestKey) ?? 0;
			this.cache.delete(oldestKey);
			this.sizes.delete(oldestKey);
			this.totalSize -= oldestSize;
		}
	}

	resize(newSize: number): void {
		if (newSize < 0) {
			throw new Error("Cache size cannot be negative.");
		}
		this.maxSize = newSize;

		// Evict least recently used until under new maxSize
		while (this.totalSize > this.maxSize && this.order.length > 0) {
			const oldestKey = this.order[0];
			this.order.shift();
			const oldestSize = this.sizes.get(oldestKey) ?? 0;
			this.cache.delete(oldestKey);
			this.sizes.delete(oldestKey);
			this.totalSize -= oldestSize;
		}
	}

	has(key: K): boolean {
		return this.cache.has(key);
	}

	delete(key: K): boolean {
		if (!this.cache.has(key)) return false;
		this.totalSize -= this.sizes.get(key) ?? 0;
		this.cache.delete(key);
		this.sizes.delete(key);
		this.order = this.order.filter((k) => k !== key);
		return true;
	}

	clear(): void {
		this.cache.clear();
		this.sizes.clear();
		this.order = [];
		this.totalSize = 0;
	}

	get size(): number {
		return this.cache.size;
	}

	get volume(): number {
		return this.totalSize;
	}

	keys(): IterableIterator<K> {
		return this.cache.keys();
	}

	values(): IterableIterator<V> {
		return this.cache.values();
	}

	entries(): IterableIterator<[K, V]> {
		return this.cache.entries();
	}
}

export default MemoryLRU;
