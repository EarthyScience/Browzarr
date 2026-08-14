//This is for Flat Textures but with 3D textures to sample from i,e; animation

#ifdef IS_FLAT
    uniform sampler2D map[12];
#else
    uniform sampler3D map[12];
#endif
uniform sampler2D maskTexture;
uniform sampler2D cmap;
uniform sampler2D remapTexture;
uniform sampler2D borderTexture;
uniform bool useBorderTexture;
uniform float borderWidth;
uniform vec3 borderColor;
uniform bool is360;
uniform bool remapBorders;
uniform vec3 textureDepths;


uniform float cOffset;
uniform float cScale;
uniform float animateProg;
uniform float nanAlpha;
uniform vec3 nanColor;
uniform vec2 latBounds;
uniform vec2 lonBounds;
uniform vec2 threshold;
uniform int maskValue;
uniform float fillValue;

in vec2 vUv;
out vec4 Color;
#define epsilon 0.0001
#define PI 3.14159265

vec2 realCoords(vec2 uv){
    vec2 normalizedLon = lonBounds/2./PI+0.5;
    vec2 normalizedLat = latBounds/PI+0.5;
    float lonScale = normalizedLon.y-normalizedLon.x;
    float latScale = normalizedLat.y-normalizedLat.x;
    
    float u = uv.x * lonScale + normalizedLon.x;
    float v = uv.y * latScale + normalizedLat.x;

    return vec2(u, v);
}

float sample1(
     #ifdef IS_FLAT
        vec2 p,
    #else
        vec3 p,
    #endif
    int index
    ) { // Shader doesn't support dynamic indexing so we gotta use switching
    if (index == 0) return texture(map[0], p).r;
    else if (index == 1) return texture(map[1], p).r;
    else if (index == 2) return texture(map[2], p).r;
    else if (index == 3) return texture(map[3], p).r;
    else if (index == 4) return texture(map[4], p).r;
    else if (index == 5) return texture(map[5], p).r;
    else if (index == 6) return texture(map[6], p).r;
    else if (index == 7) return texture(map[7], p).r;
    else if (index == 8) return texture(map[8], p).r;
    else if (index == 9) return texture(map[9], p).r;
    else if (index == 10) return texture(map[10], p).r;
    else if (index == 11) return texture(map[11], p).r;
    else return 0.0;
}

void main() {
    if (maskValue != 0 || useBorderTexture){
        // Get Coordinates
        vec2 realUV = realCoords(vUv);
        // Adjust if reproject
        #ifdef REPROJECT
            realUV = texture(remapTexture, realUV).rg;
        #else
            // All reprojected data is made -180 to 180. Don't do this if reprojected
            if (is360) realUV.x = fract(realUV.x + 0.5);
            if (remapBorders){
                // All reprojected data is regularly gridded
                realUV.xy = texture(remapTexture, realUV).ba;
            }
        #endif
        if ( maskValue != 0 ){
            float mask = texture(maskTexture, realUV).r;
            bool cond = maskValue == 1 ? mask<0.5 : mask>=0.5;
            if (cond){
                Color = vec4(nanColor, 1.);
                Color.a = nanAlpha;  
                return;
            }
        } else {
            float borderDist = texture(borderTexture, realUV).r;
            if (borderDist <= borderWidth) {
                Color = vec4(borderColor, 1.0);
                return;
            }
        } 
    }

    int zStepSize = int(textureDepths.y) * int(textureDepths.x); 
    int yStepSize = int(textureDepths.x); 
    #ifdef IS_FLAT
        vec2 texCoord = vUv;
        #ifdef REPROJECT
            vec3 remap = texture(remapTexture,texCoord.xy).rgb;
            texCoord.xy = remap.rg;
            if (remap.b < 0.5) discard;
        #endif
        texCoord.xy = clamp(texCoord.xy, vec2(0.0), 1. - vec2(epsilon)); // This prevent the very edges from looping around and causing line artifacts
        ivec2 idx = clamp(ivec2(texCoord * textureDepths.xy), ivec2(0), ivec2(textureDepths.xy) - 1);
        int textureIdx = idx.y * yStepSize + idx.x;
        vec2 localCoord = texCoord * (textureDepths.xy); // Scale up
    #else
        vec3 texCoord = vec3(vUv, animateProg);
        #ifdef REPROJECT
            vec3 remap = texture(remapTexture,texCoord.xy).rgb;
            texCoord.xy = remap.rg;
            if (remap.b < 0.5) discard;
        #endif
        texCoord.xy = clamp(texCoord.xy, vec2(0.0), 1. - vec2(epsilon)); // This prevent the very edges from looping around and causing line artifacts
        ivec3 idx = clamp(ivec3(texCoord * textureDepths), ivec3(0), ivec3(textureDepths) - 1);
        int textureIdx = idx.z * zStepSize + idx.y * yStepSize + idx.x;
        vec3 localCoord = texCoord * (textureDepths); // Scale up
    #endif
    localCoord = fract(localCoord);

    float strength = sample1(localCoord, textureIdx);
    bool valid = (strength >= threshold.x) && (strength <= threshold.y); 
    if (!valid || abs(strength - fillValue) < 0.005){
        Color = vec4(0.);
        return;
    }
    bool isNaN = strength == 1.;
    float sampLoc = isNaN ? strength: (strength)*cScale;
    sampLoc = isNaN ? strength : min(sampLoc+cOffset,0.995);
    Color = isNaN ? vec4(nanColor, nanAlpha) : vec4(texture2D(cmap, vec2(sampLoc, 0.5)).rgb, 1.);
    // float check = float(texture(remapTexture,texCoord.xy).g >= 0.);
    // Color = vec4(check, 0., 0. , 1.);
    // Color = vec4(1.0, 1.0, 0. , 1.);
}