import * as zarr from 'zarrita'
import { json_decode_object, json_encode_object } from 'node_modules/zarrita/dist/src/util';

function is_meta_key(key: string) {
    return (key.endsWith(".zarray") ||
        key.endsWith(".zgroup") ||
        key.endsWith(".zattrs") ||
        key.endsWith("zarr.json"));
}
function is_v3(meta: any) {
    return "zarr_format" in meta && meta.zarr_format === 3;
}
async function ZarrParser(files: any, store: any){
    const fileCount = files.length;
    const vars = []
    const metadata: { [key: string]: any } = {}
    for (let i=0; i < fileCount; i++){
        const file = files[i] 
        if (file.name === '.zarray' || file.name ==='.zattrs' || file.name === 'zarr.json'){
            let relativePath = file.webkitRelativePath
            const parts = relativePath.split('/')
            parts.shift();
            relativePath = parts.join('/')
            vars.push('/' + relativePath)
        }
    }
    for (const variable of vars){
        const decoded = await store.get(variable)
        metadata[variable.slice(1)] = json_decode_object(decoded)
    }
    const v2_meta = {metadata, zarr_consolidated_format: 1}
    const known_meta: { [key: string]: any } = {};
    for (const [key, value] of Object.entries(v2_meta.metadata)) {
        known_meta[`/${key}`] = value;
    }
    return {
        async get(key: string, opts?: any): Promise<any> {
            if (known_meta[key]) {
            return json_encode_object(known_meta[key]);
            }
            const maybe_bytes = await store.get(key, opts);
            if (is_meta_key(key) && maybe_bytes) {
            const meta = json_decode_object(maybe_bytes);
            known_meta[key] = meta;
            }
            return maybe_bytes;
        },
        // Delegate range requests to the underlying store.
        // Note: Supporting range requests for consolidated metadata is possible
        // but unlikely to be useful enough to justify the effort.
        getRange: store.getRange?.bind(store),
        contents() {
            const contents = [];
            for (const [key, value] of Object.entries(known_meta)) {
                const parts = key.split("/");
                const filename = parts.pop();
                const path = (parts.join("/") || "/");
                if (filename === ".zarray")
                    contents.push({ path, kind: "array" });
                if (filename === ".zgroup")
                    contents.push({ path, kind: "group" });
                if (is_v3(value)) {
                    contents.push({ path, kind: value.node_type });
                }
            }
            return contents;
        },
    };
}

export default ZarrParser