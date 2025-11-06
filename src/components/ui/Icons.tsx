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

export { Perspective, Orthographic };