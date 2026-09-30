# Browser support

> Browsers, WebGL and WebGPU availability.

## Requirements

Browzarr targets **evergreen browsers** — keep your browser up to date.

<table>
<thead>
  <tr>
    <th>
      Feature
    </th>
    
    <th>
      Requirement
    </th>
  </tr>
</thead>

<tbody>
  <tr>
    <td>
      Basic plotting
    </td>
    
    <td>
      WebGL2-capable browser (all modern browsers)
    </td>
  </tr>
  
  <tr>
    <td>
      <a href="/essentials/analytics">
        Analytics
      </a>
    </td>
    
    <td>
      WebGPU (Chrome/Edge 113+, Chromium derivatives)
    </td>
  </tr>
  
  <tr>
    <td>
      Local files
    </td>
    
    <td>
      npm or Julia offline app (any browser)
    </td>
  </tr>
</tbody>
</table>

## WebGPU

WebGPU powers the [analytics](/essentials/analytics) features. Availability:

- **Chrome / Edge** (desktop): supported since v113
- **Firefox / Safari**: rolling out; check your browser version
- Headless/VM environments may expose no GPU — analytics will be unavailable there

You can check support by visiting `chrome://gpu` (Chromium) or a WebGPU test page.

## Known browser-specific issues

- **Safari**: memory pressure on very large cubes can be stricter than in Chromium
- **Firefox**: WebGPU may need to be enabled in settings depending on version

If you hit a browser-specific bug, include your browser/version and OS when opening an issue.
