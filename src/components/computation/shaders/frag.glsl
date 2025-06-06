uniform sampler2D data;
uniform sampler2D cmap;

varying vec2 vUv;
out vec4 Color;

void main() {
    vec4 val = texture(data,vUv);
    vec4 color = texture(cmap, vec2(val.x,0.5));
    // vec4 color = vec4(val.r > .9);
    // color.a = 1.;
    color.a = val.x > 0.999 ? 0. : 1.;

    Color = color;
}