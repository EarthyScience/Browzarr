# API Reference

> Full reference for the pyBrowzarr public API — Browzarr, its methods, module functions, and plot-type options.

This page documents the public, user-facing API. Everything lives under the `browzarr`
package.

## Exports

```python
from browzarr import Browzarr, build_browzarr, update_browzarr, main
```

<table>
<thead>
  <tr>
    <th>
      Name
    </th>
    
    <th>
      Kind
    </th>
    
    <th>
      Purpose
    </th>
  </tr>
</thead>

<tbody>
  <tr>
    <td>
      <code>
        Browzarr
      </code>
    </td>
    
    <td>
      class
    </td>
    
    <td>
      The user-facing configuration object.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        build_browzarr()
      </code>
    </td>
    
    <td>
      function
    </td>
    
    <td>
      Rebuild the bundled frontend from the upstream source.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        update_browzarr()
      </code>
    </td>
    
    <td>
      function
    </td>
    
    <td>
      Update the bundled frontend from the prebuilt <code>
        python-dist
      </code>
      
       branch.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        main()
      </code>
    </td>
    
    <td>
      function
    </td>
    
    <td>
      Command-line entry point (<code>
        browzarr
      </code>
      
       launcher).
    </td>
  </tr>
</tbody>
</table>

## `Browzarr`

A `Browzarr` object holds the configuration for a single visualization. Set attributes
or pass them as keyword arguments, chain a plot type, then call `.plot()`.

### Constructor

```python
Browzarr(
    dataset,                       # str, required
    variable,                      # str, required
    x_slice=(0, None),             # tuple[int, int | None]
    y_slice=(0, None),             # tuple[int, int | None]
    z_slice=(0, None),             # tuple[int, int | None]
    extra_params={},               # dict[str, Any]
)
```

All fields are also accessible as attributes after construction.

`extra_params` is a catch-all dictionary that gets merged into the final plot state.
Use it to pass any option not explicitly modeled — keys are camel-cased automatically.

```python
bz = Browzarr(dataset="gs://store", variable="temp")
bz.extra_params["myCustomOption"] = True
```

<callout icon="i-lucide-shield-alert">

There is no keyword validation — any unexpected keyword on a plot method is silently
serialized rather than raising. Be careful with typos.

</callout>

### Plot methods

Each of these records the plot configuration and returns `self`, so calls can be chained
or stored.

```python
def volume(**kwargs) -> Browzarr   # 3D volume render
def points(**kwargs) -> Browzarr   # point cloud
def flat(**kwargs)   -> Browzarr   # flat surface (can be displaced)
def sphere(**kwargs) -> Browzarr   # globe/sphere
```

