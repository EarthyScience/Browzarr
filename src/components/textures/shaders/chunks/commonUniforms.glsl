
#ifdef IS_FLAT
    uniform sampler2D map[12]; // We are limited to 16 textures. Cmap counts as one. 15 is weird so we use 12. 
#else
    uniform sampler3D map[12];
#endif
uniform sampler2D maskTexture;
uniform sampler2D cmap;
uniform sampler2D remapTexture;
uniform sampler2D borderTexture;
uniform bool remapBorders;
uniform bool useBorderTexture;
uniform float borderWidth;
uniform vec3 borderColor;
uniform vec3 textureDepths;


uniform bool is360;
uniform float cOffset;
uniform float cScale;
uniform vec2 threshold;
uniform float animateProg;
uniform float nanAlpha;
uniform vec3 nanColor;
uniform int maskValue;
uniform float fillValue;
uniform vec2 latBounds;
uniform vec2 lonBounds;
uniform vec2 valueRange;
uniform bool useF16;

#define EPSILON 0.000001
#define PI 3.1415926535