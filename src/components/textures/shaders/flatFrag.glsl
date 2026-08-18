//This is for Flat Textures but with 3D textures to sample from i,e; animation

uniform bool is360;
uniform bool remapBorders;

in vec2 vUv;
out vec4 Color;

void main() {
    if (maskValue != 0 || useBorderTexture){
        // Get Coordinates
        vec2 realUV = realCoords(vUv);
        // Adjust if reproject
        #ifdef REPROJECT
            realUV = texture(remapTexture, vUv).rg;
            realUV = realCoords(realUV);
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
        texCoord.xy = clamp(texCoord.xy, vec2(0.0), 1. - vec2(EPSILON)); // This prevent the very edges from looping around and causing line artifacts
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
        texCoord.xy = clamp(texCoord.xy, vec2(0.0), 1. - vec2(EPSILON)); // This prevent the very edges from looping around and causing line artifacts
        ivec3 idx = clamp(ivec3(texCoord * textureDepths), ivec3(0), ivec3(textureDepths) - 1);
        int textureIdx = idx.z * zStepSize + idx.y * yStepSize + idx.x;
        vec3 localCoord = texCoord * (textureDepths); // Scale up
    #endif
    localCoord = fract(localCoord);

    float strength = sample1(localCoord, textureIdx);
    rescaler(strength);
    bool isNan = useF16 ? isNaNBits(strength) : strength == 1.;
    if (!isNan){
        strength *= cScale;
        strength = min(strength+cOffset,0.995);
        Color = vec4(texture2D(cmap, vec2(strength, 0.5)).rgb, 1.);
    } else {
        Color = vec4(nanColor, nanAlpha);
    }
    bool valid = (strength >= threshold.x) && (strength <= threshold.y); 
    if (!valid || abs(strength - fillValue) < 0.005){
        Color = vec4(0.);
        return;
    }
}