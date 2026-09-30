# Build & Update

> Update or rebuild the Browzarr frontend bundled with the pyBrowzarr package.

The `browzarr` package ships with a **pre-built** copy of the Browzarr web frontend in
`web/dist`. That build is static — to pick up new features or fixes from the upstream
[Browzarr](https://github.com/EarthyScience/Browzarr) project, rebuild or update it.

There are two ways to do this, each suited to a different situation.

## `update_browzarr()` — quick prebuilt update (preferred)

Downloads a pre-built distribution from the upstream `python-dist` branch and swaps it
into the package. This is fast (no compile step) and the recommended way to stay current.

```python
from browzarr import update_browzarr

update_browzarr()
```

What it does:

1. Downloads the `python-dist` tarball from GitHub.
2. Extracts it to a temporary directory.
3. Replaces the package's `web/dist` folder with the new build.

Requires an internet connection and write access to the package's data directory.

## `build_browzarr()` — rebuild from source

Compiles the frontend from the latest upstream `main` source. Use this when you want the
very newest code or are contributing to the frontend itself.

```python
from browzarr import build_browzarr

build_browzarr()
```

What it does:

1. Downloads the latest source from the upstream `main` branch.
2. Runs `pnpm install` and `pnpm run build` in a temporary directory.
3. Copies the built output into the package's `web/dist` folder.

### Prerequisites

[pnpm](https://pnpm.io/installation) must be installed and available on your `PATH`. If
it isn't, `build_browzarr()` prints an installation hint and stops:

```text
pnpm not installed. Install it then run again
https://pnpm.io/installation
```

The build is slower than `update_browzarr()` because it compiles the frontend.

## Troubleshooting

**No frontend build found in 'web/dist'**

The package was installed without the bundled assets (or they were removed). Run
`update_browzarr()` (fast) or `build_browzarr()` (from source) to populate `web/dist`:

```python
from browzarr import update_browzarr
update_browzarr()
```

**Permission errors when writing web/dist**

Both functions write into the installed package's data directory. Make sure you have
write access to that location, or run in an environment where the package is writable
(e.g. a user site-packages install).

## Which should I use?

<table>
<thead>
  <tr>
    <th>
      Situation
    </th>
    
    <th>
      Use
    </th>
  </tr>
</thead>

<tbody>
  <tr>
    <td>
      Just want the latest stable frontend
    </td>
    
    <td>
      <code>
        update_browzarr()
      </code>
    </td>
  </tr>
  
  <tr>
    <td>
      Want the newest in-development frontend
    </td>
    
    <td>
      <code>
        build_browzarr()
      </code>
    </td>
  </tr>
  
  <tr>
    <td>
      Missing <code>
        web/dist
      </code>
      
       after install
    </td>
    
    <td>
      <code>
        update_browzarr()
      </code>
    </td>
  </tr>
</tbody>
</table>
