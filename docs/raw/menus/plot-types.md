# Plot types

> Every plot type and its dimension requirements.

Browzarr suggests default plot types based on the dimensions of the selected variable; you can switch types whenever the data allows.

<table>
<thead>
  <tr>
    <th>
      Plot type
    </th>
    
    <th>
      Icon
    </th>
    
    <th>
      Typical dimensions
    </th>
    
    <th>
      Description
    </th>
  </tr>
</thead>

<tbody>
  <tr>
    <td>
      <strong>
        Data cube
      </strong>
    </td>
    
    <td>
      <code>
        cube
      </code>
    </td>
    
    <td>
      <code>
        (x, y, t)
      </code>
    </td>
    
    <td>
      Interactive 3D cube; slice along any axis
    </td>
  </tr>
  
  <tr>
    <td>
      <strong>
        Sphere
      </strong>
    </td>
    
    <td>
      <code>
        sphere
      </code>
    </td>
    
    <td>
      <code>
        (lat, lon[, t])
      </code>
    </td>
    
    <td>
      Data projected onto a 3D globe
    </td>
  </tr>
  
  <tr>
    <td>
      <strong>
        Flat map
      </strong>
    </td>
    
    <td>
      <code>
        square
      </code>
    </td>
    
    <td>
      <code>
        (lat, lon[, t])
      </code>
    </td>
    
    <td>
      Rectangular 2D projection
    </td>
  </tr>
  
  <tr>
    <td>
      <strong>
        Point cloud
      </strong>
    </td>
    
    <td>
      <code>
        grid
      </code>
    </td>
    
    <td>
      scattered/spatial points
    </td>
    
    <td>
      High-density spatial data as 3D points
    </td>
  </tr>
</tbody>
</table>

## Choosing a type

- If your variable has a **time** dimension, any spatial type can be animated
- Use **cube** to explore the full spatio-temporal structure first, then switch to **sphere**/**flat** for presentation-quality maps
- **Point cloud** types are best for ungridded or high-density data

## Limitations

- Sphere/flat projections require regular (or at least resolvable) lat/lon coordinates
- Very large point clouds benefit from [performance mode](/guides/performance-mode)
