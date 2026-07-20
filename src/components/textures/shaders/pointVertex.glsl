attribute float value;
in int vertexIdx;

out float vValue;

uniform sampler2D maskTexture;
uniform sampler3D map[12];
uniform vec3 textureDepths;

uniform float pointSize;
uniform bool scalePoints;
uniform float scaleIntensity;
uniform vec2 valueRange;
uniform float timeScale;
uniform float animateProg;
uniform vec4 flatBounds;
uniform vec2 vertBounds;
uniform vec3 shape;
uniform float fillValue;
uniform int maskValue;

#define PI 3.1415925

#ifdef REPROJECT
    uniform sampler2D remapTexture;
#endif

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
    float py =  (texCoord.y - 0.5) / ASPECT_RATIO;
    float pz = (texCoord.z - 0.5) * timeScale;

    return vec3(px, py, pz) * GLOBAL_SCALE;
}

float sample1(vec3 p, int index) { // Shader doesn't support dynamic indexing so we gotta use switching
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
    vec3 texCoord = computeTexCoord(vertexIdx);
    if (maskValue != 0 ){ // If using a mask, quick check if vertex is masked out before doing additional rendering
        float mask = texture(maskTexture, texCoord.xy).r;
        bool cond = maskValue == 1 ? mask< 0.5 : mask>=0.5;
        if (cond){ // Masked out. Move off screen
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
            return;
        }
    }
    int zStepSize = int(textureDepths.y) * int(textureDepths.x); 
    int yStepSize = int(textureDepths.x); 

    ivec3 idx = clamp(ivec3(texCoord * textureDepths), ivec3(0), ivec3(textureDepths) - 1); // Ivec3 is like running a "floor" operation on all three at once. The clamp is because the very last idx is OOR
    int textureIdx = idx.z * zStepSize + idx.y * yStepSize + idx.x;
    vec3 localCoord = texCoord * textureDepths; // Scale up

    localCoord = fract(localCoord);
    vValue = sample1(localCoord, textureIdx);

    #ifdef REPROJECT
        vec2 remap = texture(remapTexture, texCoord.xy).rg;
        vec3 position = givePosition(vec3(remap, texCoord.z));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #else
        vec3 position = givePosition(texCoord);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #endif

    #ifndef NO_SCALE
        float pointScale = pointSize/gl_Position.w;
        pointScale = scalePoints ? pointScale*pow(vValue,scaleIntensity) : pointScale;
        
        if (vValue == 1. || (pointScale*gl_Position.w < 0.75 && scalePoints)){ //Hide points that are invisible or get too small when scaled
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        }
        gl_PointSize =  pointScale;
    #else
        gl_PointSize =  1.;
    #endif
    if (vValue < valueRange.x || vValue > valueRange.y){ //Hide points that are outside of value range
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    }

    vec2 scaledXBounds = vec2(flatBounds.x, flatBounds.y) / 2. + 0.5; // Scale from [-1, 1] to [0, 1] to match texCoords
    vec2 scaledZBounds = vec2(flatBounds.z, flatBounds.w) / 2. + 0.5;
    vec2 scaledYBounds = vec2(vertBounds.x, vertBounds.y) / 2. + 0.5;
    
    bool xCheck = texCoord.x < scaledXBounds.x || texCoord.x > scaledXBounds.y;
    bool zCheck = texCoord.z < scaledZBounds.x || texCoord.z > scaledZBounds.y;
    bool yCheck = texCoord.y < scaledYBounds.x || texCoord.y > scaledYBounds.y;
    bool fillCheck = abs(vValue - fillValue) < 0.005;

    if (xCheck || zCheck || yCheck || fillCheck){ //Hide points that are clipped
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    }

}
