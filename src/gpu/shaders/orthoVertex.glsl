 // by Jeran Poehls

out vec3 vOrigin;
out vec3 vDirection;

uniform mat4 modelViewMatrixInverse;

void main() {
  // For orthographic: origin is on the box surface
  vOrigin = position;

  // Camera direction in object space (parallel for all fragments)
  vec4 viewDir = modelViewMatrixInverse * vec4(0.0, 0.0, -1.0, 0.0);
  vDirection = normalize(viewDir.xyz);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}