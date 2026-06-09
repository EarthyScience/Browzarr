# Landing

> User Interface.

## npm (offline)

Install once, run anytime - no internet required after install:

```bash
npm install -g browzarr
```

Then launch:

```bash
browzarr
```

On a custom port:

```bash
browzarr --port 8080
# or via environment variable (macOS/Linux)
PORT=8080 browzarr
# Windows PowerShell
$env:PORT=8080; browzarr
# Windows CMD
set "PORT=8080" && browzarr
```

By default, Browzarr starts on port `3000`. If that port is already in use, it will automatically try the next available one.

## Main menu

<steps>

### <icon className="icon-lg" name="i-tabler-database-plus"></icon> Select dataset

Use the `database` icon to load curated datasets or your own!

### <icon className="icon-lg" name="i-tabler-variable"></icon> Select variable

now, use the `variable` icon to select the variable you would like to see and click plot!

### Change plot type

<icon className="icon-lg" name="i-ph-cube-light">



</icon>

 Cube: usually for spatio-temporal variables, `x-y-t`.

<icon className="icon-lg" name="i-gg-menu-grid-o">



</icon>

 Point clouds

<icon className="icon-lg" name="i-ph-sphere-thin">



</icon>

 Sphere projection

<icon className="icon-lg" name="i-mdi-square-outline">



</icon>

 Rectangular projection

There some default plotting options depending on your dataset dimensions, however you could change to a different plot type if your data dimensions allow it.

### <icon className="icon-lg" name="i-noto-v1-artist-palette"></icon> Change Colormap

Hover the colormap options to see how your plot will change, then click on the one you like to setup that one!

### <icon className="icon-lg" name="i-lucide-settings"></icon> Settings

### <icon className="icon-lg" name="i-ph-play-pause-fill"></icon> Animation controls

### <icon className="icon-lg" name="i-ph-math-operations-bold"></icon> Apply operations

WebGPU-powered analytics.

</steps>

## Floating menu

<prose-steps>

### <icon className="icon-lg" name="i-ic-round-flip-camera-ios"></icon> Reset camera

Did you move around a lot? then click the reset camera icon.

### View

<icon className="icon-lg" name="i-cil-grid">



</icon>

 Orthographic

<icon className="icon-lg" name="i-icon-park-outline-perspective">



</icon>

 Perspective

### <icon className="icon-lg" name="i-codicon-graph-line"></icon> Plot lines: 1D transects

Click to view 1D transects (line plots) through the given dimension.

### <icon className="icon-lg" name="i-ion-image"></icon> Export images and animations

Do you want to use the output somewhere else? either has a static image or a video? we got you covered!

### <icon className="icon-lg" name="i-ic-outline-rocket-launch"></icon> Performance mode

</prose-steps>
