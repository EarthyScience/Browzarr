# Export & Animation

> Static image export, video export, and scripted walkthrough keyframes with pyBrowzarr.

The `export()` method configures a **static image or animated export** of the current
plot. Unlike the other plot methods, `export()` immediately calls `.plot()` for you, so
a single chained call both configures the export and launches the view.

```python
Browzarr(dataset="gs://store", variable="temp").volume().export(main_title="My Map")
```

## `export()` signature

```python
def export(open_browser: bool = True, **kwargs) -> Browzarr
```

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
        open_browser
      </code>
    </td>
    
    <td>
      <code>
        True
      </code>
    </td>
    
    <td>
      Open the browser/iframe after configuring the export. Pass <code>
        False
      </code>
      
       to configure only.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        **kwargs
      </code>
    </td>
    
    <td>
      —
    </td>
    
    <td>
      Any option listed below.
    </td>
  </tr>
</tbody>
</table>

<callout icon="i-lucide-info">

All options are optional — only the keys you pass are included in the export config.
Keys are snake_case in Python and delivered camel-cased to the frontend.

</callout>

## Image options

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
      Description
    </th>
  </tr>
</thead>

<tbody>
  <tr>
    <td>
      <code>
        include_background
      </code>
    </td>
    
    <td>
      <code>
        bool
      </code>
    </td>
    
    <td>
      Include the background. If false then transparent
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        main_title
      </code>
    </td>
    
    <td>
      <code>
        str
      </code>
    </td>
    
    <td>
      Main title drawn on the export.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        custom_res
      </code>
    </td>
    
    <td>
      <code>
        tuple[float, float]
      </code>
    </td>
    
    <td>
      Custom export resolution <code>
        (width, height)
      </code>
      
       in pixels.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        include_axis
      </code>
    </td>
    
    <td>
      <code>
        bool
      </code>
    </td>
    
    <td>
      Draw the axes in the export.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        include_colorbar
      </code>
    </td>
    
    <td>
      <code>
        bool
      </code>
    </td>
    
    <td>
      Draw a colorbar in the export.
    </td>
  </tr>
  
  <tr>
    <td>
      <strong>
        Colorbar Options
      </strong>
    </td>
    
    <td>
      
    </td>
    
    <td>
      
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        cbar_loc
      </code>
    </td>
    
    <td>
      <code>
        str
      </code>
    </td>
    
    <td>
      Colorbar position (<code>
        "left"
      </code>
      
      , <code>
        "right"
      </code>
      
      , <code>
        "top"
      </code>
      
      , <code>
        "bottom"
      </code>
      
      ).
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        cbar_num
      </code>
    </td>
    
    <td>
      <code>
        int
      </code>
    </td>
    
    <td>
      Number of tick marks on the colorbar.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        cbar_label
      </code>
    </td>
    
    <td>
      <code>
        str
      </code>
    </td>
    
    <td>
      Text label shown on the colorbar.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        cbar_units
      </code>
    </td>
    
    <td>
      <code>
        str
      </code>
    </td>
    
    <td>
      Units shown alongside the colorbar label.
    </td>
  </tr>
</tbody>
</table>

```python
.export(
    include_background=True,
    include_colorbar=True,
    include_axis=False,
    cbar_loc="right",
    cbar_num=8,
    cbar_label="Temperature",
    cbar_units="K",
    main_title="July Mean Temperature",
    custom_res=(1920, 1080),
)
```

## Animation options

Enable `animate=True` to produce a video/animation. The following options control how
the animation is driven.

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
      Description
    </th>
  </tr>
</thead>

<tbody>
  <tr>
    <td>
      <code>
        animate
      </code>
    </td>
    
    <td>
      <code>
        bool
      </code>
    </td>
    
    <td>
      Export as animation
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        frames
      </code>
    </td>
    
    <td>
      <code>
        int
      </code>
    </td>
    
    <td>
      Total number of frames to render.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        frame_rate
      </code>
    </td>
    
    <td>
      <code>
        int
      </code>
    </td>
    
    <td>
      Frames per second (FPS) of the output.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        orbit
      </code>
    </td>
    
    <td>
      <code>
        bool
      </code>
    </td>
    
    <td>
      Animate a camera orbit around the globe.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        orbit_deg
      </code>
    </td>
    
    <td>
      <code>
        float
      </code>
    </td>
    
    <td>
      Total degrees of orbit to sweep during the animation duration.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        use_time
      </code>
    </td>
    
    <td>
      <code>
        bool
      </code>
    </td>
    
    <td>
      Animate the time/Z-axis along with the animation.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        time_rate
      </code>
    </td>
    
    <td>
      <code>
        int
      </code>
    </td>
    
    <td>
      Time playback rate (FPS) to play slower or faster than camera FPS.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        loop_time
      </code>
    </td>
    
    <td>
      <code>
        bool
      </code>
    </td>
    
    <td>
      Loop the time axis back to the start when it reaches the end.
    </td>
  </tr>
</tbody>
</table>

```python
.export(
    animate=True,
    frames=120,
    frame_rate=30,
    use_time=True,
    time_rate=1.0,
    loop_time=True,
)
```

### Camera orbit example

```python
.export(
    animate=True,
    frames=180,
    frame_rate=30,
    orbit=True,
    orbit_deg=360.0,
)
```

## Keyframes

For a fully scripted camera/visual walkthrough, pass `keyframes` as a dict (or point to
a file with `keyframes_path`). Each keyframe maps a frame number to a `visual` and
`camera` state, and an optional `time`.

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
      Description
    </th>
  </tr>
</thead>

<tbody>
  <tr>
    <td>
      <code>
        keyframes
      </code>
    </td>
    
    <td>
      <code>
        object
      </code>
    </td>
    
    <td>
      A dict of keyframes. When provided, it is written to a <code>
        keyframes.json
      </code>
      
       file and that path is passed to the frontend.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        keyframes_path
      </code>
    </td>
    
    <td>
      <code>
        str
      </code>
    </td>
    
    <td>
      Path to an existing keyframes JSON file to use instead of passing <code>
        keyframes
      </code>
      
       inline.
    </td>
  </tr>
</tbody>
</table>

```python
from browzarr import Browzarr

keyframes = {
    "0": {
        "visual": {"transparency": 0.0, "valueRange": [0, 1], "nanTransparency": 1},
        "camera": {
            "position": {"x": -4.5, "y": 2.4, "z": 4.8},
            "rotation": {"isEuler": True, "_x": -0.46, "_y": -0.70, "_z": -0.31, "_order": "XYZ"},
        },
        "time": 0,
    },
    "31": {
        "visual": {"transparency": 0.0, "valueRange": [0, 1], "nanTransparency": 1},
        "camera": {
            "position": {"x": 2.2, "y": 2.9, "z": 6.0},
            "rotation": {"isEuler": True, "_x": -0.44, "_y": 0.32, "_z": 0.15, "_order": "XYZ"},
        },
        "time": 0,
    },
}

Browzarr(dataset="gs://store", variable="temperature").volume().export(
    animate=True,
    frames=60,
    frame_rate=30,
    keyframes=keyframes,
)
```

Or reference a file on disk:

```python
Browzarr(dataset="gs://store", variable="temperature").volume().export(
    animate=True,
    frames=60,
    frame_rate=30,
    keyframes_path=r"C:\path\to\keyframes.json",
)
```

<callout icon="i-lucide-shield-alert">

The `keyframes`/`keyframes_path` options are mutually exclusive — provide one or the
other, not both.

</callout>
