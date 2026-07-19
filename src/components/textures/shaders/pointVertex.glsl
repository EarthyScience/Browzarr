attribute float value;
in float vertexIdx;

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
    uniform sampler2D remapTexture;
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
        // Get the reprojected normalized coordinates (u, v) from remapTexture
        vec2 uv = vec2((float(x) + 0.5) / float(width), (float(y) + 0.5) / float(height));
        vec3 remap = texture(remapTexture, uv).rgb;
        
        float nativeWidth = nativeShape.z;
        float px = (remap.r - 0.5) * (nativeWidth / 500.0);
        
        float lonRange = abs(lonBounds.y - lonBounds.x);
        float latRange = abs(latBounds.y - latBounds.x);
        float aspectRatio = (latRange > 0.0 && lonRange > 0.0) ? (lonRange / latRange) : 1.0;
        
        float py = (remap.g - 0.5) * (nativeWidth / 500.0) / aspectRatio;
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
    int originalID = int(vertexIdx);

    if (maskValue != 0 ){ // If using a mask, quick check if vertex is masked out before doing additional rendering
        vec2 newV = realCoords(giveUV(originalID));
        float mask = texture(maskTexture, newV).r;
        bool cond = maskValue == 1 ? mask< 0.5 : mask>=0.5;
        if (cond){ // Masked out. Move off screen
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
            return;
        }
    }

    // Set the point value directly from attribute (no 3D texture sampling needed!)
    vValue = float(value)/255.;

    #ifdef REPROJECT
        // For reprojected points, we must check if they are in the valid projection area.
        int height = int(shape.y);
        int width = int(shape.z);
        int sliceSize = width * height;
        int y = (originalID % sliceSize) / width;
        int x = originalID % width;
        
        vec2 uv = vec2((float(x) + 0.5) / float(width), (float(y) + 0.5) / float(height));
        vec3 remap = texture(remapTexture, uv).rgb;
        if (remap.b < 0.5) {
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
            return;
        }
    #endif

    vec3 scaledPos = computePosition(originalID);
    float depthSize = (float(shape.x) > 1.0) ? (nativeShape.z / 500.0) : 0.001;

    scaledPos.z += depthSize;
    scaledPos.z = mod(scaledPos.z + animateProg*depthSize*2., depthSize*2.);
    scaledPos.z -= depthSize;

    scaledPos.z *= timeScale;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(scaledPos, 1.0);

    #ifndef NO_SCALE
        float pointScale = pointSize/gl_Position.w;
        pointScale = scalePoints ? pointScale*pow(vValue,scaleIntensity) : pointScale;
        
        if (value == 255. || (pointScale*gl_Position.w < 0.75 && scalePoints)){ //Hide points that are invisible or get too small when scaled
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
        float aspectRatio = (latRange > 0.0 && lonRange > 0.0) ? (lonRange / latRange) : 1.0;

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
