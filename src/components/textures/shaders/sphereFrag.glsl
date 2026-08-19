 // by Jeran Poehls
out vec4 color;
in vec3 aPosition;

vec2 giveUV(vec3 position){
    vec3 n = normalize(position);
    float latitude = asin(n.y);
    float longitude = -atan(n.z, n.x);
    latitude = (latitude - latBounds.x)/(latBounds.y - latBounds.x);
    longitude = (longitude - lonBounds.x)/(lonBounds.y - lonBounds.x);

    return vec2(longitude, latitude);
}

vec2 giveMaskUV(vec3 position){
    vec3 n = normalize(position);
    float latitude = asin(n.y);
    float longitude = -atan(n.z, n.x);
    latitude /= PI;
    longitude /= (2. * PI);
    float u = longitude + 0.5;
    float v = latitude + 0.5;
    return vec2(u, v);
}

void main(){
    if (maskValue != 0 || useBorderTexture){
        vec2 maskUV = giveMaskUV(aPosition);
        if (is360) maskUV.x = fract(maskUV.x + 0.5);
        if (maskValue != 0){
            float mask = texture(maskTexture, maskUV).r;
            bool cond = maskValue == 1 ? mask<0.5 : mask>=0.5;
            if (cond){
                color = vec4(nanColor, 1.);
                color.a = nanAlpha;  
                return;
            }
        } else {
            float borderDist = texture(borderTexture, maskUV).r;
            float latFac = cos(maskUV.y);
            if (borderDist <= borderWidth * latFac) {
                color = vec4(borderColor, 1.0);
                return;
            }
        }
    }
    vec2 sampleCoord = giveUV(aPosition);
    #ifdef REPROJECT
            vec3 remap = texture(remapTexture, sampleCoord).rgb;
            sampleCoord = remap.rg;
            if (remap.b < 0.5) sampleCoord = vec2(2.0); // I don't think this is ever the case
    #endif
    bool inBounds = all(greaterThanEqual(sampleCoord, vec2(0.0))) &&
    all(lessThanEqual(sampleCoord, vec2(1.0)));
    if (inBounds) {
        int zStepSize = int(textureDepths.y) * int(textureDepths.x); 
        int yStepSize = int(textureDepths.x); 
        #ifdef IS_FLAT
            ivec2 idx = clamp(ivec2(sampleCoord * textureDepths.xy), ivec2(0), ivec2(textureDepths.xy) - 1);
            int textureIdx = idx.y * yStepSize + idx.x;
            vec2 localCoord = sampleCoord * (textureDepths.xy); // Scale up
        #else
            vec3 texCoord = vec3(sampleCoord, animateProg);
            ivec3 idx = clamp(ivec3(texCoord * textureDepths), ivec3(0), ivec3(textureDepths) - 1);
            int textureIdx = idx.z * zStepSize + idx.y * yStepSize + idx.x;
            vec3 localCoord = texCoord * (textureDepths); // Scale up
        #endif
        localCoord = fract(localCoord);
        float strength = sample1(localCoord, textureIdx);
        rescaler(strength);
        bool isnan = isNaNBits(strength) || (!useF16 && ( strength == 1.0))
            || abs(strength - fillValue) < 0.005;
        if (!isnan){
            strength *= cScale;
            strength = max(min(strength+cOffset,0.995), 0.0); // clamp color to [0, 1]
            color = vec4(texture2D(cmap, vec2(strength, 0.5)).rgb, 1.);
        } else {
            color = vec4(nanColor, nanAlpha);
        }
        bool valid = (strength >= threshold.x) && (strength <= threshold.y); 
        if (!valid){
            color = vec4(0.);
            return;
        }
        return;
    } 
    color = vec4(nanColor, nanAlpha);
}