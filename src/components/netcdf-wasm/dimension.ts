// Dimension class similar to netcdf4-python

export class Dimension {
    constructor(
        public readonly name: string,
        public readonly size: number,
        public readonly isUnlimited: boolean = false
    ) {}

    __len__(): number {
        return this.size;
    }

    toString(): string {
        const sizeStr = this.isUnlimited ? 'unlimited' : this.size.toString();
        return `<netCDF4.Dimension '${this.name}': size = ${sizeStr}>`;
    }
}