attribute float value;

out float vValue;

uniform sampler2D maskTexture;

uniform float pointSize;
uniform bool scalePoints;
uniform float scaleIntensity;
uniform vec2 valueRange;
uniform float timeScale;
uniform float animateProg;
uniform vec4 flatBounds;
uniform vec2 vertBounds;
uniform vec3 shape;
uniform vec3 nativeShape;
uniform float fillValue;
uniform vec2 latBounds;
uniform vec2 lonBounds;
uniform int maskValue;

#define PI 3.1415925

#ifdef REPROJECT
    #ifdef IS_2D
        uniform sampler2D map[12];
    #else
        uniform sampler3D map[12];
    #endif
    uniform sampler2D remapTexture;
    uniform vec3 textureDepths;

    #ifdef IS_2D
    float sample1(vec2 p, int index) {
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
    #else
    float sample1(vec3 p, int index) {
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
    #endif
#endif

vec3 computePosition(int vertexID) {
    int depth = int(shape.x);
    int height = int(shape.y);
    int width = int(shape.z);

    int sliceSize = width * height;

    int z = vertexID / sliceSize;
    int y = (vertexID % sliceSize) / width;
    int x = vertexID % width;

    #ifdef REPROJECT
        float nativeWidth = nativeShape.z;
        
        float px = (float(x)/float(width) - 0.5) * (nativeWidth / 500.0);
        
        float lonRange = abs(lonBounds.y - lonBounds.x);
        float latRange = abs(latBounds.y - latBounds.x);
        float aspectRatio = lonRange / latRange;
        
        float py = (float(y)/float(height) - 0.5) * (nativeWidth / 500.0) / aspectRatio;
    #else
        float px = (float(x) - (float(width)/2.)) / 500.;
        float py = (float(y) - (float(height)/2.)) / 500.;
    #endif
    #ifdef FLIP_Y
        py = -py;
    #endif
    float pz = (float(depth) > 1.0) ? (float(z) / (float(depth) - 1.0) - 0.5) * (nativeShape.z / 500.0) : 0.0;

    return vec3(px * 2.0, py * 2.0, pz * 2.0);
}
vec2 giveUV(int vertexID){
    int height = int(shape.y);
    int width = int(shape.z);

    int sliceSize = width * height;
    int y = (vertexID % sliceSize) / width;
    int x = vertexID % width;
    float u = float(x)/float(width);
    float v = float(y)/float(height);

    return vec2(u, v);
}
vec2 realCoords(vec2 uv){
    vec2 normalizedLon = lonBounds/2./PI+0.5;
    vec2 normalizedLat = latBounds/PI+0.5;
    float lonScale = normalizedLon.y-normalizedLon.x;
    float latScale = normalizedLat.y-normalizedLat.x;
    
    float u = uv.x * lonScale + normalizedLon.x;
    float v = uv.y * latScale + normalizedLat.x;

    return vec2(u, v);
}

void main() {
    if (maskValue != 0 ){ // If using a mask, quick check if vertex is masked out before doing additional rendering
        vec2 newV = realCoords(giveUV(gl_VertexID));
        float mask = texture(maskTexture, newV).r;
        bool cond = maskValue == 1 ? mask< 0.5 : mask>=0.5;
        if (cond){ // Masked out. Move off screen
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
            return;
        }
    }

    #ifdef REPROJECT
        int targetHeight = int(shape.y);
        int targetWidth = int(shape.z);
        int targetDepth = int(shape.x);
        
        int sliceSize = targetWidth * targetHeight;
        int z = gl_VertexID / sliceSize;
        int y = (gl_VertexID % sliceSize) / targetWidth;
        int x = gl_VertexID % targetWidth;

        float u = float(x) / float(targetWidth);
        float v = float(y) / float(targetHeight);
        
        vec3 remap = texture(remapTexture, vec2(u, v)).rgb;
        if (remap.b < 0.5) {
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
            return;
        }
        
        vec3 texCoord = vec3(remap.rg, float(z) / float(targetDepth));
        
        int zStepSize = int(textureDepths.y) * int(textureDepths.x); 
        int yStepSize = int(textureDepths.x); 
        ivec3 idx = clamp(ivec3(texCoord * textureDepths), ivec3(0), ivec3(textureDepths) - 1);
        int textureIdx = idx.z * zStepSize + idx.y * yStepSize + idx.x;
        #ifdef IS_2D
            vec2 localCoord = texCoord.xy * textureDepths.xy;
            localCoord = fract(localCoord);
            vValue = sample1(localCoord, textureIdx);
        #else
            vec3 localCoord = texCoord * textureDepths;
            localCoord = fract(localCoord);
            vValue = sample1(localCoord, textureIdx);
        #endif
    #else
        vValue = float(value)/255.;
    #endif
    vec3 scaledPos = computePosition(gl_VertexID);
    float depthSize = (float(shape.x) > 1.0) ? (nativeShape.z / 500.0) : 0.001;

    scaledPos.z += depthSize;
    scaledPos.z = mod(scaledPos.z + animateProg*depthSize*2., depthSize*2.);
    scaledPos.z -= depthSize;

    scaledPos.z *= timeScale;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(scaledPos, 1.0);

    #ifndef NO_SCALE
        float pointScale = pointSize/gl_Position.w;
        pointScale = scalePoints ? pointScale*pow(vValue,scaleIntensity) : pointScale;
        
        if (value == 255. || (pointScale*gl_Position.w < 0.75 && scalePoints)){ //Hide points that are invisible or get too small when scalled
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        }
        gl_PointSize =  pointScale;
    #else
        gl_PointSize =  1.;
    #endif
    if (vValue < valueRange.x || vValue > valueRange.y){ //Hide points that are outside of value range
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    }
    
    #ifdef REPROJECT
        float nativeWidth = nativeShape.z;
        float lonRange = abs(lonBounds.y - lonBounds.x);
        float latRange = abs(latBounds.y - latBounds.x);
        float aspectRatio = lonRange / latRange;

        float scaleX = nativeWidth / 500.0;
        float scaleY = (nativeWidth / 500.0) / aspectRatio;
    #else
        float scaleX = float(shape.z) / 500.0; //width scaling
        float scaleY = float(shape.y) / 500.0; //height scaling
    #endif
    float scaleZ = (float(shape.x) > 1.0) ? (nativeShape.z / 500.0) : 0.001; //depth scaling
    
    vec2 scaledXBounds = vec2(flatBounds.x, flatBounds.y) * scaleX;
    vec2 scaledZBounds = vec2(flatBounds.z, flatBounds.w) * scaleZ * timeScale;
    vec2 scaledYBounds = vec2(vertBounds.x, vertBounds.y) * scaleY;
    
    bool xCheck = scaledPos.x < scaledXBounds.x || scaledPos.x > scaledXBounds.y;
    bool zCheck = scaledPos.z < scaledZBounds.x || scaledPos.z > scaledZBounds.y;
    bool yCheck = scaledPos.y < scaledYBounds.x || scaledPos.y > scaledYBounds.y;
    bool fillCheck = abs(vValue - fillValue) < 0.005;

    if (xCheck || zCheck || yCheck || fillCheck){ //Hide points that are clipped
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    }

}
