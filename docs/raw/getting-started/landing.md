# Crash Course

> User Interface.

When Browzarr loads, you land on the main view: the **main menu** at the top lets
you load data and configure your plot, while the **floating menu** overlays the
plot area with view and export controls.

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

### <icon className="icon-lg" name="i-heroicons-adjustments-horizontal"></icon> Settings

### <icon className="icon-lg" name="i-ph-play-pause-fill"></icon> Animation controls

### <icon className="icon-lg" name="i-ph-math-operations-bold"></icon> Apply operations

WebGPU-powered analytics — see [Analytics](/essentials/analytics).

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

Do you want to use the output somewhere else? either has a static image or a video? we got you covered! See [Animation & export](/guides/animation-and-export).

### <icon className="icon-lg" name="i-ic-outline-rocket-launch"></icon> Performance mode

Toggles performance mode for smoother interaction with very large datasets. See [Performance mode](/guides/performance-mode).

## Footer

The footer links to the project's GitHub repository, documentation, and version information.

</prose-steps>
