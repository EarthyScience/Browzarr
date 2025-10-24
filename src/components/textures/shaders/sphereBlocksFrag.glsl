uniform sampler2D cmap;

varying float vStrength;

out vec4 Color;


void main() {
    vec3 sampColor = texture(cmap, vec2(vStrength, 0.5)).rgb;

    Color = vec4(sampColor, 1.0);
    
}