# Quickstart

> Install pyBrowzarr and go from zero to your first Browzarr plot.

This guide gets you from install to your first plot.

## 1. Install

```bash
pip install browzarr
```

## 2. Create a Browzarr session

A `Browzarr` object describes *what* to visualize. You give it a dataset and a variable,
then optionally adjust what visual characteristics to highlgiht.

```python
from browzarr import Browzarr

bz = Browzarr(dataset="path://some-zarr-store", variable="temperature")
```

### Constructor fields

<table>
<thead>
  <tr>
    <th>
      Field
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
        dataset
      </code>
    </td>
    
    <td>
      <code>
        str
      </code>
    </td>
    
    <td>
      <em>
        (required)
      </em>
    </td>
    
    <td>
      Zarr store path or NetCDF <code>
        .nc
      </code>
      
       / <code>
        .nc4
      </code>
      
       / <code>
        .netcdf
      </code>
      
       file.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        variable
      </code>
    </td>
    
    <td>
      <code>
        str
      </code>
    </td>
    
    <td>
      <em>
        (required)
      </em>
    </td>
    
    <td>
      The variable name to visualize.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        variable2
      </code>
    </td>
    
    <td>
      <code>
        str
      </code>
    </td>
    
    <td>
      None
    </td>
    
    <td>
      The name of a second variable for bivariate plotting.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        share_scale
      </code>
    </td>
    
    <td>
      <code>
        str
      </code>
    </td>
    
    <td>
      <code>
        false
      </code>
    </td>
    
    <td>
      Whether both variables use the same scale/units.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        x_slice
      </code>
    </td>
    
    <td>
      <code>
        tuple[int, int | None]
      </code>
    </td>
    
    <td>
      <code>
        (0, None)
      </code>
    </td>
    
    <td>
      X-axis slice (start, stop). <code>
        None
      </code>
      
       means "to the end".
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        y_slice
      </code>
    </td>
    
    <td>
      <code>
        tuple[int, int | None]
      </code>
    </td>
    
    <td>
      <code>
        (0, None)
      </code>
    </td>
    
    <td>
      Y-axis slice.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        z_slice
      </code>
    </td>
    
    <td>
      <code>
        tuple[int, int | None]
      </code>
    </td>
    
    <td>
      <code>
        (0, None)
      </code>
    </td>
    
    <td>
      Z-axis slice.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>
        extra_params
      </code>
    </td>
    
    <td>
      <code>
        dict
      </code>
    </td>
    
    <td>
      <code>
        {}
      </code>
    </td>
    
    <td>
      Additional parameters merged into the plot state (advanced, see <a href="/pybrowzarr/api-reference">
        API Reference
      </a>
      
      ).
    </td>
  </tr>
</tbody>
</table>

```python
# Load only a subset of a large dataset
bz = Browzarr(
    dataset="gs://some-zarr-store",
    variable="temperature",
    z_slice=(0, 50),
    y_slice=(10, 200),
    x_slice=(10, 200),
)
```

## 3. Choose a plot type

Pick one plot method to configure the visualization. Each returns the same `Browzarr`
object so you can keep chaining or store it.

```python
bz.volume()      # 3D volume render
# bz.points()    # point cloud
# bz.flat()      # flat (3D-displaceable) surface
# bz.sphere()    # globe/sphere
```

You can pass options directly:

```python
bz.volume(colormap="inferno", transparency=0.5)
```

Options for each plot are found in the [API Reference](/pybrowzarr/api-reference):
[Common](/pybrowzarr/api-reference#common-options), [Volume](/pybrowzarr/api-reference#volume), [Points](/pybrowzarr/api-reference#points), [Flat & Sphere](/pybrowzarr/api-reference#flat-sphere).

## 4. Launch the plot

```python
bz.plot()
```

`plot()` starts (or reuses) a local server and opens the view. Where it appears depends
on your environment — see [Environments](/pybrowzarr/environment).

### Getting the URL instead of opening a browser

```python
url = bz.plot(give_url=True)
print(url)  # https://browzarr.io/latest/?data=...
```

Provides a url to the plot that you can open in a browser or share with others.

## Full example

```python
from browzarr import Browzarr

Browzarr(
    dataset="gs://some-zarr-store",
    variable="temperature",
    z_slice=(0, 40),
).volume(
    colormap="turbo",
    transparency=0.6,
    value_range=(270, 310),
).plot()
```

## Next steps

- Explore plot-specific options: [Plot Types](/pybrowzarr/api-reference#plot-types)
- Full API details: [API Reference](/pybrowzarr/api-reference)
- Export and animate: [Export & Animation](/pybrowzarr/export)
