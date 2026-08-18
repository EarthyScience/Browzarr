// by Jeran Poehls
precision highp float;
precision highp sampler3D;

in vec3 vOrigin;
in vec3 vDirection;

out vec4 color;

uniform vec3 scale;
uniform float steps;
uniform vec4 flatBounds;
uniform vec2 vertBounds;
uniform float transparency;
uniform float opacityMag;
uniform bool useClipScale;


vec2 hitBox(vec3 orig, vec3 dir) {
    vec3 box_min = vec3(-(scale * 0.5));
    vec3 box_max = vec3(scale * 0.5);
    vec3 inv_dir = 1.0 / dir;
    vec3 tmin_tmp = (box_min - orig) * inv_dir;
    vec3 tmax_tmp = (box_max - orig) * inv_dir;
    vec3 tmin = min(tmin_tmp, tmax_tmp);
    vec3 tmax = max(tmin_tmp, tmax_tmp);
    float t0 = max(tmin.x, max(tmin.y, tmin.z));
    float t1 = min(tmax.x, min(tmax.y, tmax.z));
    return vec2(t0, t1);
}

void main() {
    vec3 rayDir = normalize(vDirection);
    vec2 bounds = hitBox(vOrigin, rayDir);

    if (bounds.x > bounds.y) discard;

    bounds.x = max(bounds.x, 0.0);

    vec3 p = vOrigin + bounds.x * rayDir;
    vec3 inc = 1.0 / abs(rayDir);
    float delta = min(inc.x, min(inc.y, inc.z));
    delta /= steps;
    vec4 accumColor = vec4(0.0);
    float alphaAcc = 0.0;

    int zStepSize = int(textureDepths.y) * int(textureDepths.x); 
    int yStepSize = int(textureDepths.x); 
    vec3 scaler = 1.0/scale; // Avoid division in loops

    for (float t = bounds.x; t < bounds.y; t += delta) {
        p = vOrigin + rayDir * t;
        if (p.x > -flatBounds.x || p.x < -flatBounds.y) { 
            continue;
        }
        if (-p.z > -flatBounds.z || -p.z < -flatBounds.w) {
            continue;
        }
        if (p.y < vertBounds.x || p.y > vertBounds.y) {
            continue;
        }
        vec3 texCoord = p * scaler + 0.5;
        #ifdef REPROJECT
            vec3 remap = texture2D(remapTexture, texCoord.xy).rgb;
            texCoord.xy = remap.rg;
            if (remap.b < 0.5) {continue;}
        #endif

        if (maskValue != 0){
            vec2 newV = texCoord.xy; 
            vec2 realV = realCoords(newV);
            float mask = texture(maskTexture, realV).r;
            bool cond = maskValue == 1 ? mask<0.5 : mask>=0.5;
            if (cond){
                continue;
            }
        }
        texCoord.z = mod(texCoord.z + animateProg, 1.0001);
        texCoord = clamp(texCoord, vec3(0.0), 1. - vec3(EPSILON)); // This prevents the very end of the dimensions having floating point errors

        ivec3 idx = clamp(ivec3(texCoord * textureDepths), ivec3(0), ivec3(textureDepths) - 1);
        int textureIdx = idx.z * zStepSize + idx.y * yStepSize + idx.x;
        vec3 localCoord = texCoord * (textureDepths);  
        localCoord = fract(localCoord);
        float d = sample1(localCoord, textureIdx);
        rescaler(d);
        bool isnan = (useF16 ? isNaNBits(d) : d == 1.0) || abs(d - fillValue) < 0.005;
        if (!isnan){
            d *= cScale;
            d = max(min(d+cOffset,0.995), 0.0);
        } else {
            accumColor.rgb += (1.0 - alphaAcc) * pow(nanAlpha, 5.) * nanColor.rgb;
            alphaAcc += pow(nanAlpha, 5.);
        }
        bool cond = (d >= threshold.x) && (d <= threshold.y); 
        if (cond) {
            vec4 col = texture(cmap, vec2(d, 0.5));
            float alpha;
            if (useClipScale){
                float normalizedOpacity = clamp((d - threshold.x) / (threshold.y - threshold.x), 0.0, 1.0);
                alpha = pow(max(normalizedOpacity, 0.001), transparency*opacityMag);
            } else {
                alpha = pow(max(d, 0.001), transparency*opacityMag);
            }
            accumColor.rgb += (1.0 - alphaAcc) * alpha * col.rgb;
            alphaAcc += alpha * (1.0 - alphaAcc);
            if (alphaAcc >= 1.0){
                if (useBorderTexture){
                    float borderDist = texture(borderTexture, texCoord.xy).r;
                    if (borderDist <= borderWidth){
                        color = vec4(borderColor, 1.0);
                        return;
                    }
                }
                break;
            }
        }
    }
    accumColor.a = alphaAcc; // Set the final accumulated alpha
    color = accumColor;
    if (color.a == 0.0) discard;
}
