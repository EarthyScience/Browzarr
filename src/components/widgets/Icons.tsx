import * as React from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  color?: string;
  size?: number | string;
}

const Perspective = ({ color = "currentColor", size = 24, ...props }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect width={48} height={48} fill="none" fillOpacity={0.01} />
    <path
      d="M44 28V36L31 38.6M44 28L4 32M44 28V20M4 32V44L17 41.4M4 32V16M44 20V12L31 9.4M44 20L4 16M4 16V4L17 6.6M31 9.4V38.6M31 9.4L17 6.6M31 38.6L17 41.4M17 6.6V41.4"
      stroke={color}
      strokeWidth={4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Orthographic = ({ color = "currentColor", size = 24, ...props }: IconProps) => (
  <svg
    fill={color}
    height={size}
    width={size}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g id="grid">
      <g>
        <path d="M23,24H0V1h23V24z M16,22h5v-5h-5V22z M9,22h5v-5H9V22z M2,22h5v-5H2V22z M16,15h5v-5h-5V15z M9,15h5v-5H9V15z M2,15h5v-5 H2V15z M16,8h5V3h-5V8z M9,8h5V3H9V8z M2,8h5V3H2V8z" />
      </g>
    </g>
  </svg>
);

const Robinson = ({
  color = "currentColor",
  size = 24,
  strokeWidth = 1.5,
  ...props
}: IconProps) => (
  <svg
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={size}
    width={size}
    viewBox="0 0 144.50848 90.925735"
    version="1.1"
    id="svg1"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <defs id="defs1" />
    <g
      id="layer1"
      transform="translate(-33.273725,-104.80649)"
    >
      <rect
        id="rect1"
        width="140.28149"
        height="86.698723"
        x="35.387234"
        y="106.92"
        ry="43.349361"
      />
      <path d="m 136.74638,193.36596 c 0,0 22.74894,-10.69538 22.74894,-43.0966 0,-32.40122 -22.74894,-43.0966 -22.74894,-43.0966" id="path1" />
      <path d="m 122.98796,193.36596 c 0,0 11.88,-12.97027 11.88,-42.84383 0,-29.87356 -11.88,-43.34937 -11.88,-43.34937" id="path2" />
      <path d="m 105.90893,106.66723 v 87.20426" id="path5" />
      <path d="M 34.628936,150.39574 H 175.9251" id="path6" />
      <path d="M 41.959149,129.41617 H 169.35319" id="path7" />
      <path d="M 41.959149,171.37532 H 169.35319" id="path8" />
      <path d="m 75.237779,193.36596 c 0,0 -22.748942,-10.69538 -22.748942,-43.0966 0,-32.40122 22.748942,-43.0966 22.748942,-43.0966" id="path9" />
      <path d="m 88.996198,193.36596 c 0,0 -11.879999,-12.97027 -11.879999,-42.84383 0,-29.87356 11.879999,-43.34937 11.879999,-43.34937" id="path10" />
    </g>
  </svg>
);

const MainLogo1 = ({ //Browzarr
  z1 = "#ffd06f",
  z2 = "#e76254",
  b1 = "#1e466e",
  b2 = "#72bcd5",
  evolution = 0,
  style = {}
}) => (
  <svg
   style={style}
   viewBox="0 0 90.626686 41.817253"
   version="1.1"
   id="svg1"
   xmlnsXlink="http://www.w3.org/1999/xlink"
   xmlns="http://www.w3.org/2000/svg">
   <defs>
      <linearGradient id="a"
        x1={136.338}
        x2={135.218}
        y1={-30.737}
        y2={67.38}
        gradientTransform="matrix(.38937 0 0 .38937 95.12 102.52)"
        gradientUnits="userSpaceOnUse"
      >
        <stop
          offset={0}
          style={{
            stopColor: z1,
            stopOpacity: 1,
          }}
        />
        <stop
          offset={1}
          style={{
            stopColor: z2,
            stopOpacity: 1,
          }}
        />
      </linearGradient>
      <linearGradient id="b"
        x1={145.102}
        x2={53.317}
        y1={-125.885}
        y2={-86.83}
        gradientTransform={`rotate(60 -40.741 134.039) scale(.38937)`}
        gradientUnits="userSpaceOnUse"
      >
        <stop
          offset={0}
          style={{
            stopColor: b1,
            stopOpacity: 1,
          }}
        />
        <stop
          offset={1}
          style={{
            stopColor: b2,
            stopOpacity: 1,
          }}
        />
      </linearGradient>
    </defs>
  <g
     id="g5"
     transform="rotate(30,252.15716,-193.13177)">
    <path
       id="path2"
      style={{
        fill: "url(#b)",
        strokeWidth: 1.28474,
        paintOrder: "fill markers stroke",
      }}
       d="m 134.34818,104.21358 c 2.04841,3.54853 4.09702,7.09685 6.14583,10.64514 0.0464,-0.1378 0.0989,-0.27386 0.15856,-0.40725 1.10272,-2.02156 2.24956,-4.01881 3.40311,-6.01203 -0.76491,-1.32525 -1.52973,-2.6505 -2.29463,-3.97575 -1.95838,-0.001 -3.91665,-0.003 -5.875,-0.0141 -0.52919,0.0445 -1.05306,-0.0441 -1.53787,-0.23602 z m 9.97933,17.28535 c 2.22002,3.84983 4.42971,7.70566 6.68689,11.53289 0.94197,1.33082 2.93129,1.87935 4.35726,1.00989 1.10832,-0.59974 1.71491,-1.76048 2.28255,-2.83046 1.85196,-3.19707 3.70387,-6.39414 5.55588,-9.59119 -2.42168,3.9e-4 -4.8433,7.8e-4 -7.26498,0.002 -0.71075,1.2329 -1.42217,2.46528 -2.14371,3.69184 -0.71284,-1.22935 -1.4229,-2.4602 -2.13346,-3.69084 -1.55223,3.5e-4 -3.10443,7.8e-4 -4.65666,0.001 -0.88481,0.0246 -1.80711,0.0438 -2.68377,-0.12455 z" />
    <path
       id="path3"
       style={{
        fill: "url(#a)",
        strokeWidth: 0.973424,
        paintOrder: "fill markers stroke",
      }}
       d="m 135.2745,97.756312 c -1.63932,0.05517 -3.0879,1.556836 -3.03234,3.206518 0.004,1.45143 1.23875,2.80033 2.7031,2.85813 0.8653,0.0576 1.73337,-0.007 2.59991,0.022 3.24175,0.005 6.48355,-0.007 9.72527,0.0132 -1.8542,3.18875 -3.70171,6.38334 -5.52671,9.58853 -0.42119,0.78667 -0.98706,1.53034 -1.11427,2.43743 -0.29985,1.60843 0.33892,3.39695 1.71377,4.32757 0.95069,0.6928 2.1677,0.85929 3.31513,0.79542 5.94265,-0.001 11.8853,-0.003 17.82796,-0.004 0.0335,-1.47285 -0.2543,-3.03528 -1.2296,-4.18975 -1.09387,-1.37654 -2.88606,-2.13816 -4.63602,-2.00983 -3.29358,0.0441 -6.58656,0.12496 -9.88028,0.15902 1.01113,-1.80088 1.98923,-3.62254 2.99302,-5.42854 0.96252,-1.76866 1.94806,-3.52646 2.87381,-5.314 0.76114,-1.83797 0.14859,-4.19217 -1.53314,-5.306583 -0.95695,-0.689765 -2.1743,-0.857673 -3.32598,-0.81825 -4.4911,-0.115716 -8.98216,-0.239833 -13.47363,-0.337002 z" />
  </g>
  <text
     xmlSpace="preserve"
     style={{
        fontStyle: "normal",
        fontVariant: "normal",
        fontWeight: 500,
        fontStretch: "normal",
        fontSize: "19.7556px",
        lineHeight: 0,
        fontFamily: "&quot",
        textAlign: "start",
        writingMode: "horizontal-tb",
        direction: "ltr",
        textAnchor: "start",
        fill: "currentColor",
        stroke: "currentColor",
        strokeWidth: 0.4,
        strokeDasharray: "none",
        paintOrder: "fill markers stroke",
      }} x="19.870007"
     y="34.579861"
     id="text4"><tspan
       id="tspan4"
       style={{
          fontStyle: "normal",
          fontVariant: "normal",
          fontWeight: 500,
          fontStretch: "normal",
          fontSize: "19.7556px",
          fontFamily: "&quot",
          fill: "currentColor",
          stroke: "currentColor",
          strokeWidth: 0.4,
          strokeDasharray: "none",
        }}x="19.870007"
       y="34.579861">rowzarr</tspan></text>
</svg>
)

const MainLogo2 = ({ //browZarr
  z1 = "#ffd06f",
  z2 = "#e76254",
  b1 = "#1e466e",
  b2 = "#72bcd5",
  evolution = 0,
  style = {}
}) => (
  <svg
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    viewBox="-3 0 95.871 36.706"
  >
    <defs>
      <linearGradient id="a">
        <stop
          offset={0}
          style={{
            stopColor: z1,
            stopOpacity: 1,
          }}
        />
        <stop
          offset={1}
          style={{
            stopColor: z2,
            stopOpacity: 1,
          }}
        />
      </linearGradient>
      <linearGradient id="b">
        <stop
          offset={0}
          style={{
            stopColor: b1,
            stopOpacity: 1,
          }}
        />
        <stop
          offset={1}
          style={{
            stopColor: b2,
            stopOpacity: 1,
          }}
        />
      </linearGradient>
      <linearGradient
        xlinkHref="#a"
        id="d"
        x1={136.338}
        x2={135.218}
        y1={-30.737}
        y2={67.38}
        gradientTransform="matrix(.38937 0 0 .38937 -.628 4.763)"
        gradientUnits="userSpaceOnUse"
      />
      <linearGradient
        xlinkHref="#b"
        id="c"
        x1={145.102}
        x2={53.317}
        y1={-125.885}
        y2={-86.83}
        gradientTransform="rotate(60 -3.956 2.24) scale(.38937)"
        gradientUnits="userSpaceOnUse"
      />
    </defs>
    
    <text
      xmlSpace="preserve"
      x={-1.143}
      y={23.38}
      style={{
        fontStyle: "normal",
        fontVariant: "normal",
        fontWeight: 500,
        fontStretch: "normal",
        fontSize: "19.7556px",
        lineHeight: 0,
        fontFamily: "&quot",
        textAlign: "start",
        writingMode: "horizontal-tb",
        direction: "ltr",
        textAnchor: "start",
        fill: "currentColor",
        stroke: "currentColor",
        strokeWidth: 0.4,
        strokeDasharray: "none",
        paintOrder: "fill markers stroke",
      }}
    >
      <tspan
        x={-4.143}
        y={23.38}
        style={{
          fontStyle: "normal",
          fontVariant: "normal",
          fontWeight: 500,
          fontStretch: "normal",
          fontSize: "19.7556px",
          fontFamily: "&quot",
          fill: "currentColor",
          stroke: "currentColor",
          strokeWidth: 0.4,
          strokeDasharray: "none",
        }}
      >
        {"brow"}
      </tspan>
    </text>
    <text
      xmlSpace="preserve"
      x={68.016}
      y={23.38}
      style={{
        fontStyle: "normal",
        fontVariant: "normal",
        fontWeight: 500,
        fontStretch: "normal",
        fontSize: "19.7556px",
        lineHeight: 0,
        fontFamily: "&quot",
        textAlign: "start",
        writingMode: "horizontal-tb",
        direction: "ltr",
        textAnchor: "start",
        fill: "currentColor",
        stroke: "currentColor",
        strokeWidth: 0.4,
        strokeDasharray: "none",
        paintOrder: "fill markers stroke",
      }}
    >
      <tspan
        x={68.016}
        y={23.38}
        style={{
          fontStyle: "normal",
          fontVariant: "normal",
          fontWeight: 500,
          fontStretch: "normal",
          fontSize: "19.7556px",
          fontFamily: "&quot",
          fill: "currentColor",
          stroke: "currentColor",
          strokeWidth: 0.4,
          strokeDasharray: "none",
        }}
      >
        {"arr"}
      </tspan>
    </text>
    <path
      d="m 38.599651,6.1615326 c 2.04841,3.548526 4.09702,7.0968514 6.14583,10.6451414 0.0464,-0.137798 0.0989,-0.273863 0.15856,-0.407254 1.10272,-2.021563 2.24956,-4.018807 3.40311,-6.012025 -0.76491,-1.3252514 -1.52973,-2.6505054 -2.29463,-3.9757554 -1.95838,-0.0014 -3.91665,-0.0033 -5.875,-0.01408 -0.52919,0.04452 -1.05306,-0.04413 -1.53787,-0.236022 z m 9.97933,17.2853494 c 2.22002,3.84983 4.42971,7.70566 6.68689,11.53289 0.94197,1.33082 2.93129,1.87935 4.35726,1.00989 1.10832,-0.59974 1.71491,-1.76048 2.28255,-2.83046 1.85196,-3.19707 3.70387,-6.39414 5.55588,-9.59119 -2.42168,3.9e-4 -4.8433,7.8e-4 -7.26498,0.002 -0.71075,1.2329 -1.42217,2.46528 -2.14371,3.69184 -0.71284,-1.22935 -1.4229,-2.4602 -2.13346,-3.69084 -1.55223,3.5e-4 -3.10443,7.8e-4 -4.65666,0.001 -0.88481,0.0246 -1.80711,0.0438 -2.68377,-0.12455 z" 
      style={{
        fill: "url(#c)",
        strokeWidth: 1.28474,
        paintOrder: "fill markers stroke",
      }}
    />
    <path
      d="M39.526 0c-1.64.055-3.088 1.557-3.032 3.207.004 1.451 1.238 2.8 2.703 2.858.865.057 1.733-.007 2.6.022 3.241.005 6.483-.008 9.725.013a1218.351 1218.351 0 0 0-5.527 9.589c-.421.786-.987 1.53-1.114 2.437-.3 1.608.339 3.397 1.714 4.328.95.692 2.167.859 3.315.795l17.828-.004c.033-1.473-.255-3.035-1.23-4.19-1.094-1.376-2.886-2.138-4.636-2.01-3.293.044-6.586.125-9.88.16 1.011-1.802 1.99-3.623 2.993-5.43.962-1.768 1.948-3.526 2.874-5.313.76-1.838.148-4.192-1.533-5.307C55.369.465 54.15.298 53 .337 48.508.221 44.017.097 39.526 0z"
      style={{
        fill: "url(#d)",
        strokeWidth: 0.973424,
        paintOrder: "fill markers stroke",
      }}
    />
  </svg>
)




export { Perspective, Orthographic, Robinson, MainLogo1, MainLogo2 };