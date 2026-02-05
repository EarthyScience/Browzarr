attribute float value;

out float vValue;

flat out int highlight;

uniform float pointSize;
uniform bool scalePoints;
uniform float scaleIntensity;
uniform vec2 valueRange;
uniform int[10] startIDs;
uniform int stride;
uniform int dimWidth;
uniform bool showTransect;
uniform float timeScale;
uniform float animateProg;
uniform vec4 flatBounds;
uniform vec2 vertBounds;
uniform vec3 shape;
uniform float fillValue;

bool isValidPoint(){
    for (int i = 0; i < 10; i++){
        if (startIDs[i] == -1){
            return false;
        }
        int rePos = gl_VertexID - startIDs[i];
        bool isValid = rePos % stride == 0;
        bool secondary = gl_VertexID < (startIDs[i] + dimWidth*stride) && gl_VertexID > startIDs[i];
        isValid = isValid && secondary;
        if (isValid){
            return true;
        }
    }
    return false;
}

vec3 computePosition(int vertexID) {
    int depth = int(shape.x);
    int height = int(shape.y);
    int width = int(shape.z);

    int sliceSize = width * height;

    int z = vertexID / sliceSize;
    int y = (vertexID % sliceSize) / width;
    int x = vertexID % width;

    float px = (float(x) - (float(width)/2.)) / 500.;
    float py = (float(y) - (float(height)/2.)) / 500.;
    float pz = (float(z) - (float(depth )/2.)) /500.;

    return vec3(px * 2.0, py * 2.0, pz * 2.0);
}

void main() {
    vValue = float(value)/255.;
    vec3 scaledPos = computePosition(gl_VertexID);
    float depthSize = float(shape.x)/500.;

    scaledPos.z += depthSize;
    scaledPos.z = mod(scaledPos.z + animateProg*depthSize*2., depthSize*2.);
    scaledPos.z -= depthSize;

    scaledPos.z *= timeScale;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(scaledPos, 1.0);

    float pointScale = pointSize/gl_Position.w;
    pointScale = scalePoints ? pointScale*pow(vValue,scaleIntensity) : pointScale;

    bool isValid = isValidPoint();
    highlight = isValid ? 1 : 0;
    
    if (value == 255. || (pointScale*gl_Position.w < 0.75 && scalePoints)){ //Hide points that are invisible or get too small when scalled
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    }

    if (vValue < valueRange.x || vValue > valueRange.y){ //Hide points that are outside of value range
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    }

    float scaleX = float(shape.z) / 500.0; //width scaling
    float scaleY = float(shape.y) / 500.0; //height scaling
    float scaleZ = float(shape.x) / 500.0; //depth scaling
    
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
    
    if (showTransect){
        gl_PointSize = isValid ? pointScale*5. : pointScale;
    }
    else{
        gl_PointSize =  pointScale;
    }

}
