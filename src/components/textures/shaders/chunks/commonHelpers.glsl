vec2 realCoords(vec2 uv){
    vec2 normalizedLon = lonBounds/2./PI;
    if (!is360)normalizedLon += 0.5;
    
    vec2 normalizedLat = latBounds/PI+0.5;
    float lonScale = normalizedLon.y-normalizedLon.x;
    float latScale = normalizedLat.y-normalizedLat.x;
    
    float u = uv.x * lonScale + normalizedLon.x;
    float v = uv.y * latScale + normalizedLat.x;

    return vec2(u, v);
}

bool isNaNBits(float x) {
    uint bits = floatBitsToUint(x);
    uint exponent = bits & 0x7F800000u;
    uint mantissa = bits & 0x007FFFFFu;
    return (exponent == 0x7F800000u) && (mantissa != 0u);
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

vec2 sample2(
    #ifdef IS_FLAT
        vec2 p,
    #else
        vec3 p,
    #endif
    int index
    ) { // Shader doesn't support dynamic indexing so we gotta use switching
    if (index == 0) return texture(map[0], p).rg;
    else if (index == 1) return texture(map[1], p).rg;
    else if (index == 2) return texture(map[2], p).rg;
    else if (index == 3) return texture(map[3], p).rg;
    else if (index == 4) return texture(map[4], p).rg;
    else if (index == 5) return texture(map[5], p).rg;
    else if (index == 6) return texture(map[6], p).rg;
    else if (index == 7) return texture(map[7], p).rg;
    else if (index == 8) return texture(map[8], p).rg;
    else if (index == 9) return texture(map[9], p).rg;
    else if (index == 10) return texture(map[10], p).rg;
    else if (index == 11) return texture(map[11], p).rg;
    else return vec2(0.0);
}

vec2 sample2ToOrder(
    #ifdef IS_FLAT
        vec2 p,
    #else
        vec3 p,
    #endif
    int index,
    int variable
    ) { // This sets the first value in the vec2 to be variable. 
    vec2 biVar = sample2(p, index);
    if (variable == 0) return biVar;
    else return biVar.gr;
}

vec3 lerpColors(vec3 A, vec3 B, float fac){
    float steps = resolution - 1.0;
    fac = round(fac * steps) / steps;
    return mix(A, B, fac);
}
vec3 darkenColors(vec3 A, vec3 B){
    return min(A, B);
}
vec3 lightenColors(vec3 A, vec3 B){
    return max(A, B);
}
vec3 multiplyColors(vec3 A, vec3 B){
    return clamp(A * B, 0., 1.0);
}
vec3 differenceColors(vec3 A, vec3 B) {
    return abs(A - B); 
}

vec3 colorMixer(float A, float B){
    vec3 bottomColor = lerpColors(bottomLeft, bottomRight, A);
    vec3 leftColor = lerpColors(bottomLeft, topLeft,B);
    switch (mixMode){
        case 0:
            return darkenColors(bottomColor, leftColor);
        case 1:
            return lightenColors(bottomColor, leftColor);
        case 2:
            return multiplyColors(bottomColor, leftColor);
        case 3:
            return differenceColors(bottomColor, leftColor);
        default:
            return darkenColors(bottomColor, leftColor);
    }
}

vec3 bivariateColor(
    #ifdef IS_FLAT
        vec2 p,
    #else
        vec3 p,
    #endif
    int index,
    out bool isNaN
    ){
    vec2 biValues = sample2(p, index);
    if (isNaNBits(biValues.r) || isNaNBits(biValues.g)){
        isNaN = true;
        return vec3(0.0, 0.0, 0.0);
    } else{
        isNaN = false;
        return colorMixer(biValues.r, biValues.g);
    }
}

void denorm(inout float x){
    x *= (valueRange.y - valueRange.x);
    x += valueRange.x;
}

void norm(inout float x){
    x -= valueRange.x;
    x /= (valueRange.y - valueRange.x);
}

void rescaler(inout float x){
    //LOGIC
}

vec2 reprojector(
#ifdef IS_FLAT
    inout vec2 texCoord,
#else
    inout vec3 texCoord,
#endif
    out bool valid
) {
    vec2 originalCoord = texCoord.xy;
    vec2 maskUV = realCoords(texCoord.xy);
    #ifdef REPROJECT
        vec3 remap = texture2D(remapTexture, texCoord.xy).rgb;
        texCoord.xy = remap.rg;
        maskUV = realCoords(remap.rg);
        valid = remap.b > 0.5;
    #else
         // All reprojected data is made -180 to 180. Don't need to adjust
        if (remapBorders){
            // All reprojected data is regularly gridded
            maskUV = originalCoord;
            maskUV.y = 1.0 - maskUV.y; // I'm not certain if this is robust
            maskUV.xy = texture(remapTexture, maskUV).ba;
        }
        valid = true;
    #endif
    if (is360) maskUV.x = fract(maskUV.x + 0.5);
    return maskUV;
}

