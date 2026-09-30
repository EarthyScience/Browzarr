# Overview

> pyBrowzarr — the Python API for configuring and launching Browzarr plots from your code.

**pyBrowzarr** is a Python package that serves a pre-built [Browzarr](https://browzarr.io)
frontend from a local HTTP server and opens it
in your browser (or notebook). It gives you a Pythonic, chainable API to configure a
plot and launch it with a single call.

## What you can do

- Tune shared and plot-type-specific options (colormaps, extents, transparency, and more).
- Export the result or script an animation with walkthrough keyframes.
- Run from a terminal, Jupyter/JupyterLab, VS Code, or Google Colab automatically.

## Installation

```bash
pip install browzarr
```

The `browzarr` command-line launcher is also installed:

```bash
browzarr
```

A pre-built frontend comes bundled with the package. See
[Build & Update](/pybrowzarr/build-and-update) to rebuild it from source or update it.

## First plot

```python
from browzarr import Browzarr

Browzarr(dataset="path://some-zarr-store", variable="some_variable").volume().plot()
```

That's it — a configured Browzarr view opens in your default browser.

## Documentation map

<table>
<thead>
  <tr>
    <th>
      Guide
    </th>
    
    <th>
      Covers
    </th>
  </tr>
</thead>

<tbody>
  <tr>
    <td>
      <a href="/pybrowzarr/quickstart">
        Quickstart
      </a>
    </td>
    
    <td>
      Install, <code>
        Browzarr
      </code>
      
       basics, slicing, launching a plot
    </td>
  </tr>
  
  <tr>
    <td>
      <a href="/pybrowzarr/api-reference">
        API Reference
      </a>
    </td>
    
    <td>
      Full reference for <code>
        Browzarr
      </code>
      
      , its methods, module functions, and plot-type options
    </td>
  </tr>
  
  <tr>
    <td>
      <a href="/pybrowzarr/export">
        Export & Animation
      </a>
    </td>
    
    <td>
      The <code>
        export()
      </code>
      
       method, export options, keyframes, and animation
    </td>
  </tr>
  
  <tr>
    <td>
      <a href="/pybrowzarr/environment">
        Environments
      </a>
    </td>
    
    <td>
      Behavior in terminal, Jupyter, VS Code, and Colab
    </td>
  </tr>
  
  <tr>
    <td>
      <a href="/pybrowzarr/build-and-update">
        Build & Update
      </a>
    </td>
    
    <td>
      <code>
        build_browzarr()
      </code>
      
       and <code>
        update_browzarr()
      </code>
    </td>
  </tr>
</tbody>
</table>
