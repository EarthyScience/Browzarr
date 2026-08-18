attribute float value;
in int vertexIdx;

out float vValue;
out vec2 vUv;

uniform float pointSize;
uniform bool scalePoints;
uniform float scaleIntensity;
uniform float timeScale;
uniform vec4 flatBounds;
uniform vec2 vertBounds;
uniform vec3 shape;
uniform float aspect;

vec3 computeTexCoord(int vertexID) {
    int depth = int(shape.x);
    int height = int(shape.y);
    int width = int(shape.z);

    int sliceSize = width * height;

    int z = vertexID / sliceSize;
    int y = (vertexID % sliceSize) / width;
    int x = vertexID % width;

    float px = (float(x) + 0.5) / float(width);
    float py = (float(y) + 0.5) / float(height);
    float pz = (float(z) + 0.5) / float(depth);

    return vec3(px, py, pz);
}

vec3 givePosition(vec3 texCoord) {
    int depth = int(shape.x);
    int height = int(shape.y);
    int width = int(shape.z);

    float px = (texCoord.x - 0.5);
    float py =  (texCoord.y - 0.5) / aspect;
    float pz = mod(texCoord.z - animateProg, 1.0);
    pz = (pz - 0.5) * timeScale;

    return vec3(px, py, pz) * GLOBAL_SCALE;
}

bool boundsCheck(vec3 loc) {
    vec3 scaledLoc = loc * 2.0 - 1.0; // scales texCoords/UV from [0 ,1] to [-1 - 1] of the sliders

    bool xCheck = scaledLoc.x < flatBounds.x || scaledLoc.x > flatBounds.y;
    bool yCheck = scaledLoc.y < vertBounds.x || scaledLoc.y > vertBounds.y;
    bool zCheck = scaledLoc.z < flatBounds.z || scaledLoc.z > flatBounds.w;

    return (xCheck || zCheck || yCheck);
}

void main() {
    vec3 texCoord = computeTexCoord(vertexIdx);
    if (maskValue != 0 ){ // If using a mask, quick check if vertex is masked out before doing additional rendering
        float mask = texture(maskTexture, texCoord.xy).r;
        bool cond = maskValue == 1 ? mask< 0.5 : mask>=0.5;
        if (cond){ // Masked out. Move off screen
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
            return;
        }
    }
    #ifdef REPROJECT
        vec2 remap = texture(remapTexture, texCoord.xy).rg;
        vec3 newCoord = vec3(remap, texCoord.z);
        if (boundsCheck(newCoord)){
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
            return;
        }
        vec3 position = givePosition(newCoord);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #else
        if (boundsCheck(texCoord)){
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
            return;
        }
        vec3 position = givePosition(texCoord);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #endif
    vUv = texCoord.xy;
    int zStepSize = int(textureDepths.y) * int(textureDepths.x); 
    int yStepSize = int(textureDepths.x); 

    ivec3 idx = clamp(ivec3(texCoord * textureDepths), ivec3(0), ivec3(textureDepths) - 1); // Ivec3 is like running a "floor" operation on all three at once. The clamp is because the very last idx is OOR
    int textureIdx = idx.z * zStepSize + idx.y * yStepSize + idx.x;
    vec3 localCoord = texCoord * textureDepths; // Scale up

    localCoord = fract(localCoord);
    vValue = sample1(localCoord, textureIdx);
    rescaler(vValue);
    bool isnan = isNaNBits(vValue) || (!useF16 && vValue == 1.0);
    if (isnan){gl_Position = vec4(2.0, 2.0, 2.0, 1.0);return;}
    vValue *= cScale;
    vValue = max(min(vValue+cOffset,0.995), 0.0);
    
    bool fillCheck = abs(vValue - fillValue) < 0.005;
    bool valid = (vValue >= threshold.x) && (vValue <= threshold.y); 
    if (!valid || fillCheck){ //Hide points that are outside of value range
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        return;
    }
    #ifndef NO_SCALE
        float pointScale = pointSize/gl_Position.w;
        pointScale = scalePoints ? pointScale*pow(vValue,scaleIntensity) : pointScale;
        
        if (isnan || (pointScale*gl_Position.w < 0.75 && scalePoints)){ //Hide points that are invisible or get too small when scaled
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
            return;
        }
        gl_PointSize =  pointScale;
    #else
        gl_PointSize =  1.;
    #endif

}
