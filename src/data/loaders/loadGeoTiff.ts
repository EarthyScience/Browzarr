import { parseGeoKeys } from "@/data/geo/geoKeyParser";
import { useZarrStore } from "@/stores/ZarrStore";
import { useGlobalStore } from "@/stores/GlobalStore";
import { getBaseImage } from "@/data/geo/baseImage";
import { setGTFetchOptions } from "../zarr/GTGetters";
import { FetchStoreOptions } from "@/types/Interfaces";

export const GEOTIFF_EXT_REGEX = /\.(tif|tiff|geotiff|gtif)$/i;

export async function loadGeoTiff(source: File | string, fetchOptions?: FetchStoreOptions | null): Promise<boolean> {
    const { setStatus } = useGlobalStore.getState();
    const isURL = typeof source === "string";
    const name = (isURL ? source.split("/").at(-1) : source.name) || "geotiff.tif";

    setStatus("Loading...");
    try {
        const geotiff = await getBaseImage(source, fetchOptions);
        const imageCount = await geotiff.getImageCount();
        // Single-image files get flat band names; multi-image files are prefixed by image index
        const flat = imageCount === 1;

        const bands: string[] = [];
        const shapes: [number, number][] = [];
        for (let i = 0; i < imageCount; i++) {
            const image = await geotiff.getImage(i);
            const shape: [number, number] = [image.getHeight(), image.getWidth()];
            for (let b = 0; b < image.getSamplesPerPixel(); b++) {
                bands.push(flat ? `band_${b}` : `${i}/band_${b}`);
                shapes.push(shape);
            }
        }

        const firstImage = await geotiff.getImage(0);
        const geoKeys = parseGeoKeys(firstImage.getGeoKeys() as Record<string, any>);
        const baseMeta = { ...geoKeys, imageCount };

        useGlobalStore.setState({
            variables: bands,
            zMeta: bands.map((band, idx) => ({ ...baseMeta, name: band, shape: shapes[idx], chunkShape: shapes[idx] })),
            initStore: isURL ? source : `local:${name}`,
            titleDescription: {
                title: name,
                description: "",
            },
        });
        setGTFetchOptions(isURL ? fetchOptions ?? null : null);
        useZarrStore.setState({ gtSource: source, useGT: true, useNC: false });
        return true;
    } catch (error) {
        console.error(`Failed to load GeoTIFF "${name}":`, error);
        return false;
    } finally {
        setStatus(null);
    }
}
