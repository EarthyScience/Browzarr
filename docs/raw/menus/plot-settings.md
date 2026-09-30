# Plot Settings

> Plot types, axes, camera and rendering options.

## Plot types

Depending on the dimensions of your variable, Browzarr offers several ways to render it:

<table>
<thead>
  <tr>
    <th>
      Type
    </th>
    
    <th>
      Best for
    </th>
  </tr>
</thead>

<tbody>
  <tr>
    <td>
      <icon className="icon-lg" name="i-ph-cube-light">
        
      </icon>
      
       <strong>
        Cube
      </strong>
    </td>
    
    <td>
      Spatio-temporal variables (<code>
        x-y-t
      </code>
      
      ) explored as an interactive 3D data cube
    </td>
  </tr>
  
  <tr>
    <td>
      <icon className="icon-lg" name="i-ph-sphere-thin">
        
      </icon>
      
       <strong>
        Sphere
      </strong>
    </td>
    
    <td>
      Projecting data onto a 3D globe
    </td>
  </tr>
  
  <tr>
    <td>
      <icon className="icon-lg" name="i-mdi-square-outline">
        
      </icon>
      
       <strong>
        Flat map
      </strong>
    </td>
    
    <td>
      Rectangular 2D projections for classic cartographic views
    </td>
  </tr>
  
  <tr>
    <td>
      <icon className="icon-lg" name="i-gg-menu-grid-o">
        
      </icon>
      
       <strong>
        Point cloud
      </strong>
    </td>
    
    <td>
      High-density spatial data as interactive 3D points
    </td>
  </tr>
  
  <tr>
    <td>
      <strong>
        Morphing points
      </strong>
    </td>
    
    <td>
      Animated transitions of point-based data between states
    </td>
  </tr>
</tbody>
</table>

There are default plotting options depending on your dataset dimensions; however you can change to a different plot type if your data dimensions allow it. See the [plot types reference](/reference/plot-types) for the exact requirements.

## Axis selection and cropping

Sliders along the plot axes let you choose which slices of each dimension are displayed. Drag the handles to crop the viewed extent in time, latitude, longitude, or any other dimension.

## Camera

The floating menu switches between:

- <icon className="icon-lg" name="i-cil-grid">



</icon>

 **Orthographic** — parallel projection, no perspective distortion
- <icon className="icon-lg" name="i-icon-park-outline-perspective">



</icon>

 **Perspective** — natural depth perception

Use the reset camera icon to return to the default view.

## Rendering extras

- **Reprojection** — change the map projection used by flat maps
- **Land masks** — mask out land (or ocean) pixels
- **Country borders** — overlay coastlines and political borders for spatial context
