precision highp float;
precision highp sampler3D;

out vec4 color;

in vec3 aPosition;

uniform vec2 xBounds;
uniform vec2 yBounds;
uniform vec3 borderColor;
uniform bool trim;

void main() {

    If( aPosition.x.lessThan( xBounds.x )
        .or( aPosition.x.greaterThan( xBounds.y ) )
        .or( aPosition.y.lessThan( yBounds.x ) )
        .or( aPosition.y.greaterThan( yBounds.y ) )
        .and( trim ), () => {
	Discard();

} );

    color = vec4(borderColor, 1.0);
}