Only the *last* plot method called takes effect. See the [common options](#common-options)
and the plot-type-specific sections below for the accepted keyword arguments.

```python
bz = Browzarr(dataset="gs://store", variable="temp")
bz.volume(transparency=0.5).points(point_size=3)   # points() wins — last call
```

### Export method

```python
def export(open_browser: bool = True, **kwargs) -> Browzarr
```

Configures an export (with optional animation) and immediately launches the plot by
calling `.plot()`. See [Export & Animation](/pyBrowzarr/export) for the accepted keyword
arguments.

```python
Browzarr(dataset="gs://store", variable="temp").volume().export(
    main_title="My Map",
    animate=True,
    frames=120,
    frame_rate=30,
)
```

### `plot()`

```python
def plot(
    width=720,
    height=720,
    give_url: bool = False,
    external_browser: bool = False,
    wait: float = 0.3,
) -> str | None
```

Launches (or reuses) the local Browzarr server and opens the view configured on this
object.

<table>
<thead>
  <tr>
    <th>
      Argument
    </th>
    
    <th>
      Default
    </th>
    
    <th>
      Description
    </th>
  </tr>
</thead>

<tbody>
  <tr>
    <td>
      <code>
        width
      </code>
    </td>
    
    <td>
      <code>
        720
      </code>
    </td>
    
    <td>
      Iframe width in Jupyter/Colab.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        height
      </code>
    </td>
    
    <td>
      <code>
        720
      </code>
    </td>
    
    <td>
      Iframe height in Jupyter/Colab.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        give_url
      </code>
    </td>
    
    <td>
      <code>
        False
      </code>
    </td>
    
    <td>
      When <code>
        True
      </code>
      
      , returns the hosted URL string instead of opening anything.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        external_browser
      </code>
    </td>
    
    <td>
      <code>
        False
      </code>
    </td>
    
    <td>
      Force opening in an external browser, bypassing environment detection.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        wait
      </code>
    </td>
    
    <td>
      <code>
        0.3
      </code>
    </td>
    
    <td>
      Seconds to wait before opening, so the server is ready.
    </td>
  </tr>
</tbody>
</table>

Return value: the URL string when `give_url=True`, otherwise `None`.

```python
bz.plot()
bz.plot(give_url=True)          # -> "https://browzarr.io/latest/?data=..."
bz.plot(width=900, height=600)  # larger iframe in notebooks
bz.plot(external_browser=True)  # always open in the OS browser
```

Where the view opens is auto-detected. See [Environments](/pyBrowzarr/environment).

## Plot types

The four plot types below share a common set of options; each also accepts its own
type-specific keyword arguments. Unset options use their default values.

### Common options

Every plot method (`volume()`, `points()`, `flat()`, `sphere()`) accepts the keyword
arguments below.

<table>
<thead>
  <tr>
    <th>
      Option
    </th>
    
    <th>
      Type
    </th>
    
    <th>
      Default
    </th>
    
    <th>
      Description
    </th>
  </tr>
</thead>

<tbody>
  <tr>
    <td>
      <code>
        colormap
      </code>
    </td>
    
    <td>
      <code>
        str
      </code>
    </td>
    
    <td>
      <code>
        "Spectral"
      </code>
    </td>
    
    <td>
      Name of the colormap to use (e.g. <code>
        "turbo"
      </code>
      
      , <code>
        "inferno"
      </code>
      
      ).
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        flip_colormap
      </code>
    </td>
    
    <td>
      <code>
        bool
      </code>
    </td>
    
    <td>
      <code>
        false
      </code>
    </td>
    
    <td>
      Reverse the colormap direction.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        bottom_left
      </code>
    </td>
    
    <td>
      <code>
        str
      </code>
    </td>
    
    <td>
      <img alt="#ffffff" src="https://img.shields.io/badge/-%23ffffff-ffffff?style=flat-square" />
    </td>
    
    <td>
      Corner color of the bivariate colormap (bottom left).
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        top_left
      </code>
    </td>
    
    <td>
      <code>
        str
      </code>
    </td>
    
    <td>
      <img alt="#2a9d8f" src="https://img.shields.io/badge/-%232a9d8f-2a9d8f?style=flat-square" />
    </td>
    
    <td>
      Corner color of the bivariate colormap (top left).
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        bottom_right
      </code>
    </td>
    
    <td>
      <code>
        str
      </code>
    </td>
    
    <td>
      <img alt="#e63946" src="https://img.shields.io/badge/-%23e63946-e63946?style=flat-square" />
    </td>
    
    <td>
      Corner color of the bivariate colormap (bottom right).
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        resolution
      </code>
    </td>
    
    <td>
      <code>
        int
      </code>
    </td>
    
    <td>
      <code>
        10
      </code>
    </td>
    
    <td>
      Resolution of the bivariate colormap texture grid.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        mix_mode
      </code>
    </td>
    
    <td>
      <code>
        int
      </code>
    </td>
    
    <td>
      <code>
        2
      </code>
    </td>
    
    <td>
      Mixing mode of the colormap: <code>
        0
      </code>
      
       = darken, <code>
        1
      </code>
      
       = lighten, <code>
        2
      </code>
      
       = multiply, <code>
        3
      </code>
      
       = difference
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        bivariate_selection
      </code>
    </td>
    
    <td>
      <code>
        int
      </code>
    </td>
    
    <td>
      <code>
        0
      </code>
    </td>
    
    <td>
      Which variable to send to the colormap when bivariate and only one value should be shown.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        value_range
      </code>
    </td>
    
    <td>
      <code>
        tuple[float, float]
      </code>
    </td>
    
    <td>
      <code>
        (0, 1)
      </code>
    </td>
    
    <td>
      Fixed <code>
        (min, max)
      </code>
      
       bounds of the color mapping.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        show_borders
      </code>
    </td>
    
    <td>
      <code>
        bool
      </code>
    </td>
    
    <td>
      <code>
        false
      </code>
    </td>
    
    <td>
      Draw country/coastline borders over the plot.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        use_border_texture
      </code>
    </td>
    
    <td>
      <code>
        bool
      </code>
    </td>
    
    <td>
      <code>
        false
      </code>
    </td>
    
    <td>
      Draw the borders into the shaders instead of physical lines
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        border_width
      </code>
    </td>
    
    <td>
      <code>
        float
      </code>
    </td>
    
    <td>
      <code>
        0.05
      </code>
    </td>
    
    <td>
      Line width of the borders. (<strong>
        Requires
      </strong>
      
       <em>
        use_border_texture=True
      </em>
      
      )
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        border_color
      </code>
    </td>
    
    <td>
      <code>
        str
      </code>
    </td>
    
    <td>
      <code>
        "#000000"
      </code>
    </td>
    
    <td>
      Border color (CSS color string).
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        lon_extent
      </code>
    </td>
    
    <td>
      <code>
        tuple[float, float]
      </code>
    </td>
    
    <td>
      Detects automatically. If fail then --> <code>
        (-180, 180)
      </code>
    </td>
    
    <td>
      Longtude extent of data.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        lat_extent
      </code>
    </td>
    
    <td>
      <code>
        tuple[float, float]
      </code>
    </td>
    
    <td>
      Detects automatically. If fail then --> <code>
        (-90, 90)
      </code>
    </td>
    
    <td>
      Latitude extent of data.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        lon_resolution
      </code>
    </td>
    
    <td>
      <code>
        float
      </code>
    </td>
    
    <td>
      Detects automatically. If fail then --> <code>
        1
      </code>
    </td>
    
    <td>
      Grid resolution (degrees).
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        lat_resolution
      </code>
    </td>
    
    <td>
      <code>
        float
      </code>
    </td>
    
    <td>
      Detects automatically. If fail then --> <code>
        1
      </code>
    </td>
    
    <td>
      Grid resolution (degrees)g.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        interp_pixels
      </code>
    </td>
    
    <td>
      <code>
        bool
      </code>
    </td>
    
    <td>
      <code>
        false
      </code>
    </td>
    
    <td>
      Interpolate between pixels for smoother rendering.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        use_ortho
      </code>
    </td>
    
    <td>
      <code>
        bool
      </code>
    </td>
    
    <td>
      <code>
        false
      </code>
    </td>
    
    <td>
      Use an orthographic camera.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        fill_value
      </code>
    </td>
    
    <td>
      <code>
        float
      </code>
    </td>
    
    <td>
      <code>
        None
      </code>
    </td>
    
    <td>
      Value to treat as the data fill/missing value.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        mask_feature
      </code>
    </td>
    
    <td>
      <code>
        Literal[0, 1, 2]
      </code>
    </td>
    
    <td>
      <code>
        0
      </code>
    </td>
    
    <td>
      Mask by geographic feature: <code>
        0
      </code>
      
       = no mask, <code>
        1
      </code>
      
       = mask land, <code>
        2
      </code>
      
       = mask ocean.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        mask_value
      </code>
    </td>
    
    <td>
      <code>
        float
      </code>
    </td>
    
    <td>
      <code>
        None
      </code>
    </td>
    
    <td>
      Value to mask out.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        camera_position
      </code>
    </td>
    
    <td>
      <code>
        Vector3
      </code>
    </td>
    
    <td>
      <code>
        [0, 0, 5]
      </code>
    </td>
    
    <td>
      Camera position <code>
        {x, y, z}
      </code>
      
      .
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        native_CRS
      </code>
    </td>
    
    <td>
      <code>
        str
      </code>
    </td>
    
    <td>
      <code>
        None
      </code>
    </td>
    
    <td>
      Native CRS of the data (used for reprojection).
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        dest_CRS
      </code>
    </td>
    
    <td>
      <code>
        str
      </code>
    </td>
    
    <td>
      <code>
        None
      </code>
    </td>
    
    <td>
      Target CRS to reproject to. When both CRS options are set, reprojection is enabled.
    </td>
  </tr>
</tbody>
</table>

See [`extra_params`](#constructor) above for how pass-through keyword arguments are
merged into the final plot state.

```python
from browzarr import Browzarr

Browzarr(dataset="gs://some-zarr-store", variable="temperature").volume(
    colormap="inferno",
    transparency=0.5,
    value_range=(270, 310),
).plot()
```

### volume()

The volume plot renders the variable as a 3D volumetric data cube. It is selected with
the `volume()` method:

```python
from browzarr import Browzarr

Browzarr(dataset="gs://some-zarr-store", variable="temperature").volume(
    colormap="turbo",
    transparency=0.6,
    value_range=(270, 310),
).plot()
```

In addition to the [common options](#common-options), `volume()` accepts the following
volume-specific keyword arguments. Unset options fall back to the frontend's default
state, listed below.

<table>
<thead>
  <tr>
    <th>
      Option
    </th>
    
    <th>
      Type
    </th>
    
    <th>
      Default
    </th>
    
    <th>
      Description
    </th>
  </tr>
</thead>

<tbody>
  <tr>
    <td>
      <code>
        use_ray_march
      </code>
    </td>
    
    <td>
      <code>
        bool
      </code>
    </td>
    
    <td>
      <code>
        false
      </code>
    </td>
    
    <td>
      Use Ray Marcher renderer. If false, volume uses DDA render
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        transparency
      </code>
    </td>
    
    <td>
      <code>
        float
      </code>
    </td>
    
    <td>
      <code>
        0
      </code>
    </td>
    
    <td>
      Global opacity of the rendered volume, from <code>
        0
      </code>
      
       (opaque) to <code>
        1
      </code>
      
       (fully transparent).
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        nan_transparency
      </code>
    </td>
    
    <td>
      <code>
        float
      </code>
    </td>
    
    <td>
      <code>
        1
      </code>
    </td>
    
    <td>
      Opacity applied to cells whose value is missing (NaN / <code>
        fill_value
      </code>
      
      ).
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        quality
      </code>
    </td>
    
    <td>
      <code>
        float
      </code>
    </td>
    
    <td>
      <code>
        200
      </code>
    </td>
    
    <td>
      The quality of the ray marcher renderer. Higher values mean smaller step-sizes and better visuals. (<strong>
        Requires
      </strong>
      
       <em>
        use_ray_march=True
      </em>
      
      )
    </td>
  </tr>
</tbody>
</table>

### points()

The points plot renders the variable as a high-density interactive 3D point cloud. It is
selected with the `points()` method:

```python
from browzarr import Browzarr

Browzarr(dataset="gs://some-zarr-store", variable="temperature").points(
    point_size=3,
).plot()
```

In addition to the [common options](#common-options), `points()` accepts the following
point-specific keyword arguments. Unset options fall back to the frontend's default
state, listed below.

<table>
<thead>
  <tr>
    <th>
      Option
    </th>
    
    <th>
      Type
    </th>
    
    <th>
      Default
    </th>
    
    <th>
      Description
    </th>
  </tr>
</thead>

<tbody>
  <tr>
    <td>
      <code>
        point_size
      </code>
    </td>
    
    <td>
      <code>
        float
      </code>
    </td>
    
    <td>
      <code>
        5
      </code>
    </td>
    
    <td>
      Base size of the rendered points.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        time_scale
      </code>
    </td>
    
    <td>
      <code>
        float
      </code>
    </td>
    
    <td>
      <code>
        1
      </code>
    </td>
    
    <td>
      Scaling factor applied to points along the z-axis. Higher values spread them out.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        scale_points
      </code>
    </td>
    
    <td>
      <code>
        bool
      </code>
    </td>
    
    <td>
      <code>
        false
      </code>
    </td>
    
    <td>
      Scale point size with the data value (intensity-scaled points).
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        scale_intensity
      </code>
    </td>
    
    <td>
      <code>
        float
      </code>
    </td>
    
    <td>
      <code>
        1
      </code>
    </td>
    
    <td>
      How exaggerated point scaling is.
    </td>
  </tr>
</tbody>
</table>

### flat() - sphere()

Both the Flatmap and Sphere renderes present a 2D slice/representation of data that can be displaced in 3D.

```python
from browzarr import Browzarr

Browzarr(dataset="gs://some-zarr-store", variable="temperature").flat().plot()
Browzarr(dataset="gs://some-zarr-store", variable="temperature").sphere().plot()
```

In addition to the [common options](#common-options), `flat()` and `sphere()` accept the
keyword arguments below. Unset options fall back to the frontend's default state, listed
below.

#### Shared by `flat()` and `sphere()`

<table>
<thead>
  <tr>
    <th>
      Option
    </th>
    
    <th>
      Type
    </th>
    
    <th>
      Default
    </th>
    
    <th>
      Description
    </th>
  </tr>
</thead>

<tbody>
  <tr>
    <td>
      <code>
        displace_faces
      </code>
    </td>
    
    <td>
      <code>
        bool
      </code>
    </td>
    
    <td>
      <code>
        false
      </code>
    </td>
    
    <td>
      Displace the individual faces according to the data values.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        displacement
      </code>
    </td>
    
    <td>
      <code>
        float
      </code>
    </td>
    
    <td>
      <code>
        0
      </code>
    </td>
    
    <td>
      Magnitude of the vertical displacement of the surface/faces.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        offset_negatives
      </code>
    </td>
    
    <td>
      <code>
        bool
      </code>
    </td>
    
    <td>
      <code>
        true
      </code>
    </td>
    
    <td>
      Offset negative values so the surface is not displaced below the base plane/globe.
    </td>
  </tr>
</tbody>
</table>

#### `flat()` only

<table>
<thead>
  <tr>
    <th>
      Option
    </th>
    
    <th>
      Type
    </th>
    
    <th>
      Default
    </th>
    
    <th>
      Description
    </th>
  </tr>
</thead>

<tbody>
  <tr>
    <td>
      <code>
        rotate_flat
      </code>
    </td>
    
    <td>
      <code>
        bool
      </code>
    </td>
    
    <td>
      <code>
        false
      </code>
    </td>
    
    <td>
      Rotate the flat surface to face up along the Y-axis.
    </td>
  </tr>
</tbody>
</table>

## Session lifecycle

### `BrowzarrSession.shutdown()`

A single local server is shared across all `Browzarr` instances in the same process, so
repeated `.plot()` calls reuse it instead of spawning duplicates.

To stop the shared server and free its port:

```python
from browzarr.api import BrowzarrSession

BrowzarrSession.shutdown()
```

## Module functions

### `build_browzarr()`

Rebuilds the bundled frontend distribution from the upstream source.

```python
from browzarr import build_browzarr

build_browzarr()
```

Requires [pnpm](https://pnpm.io/installation) on your `PATH`.

1. Downloads the latest source from the `main` branch of the upstream repo.
2. Runs `pnpm install` and `pnpm run build`.
3. Replaces `web/dist` with the freshly built output.

The build output is written in the package data directory, which requires write access.

### `update_browzarr()`

Updates the bundled frontend from the upstream prebuilt `python-dist` branch — faster
than a full source rebuild.

```python
from browzarr import update_browzarr

update_browzarr()
```

Downloads the tarball, extracts it, and replaces `web/dist`.

### `main()`

The command-line entry point registered as the `browzarr` console script. Run it from a
terminal:

```bash
browzarr
```
