uniform sampler2D cmap;
uniform float cOffset;
uniform float cScale;

varying float vStrength;

out vec4 Color;


void main() {
    float strength = vStrength;

    strength *= cScale;
    strength = min(strength+cOffset,0.996);

    vec3 sampColor = texture(cmap, vec2(strength, 0.5)).rgb;

    Color = vec4(sampColor, 1.0);
    
}