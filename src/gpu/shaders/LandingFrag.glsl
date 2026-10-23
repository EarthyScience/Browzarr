// Fragment Shader

in vec3 vColor;
out vec4 Color;

void main() {
    // Simple white color for the points
    Color = vec4(vColor, 0.8);
}