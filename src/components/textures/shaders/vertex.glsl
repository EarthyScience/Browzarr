 // by Jeran Poehls

#if USE_VORIGIN
out vec3 vOrigin;
#endif

#if USE_VDIRECTION
out vec3 vDirection;
#endif

#if USE_APOSITION
out vec3 aPosition;
#endif

#if USE_VUV
out vec2 Vuv;
#endif

void main() {
    vec4 worldPos = modelViewMatrix * vec4( position, 1.0 );
    
#if USE_APOSITION
    aPosition = position; //Pass out position for sphere frag
#endif

#if USE_VORIGIN
    vOrigin = vec3( inverse( modelMatrix ) * vec4( cameraPosition, 1.0 ) ).xyz;
#endif

#if USE_VDIRECTION
#if USE_VORIGIN
    vDirection = position - vOrigin;
#endif
#endif

#if USE_VUV
    Vuv = uv;
#endif

    gl_Position = projectionMatrix * worldPos;
}