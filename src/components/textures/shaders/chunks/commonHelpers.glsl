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

bool isNaNBits(float x) {
    uint bits = floatBitsToUint(x);
    uint exponent = bits & 0x7F800000u;
    uint mantissa = bits & 0x007FFFFFu;
    return (exponent == 0x7F800000u) && (mantissa != 0u);
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

