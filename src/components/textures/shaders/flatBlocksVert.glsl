 // by Jeran Poehls

attribute vec2 instanceUV;
uniform bool remapBorders;

uniform float aspect;
uniform float displaceZero;
uniform float displacement;



vec3 givePosition(vec2 uv) {
    return vec3(uv.x*2., uv.y/aspect*2., 0.);
}


out float vStrength;
out vec2 vUv;

void main() {
    if (maskValue != 0 || useBorderTexture){
        // Get Coordinates
        vec2 realUV = realCoords(instanceUV);
        vUv = realCoords(instanceUV + (position.xy / vec2(aspect, 1.0)));
        // Adjust if reproject
        #ifdef REPROJECT
            realUV = texture(remapTexture, realUV).rg;
            vUv = texture(remapTexture, vUv).rg;
        #else
            // All reprojected data is made -180 to 180. Don't do this if reprojected
            if (is360){
                realUV.x = fract(realUV.x + 0.5);
                vUv.x = fract(vUv.x + 0.5);
            } 
            if (remapBorders){
                // All reprojected data is regularly gridded
                realUV.xy = texture(remapTexture, realUV).ba;
                vUv.xy = texture(remapTexture, vUv).ba;
            }
        #endif
        if (maskValue != 0 ){
            float mask = texture(maskTexture, realUV).r;
            bool cond = maskValue == 1 ? mask<0.5 : mask>=0.5;
            if (cond){
                gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
                return;
            }
        }
    }
    
    int zStepSize = int(textureDepths.y) * int(textureDepths.x); 
    int yStepSize = int(textureDepths.x); 
    vec3 texCoord = vec3(instanceUV, animateProg);
    #ifdef REPROJECT
        vec3 remap = texture(remapTexture,instanceUV).rgb;
        texCoord.xy = remap.rg;
        if (remap.b < 0.5){
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
            return;
        }
    #endif
    #ifdef IS_FLAT
        ivec2 idx = clamp(ivec2(instanceUV * textureDepths.xy), ivec2(0), ivec2(textureDepths.xy) - 1);
        int textureIdx = idx.y * yStepSize + idx.x;
        vec2 localCoord = instanceUV * (textureDepths.xy); // Scale up
    #else
        ivec3 idx = clamp(ivec3(texCoord * textureDepths), ivec3(0), ivec3(textureDepths) - 1);
        int textureIdx = idx.z * zStepSize + idx.y * yStepSize + idx.x;
        vec3 localCoord = texCoord * textureDepths; // Scale up
    #endif
    localCoord = fract(localCoord);

    float dispStrength = sample1(localCoord, textureIdx);
    rescaler(dispStrength);

    bool isnan = isNaNBits(dispStrength)
        || (!useF16 && dispStrength == 1.0);
    if (isnan){gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return;}// Invalid value. Just hide it

    dispStrength *= cScale;
    dispStrength = max(min(dispStrength+cOffset,0.995), 0.0);

    bool valid = (dispStrength >= threshold.x) && (dispStrength <= threshold.y); 
    if (!valid || abs(dispStrength - fillValue) < 0.005){ // Invalid value. Just hide it
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        return;
    }

    vec2 centeredUV = (instanceUV - vec2(0.5, 0.5)); 
    vec3 planePosition = givePosition(centeredUV);
    float heightFactor = (dispStrength - displaceZero) * displacement;
    vec3 scaledPosition = position;
    scaledPosition.z += 0.005;
    scaledPosition.z *= heightFactor;
    vStrength = dispStrength;
    vec3 worldPosition = planePosition + scaledPosition;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPosition, 1.0);
    

}