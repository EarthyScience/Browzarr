---
seo:
  title: browzarr.io
  description: A powerful, browser-native framework for visualizing, exploring, and analyzing Zarr and NetCDF datasets.
---

::u-page-hero
#title
Explore your data with [Browzarr]{.text-cta}

#description
A powerful framework for visualizing, exploring, and analyzing **Zarr and NetCDF datasets** — runs entirely in the browser, whether your data is local or in the cloud.

#links
  :::u-button
  ---
  size: xl
  to: https://browzarr.io/
  icon: i-lucide-globe
  target: _blank
  class: "!bg-transparent !shadow-lg bg-linear-to-tr from-pink-500 to-yellow-500 text-white hover:opacity-90"
  ---
  Try it online
  :::

  :::u-button
  ---
  color: neutral
  size: xl
  to: /getting-started/landing
  trailing-icon: i-lucide-plane-landing
  ---
  Get started
  :::

  :::u-button
  ---
  color: neutral
  icon: simple-icons-github
  size: xl
  to: https://github.com/EarthyScience/Browzarr
  target: _blank
  variant: outline
  ---
  Give us a Star :icon{name="i-ph-star-fill" class="icon-md star-halo-wrapper" style="color: #f59e0b"}
  :::
::

::u-page-section
---
class: "hero-gradient"
---
#title
Install & run anywhere

#description
Use Browzarr online with no setup, or run it fully [offline]{.text-primary} via [npm](https://nodejs.org/en/download){target="_blank"} or [Julia](https://julialang.org/downloads/){target="_blank"}.

#features
  :::u-page-feature
  ---
  icon: i-lucide-globe
  to: https://browzarr.io
  target: _blank
  class: "ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl p-4 hover:ring-gray-300 dark:hover:ring-gray-600 transition-all duration-200"
  ---
  #title
  [Online]{.text-primary} — [ No Install ]
  #description
  Open browzarr.io in any browser. Load local or remote Zarr and NetCDF files instantly.
  :::

  :::u-page-feature
  ---
  icon: simple-icons-npm
  to: /getting-started/landing#npm
  class: "ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl p-4 hover:ring-gray-300 dark:hover:ring-gray-600 transition-all duration-200"
  ---
  #title
  [npm]{.text-primary} — [ Offline ]
  #description
  `npm install -g browzarr` then run `browzarr` anytime, no internet needed.
  :::

  :::u-page-feature
  ---
  icon: simple-icons-julia
  to: https://github.com/EarthyScience/Browzarr.jl
  target: _blank
  class: "ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl p-4 hover:ring-gray-300 dark:hover:ring-gray-600 transition-all duration-200"
  ---
  #title
  [ Browzarr.jl] — [ Offline ]
  #description
  `Pkg.add("Browzarr")` then `using Browzarr` and call `browzarr()` with a local path or remote store URL.
  :::
::

::u-page-section
#title
Explore your data in different ways

#features
  :::u-page-feature
  ---
  icon: i-lucide-box
  to: /essentials/plot-settings
  ---
  #title
  Visualize a [Cube]{.text-secondary}
  #description
  Your data is spatio-temporal? Start by exploring it as an interactive 3D data cube.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-globe
  to: /essentials/plot-settings
  ---
  #title
  Project onto a [Sphere]{.text-primary}
  #description
  Render data on a traditional 3D globe for spatial context.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-rectangle-horizontal
  to: /essentials/plot-settings
  ---
  #title
  Flat [map]{.text-primary}
  #description
  Rectangular 2D projections for classic cartographic views.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-chart-line
  to: /essentials/plot-settings
  ---
  #title
  Plot [time series]{.text-primary}
  #description
  Select any pixel in any direction and plot its values over time.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-grip
  to: /essentials/plot-settings
  ---
  #title
  Explore [point clouds]{.text-primary}
  #description
  Visualize high-density spatial data as interactive point clouds.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-brain
  to: /essentials/plot-settings
  ---
  #title
  Run [analytics]{.text-primary}
  #description
  Enable WebGPU for accelerated computation and deeper insights.
  :::
::
