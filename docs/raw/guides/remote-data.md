# Remote data

> Visualize remote Zarr and Icechunk stores.

Browzarr fetches chunks over HTTP(S) directly from the store's host, exactly like a `zarr.open(...)` from Python would — only in your browser.

## Opening a remote store

1. Open the dataset modal (`database` icon)
2. Pick an entry from the curated catalog, or switch to the remote tab and paste a URL
3. Select a variable and plot

Supported remote backends:

- **Zarr** — any HTTP/S3-hosted store (`.zarr`/zarr.json layout)
- **Icechunk** — Icechunk repositories over S3/HTTP

## CORS

Because the browser (not a server) performs the requests, the remote host must send permissive **CORS** headers:

```text
Access-Control-Allow-Origin: *
# or restrict to the Browzarr origin
Access-Control-Allow-Origin: https://browzarr.io
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
Access-Control-Expose-Headers: Content-Length, Content-Range
```

<callout icon="i-lucide-shield-alert">

If a store loads in Python but not in Browzarr, missing `Access-Control-Allow-Origin` on the bucket is almost always the reason. Configure the bucket (S3, GCS, or your static host) to allow the Browzarr origin.

</callout>

## Known-good public stores

The curated catalog entries are verified to work (they already ship correct CORS settings) and double as configuration examples, e.g.:

- SeasFire Cube — `https://s3.bgc-jena.mpg.de:9000/misc/seasfire_rechunked.zarr`
- NASA MUR SST — `https://mur-sst.s3.us-west-2.amazonaws.com/zarr-v1/`
- CMIP6 stores on Google Cloud Storage

## Tips

- Prefer stores with consolidated metadata (`.zmetadata` / `zarr.json`) — the initial parse is much faster
- Chunk sizes of 1–10 MB per chunk fetch work best
- Use the [variable sliders](/essentials/variable-selection) to limit the first load of very large cubes
