import * as u from './utils/uniforms'
import * as h from './utils/commonHelpers';
import * as THREE from 'three/webgpu'
import { Fn, normalize, asin, atan, PI, mul, mod, vec2, vec4, If, float,
    fract, select, all, cos, positionGeometry, greaterThanEqual, lessThanEqual,
    texture} from 'three/tsl';

const giveUV = Fn(( [position] : [any]) => {
    const n = normalize( position );
	const latitude = asin( n.y ).toVar();
	const longitude = atan( n.z, n.x ).negate().toVar();
	latitude.assign( latitude.sub( u.latBounds.x ).div( u.latBounds.y.sub( u.latBounds.x ) ) );
	const span = u.lonBounds.y.sub( u.lonBounds.x );
	longitude.assign( mod( longitude.sub( u.lonBounds.x ), mul( 2.0, PI ) ) );
	longitude.assign( longitude.div( span ) );
	return vec2( longitude, latitude );
})

const maskAndBorder = Fn( () => {
    const result = vec4( 0, 0, 0, - 1 ).toVar( 'maskResult' );
    If( u.maskValue.notEqual( 0 ).or( u.useBorderTexture ), () => {
        const maskUV = h.giveMaskUV( positionGeometry );
        If( u.is360, () => {
            maskUV.x.assign( fract( maskUV.x ) );
        });
        If( u.maskValue.notEqual( 0 ), () => {
            //@ts-ignore level does exist on this node
            const mask = u.maskTexture.sample( maskUV ).level(0).r;
            const cond = select( u.maskValue.equal( 1 ), mask.lessThan( 0.5 ), mask.greaterThanEqual( 0.5 ) );
            If( cond, () => {
                result.assign( vec4( u.nanColor, 1. ) );
                result.a.assign( u.nanAlpha );
            });
        })
        If(u.useBorderTexture, () => {
            //@ts-ignore level does exist on this node
            const borderDist = u.borderTexture.sample( maskUV ).level(0).r;
            const latFac = cos( maskUV.y );
            If( borderDist.lessThanEqual( u.borderWidth.mul( latFac ) ), () => {
                result.assign( vec4( u.borderColor, 1.0 ) );
            });
        });
    } );
    return result;
});

const inUnitSquare = (coord: any) => all( greaterThanEqual( coord, vec2( 0.0 ) ) ).and( all( lessThanEqual( coord, vec2( 1.0 ) ) ) );

const sphereColor = Fn( () => {
    const Color = vec4( 1,0,0,1 ).toVar( 'Color' );
    const aPosition = positionGeometry.toVar('aPosition');
    const sampleCoord = giveUV(aPosition).toVar('sampleCoord');
    If( inUnitSquare( sampleCoord ), () => {
        If(u.remapBorders, ()=>{
            sampleCoord.xy.assign(texture(u.remapTexture, h.realCoords(sampleCoord.xy)))
        })
        const {localCoord, textureIdx} = h.getLocalCoord(sampleCoord)
        // Scale up
        localCoord.assign( fract( localCoord ) );
        Color.assign( h.sampleSurfaceColor(localCoord, textureIdx).color );
    }).Else(() => {Color.assign( vec4( u.nanColor, u.nanAlpha ) )});
    return Color
})

const sphereVertex = Fn(() =>{
    const sampleCoord = giveUV( positionGeometry ).toVar("sampleCoord");
    const newPosition = positionGeometry.toVar('newPosition');
    If( inUnitSquare( sampleCoord ), () => {
        const normal = normalize( positionGeometry );
        const {localCoord, textureIdx} = h.getLocalCoord(sampleCoord.xy)
        const dispStrength = float( 0 ).toVar( 'dispStrength' );
        If( u.bivariate, () => {
            dispStrength.assign( h.sample2ToOrder( localCoord, textureIdx, u.bivariateSelection ).r );
        } ).Else( () => {
            dispStrength.assign( h.sample1( localCoord, textureIdx ) );
        } );
        If( h.isNanVal( dispStrength ).not(), () => {
            newPosition.addAssign( normal.mul( dispStrength.sub( u.displaceZero ) ).mul( u.displacement ) );
        } )
    })
    return newPosition;
})

export function createSphereMaterial(){
    const material = new THREE.NodeMaterial();
    material.transparent = true;
    material.positionNode = sphereVertex();
    material.colorNode = Fn( () => h.overlayOr( maskAndBorder().toVar( 'early' ), () => sphereColor() ) )();
    return material
}
