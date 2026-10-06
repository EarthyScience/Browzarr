import { Fn, vec4, vec3, abs, any, greaterThan, If, lessThan, normalize, pow, EPSILON, Discard, int, ceil, Loop,
	min, max, vec2, select, cameraPosition, positionLocal, varying, float, bool,sub,
	Break, modelWorldMatrixInverse, modelWorldMatrix, Continue, floor,sign, mix, greaterThanEqual,
	texture, mod, clamp, ivec3, fract } from 'three/tsl';
import * as u from './utils/commonUniforms'	
import * as h from './utils/commonHelpers';
import * as vu from './utils/volumeUniforms'
import * as THREE from 'three/webgpu'
import { hitBox } from './rayMarcher';

const shouldSkip = (p : any) => {
    const texCoord = vec3(0).toVar("thisCoord");
    const maskUV = vec2(0).toVar('newV');
    const skip = bool(false).toVar('shouldSkip');
    If( p.x.greaterThan( vu.flatBounds.x.negate() ).or( p.x.lessThan( vu.flatBounds.y.negate() ) ), () => {
		skip.assign(bool(true))
	} );
	If( p.z.negate().greaterThan( vu.flatBounds.z.negate() ).or( p.z.negate().lessThan( vu.flatBounds.w.negate() ) ), () => {
		skip.assign(bool(true))
	} );
	If( p.y.lessThan( vu.vertBounds.x ).or( p.y.greaterThan( vu.vertBounds.y ) ), () => {
		skip.assign(bool(true))
	} );
    If(skip.not(), () =>{
        texCoord.assign( p.div( vu.scale ).add( 0.5 ) );
        // const {maskUV:newV, valid, texCoord:newCoord} =  h.reprojector( texCoord );
        // If(valid.not()
        //     .or(any( greaterThan( newV, vec2( 1.0 ) )))
        //     .or(any( lessThan( newV, vec2( 0.0 ) ))
        //     ), () =>{
        //     // skip.assign(bool(true))
        // }).Else(()=>{
        //     maskUV.assign(newV);
        //     texCoord.assign(newCoord);
        // })
    })
    If(skip.not().and(u.maskValue.notEqual(0)), () =>{
        const mask = u.maskTexture.sample( maskUV ).r;
		const masked = select( u.maskValue.equal( 1 ), mask.lessThan( 0.5 ), mask.greaterThanEqual( 0.5 ) );
        If(masked, () => skip.assign(bool(true)))
    })
    If(skip.not(), () =>{
        texCoord.z.assign( mod( texCoord.z.add( u.animateProg ), 1.0001 ) );
        texCoord.assign( clamp( texCoord, vec3( 0.0 ), sub( 1.0, vec3( EPSILON ) ) ) );
    })
    return {skip, texCoord, maskUV}
}


const sampleVoxel = (texCoord : any) =>{
    const isnan = bool(false).toVar('isnan');
    const biVal = float(0).toVar('biVal');
    const d = float(0).toVar('d');

    const depths = ivec3( u.textureDepths );
	const yStepSize = depths.x;
	const zStepSize = depths.y.mul( depths.x );
	const idx = clamp( ivec3( texCoord.mul( u.textureDepths ) ), ivec3( 0 ), depths.sub( 1 ) );
	const textureIdx = idx.z.mul( zStepSize ).add( idx.y.mul( yStepSize ) ).add( idx.x );
	const localCoord = fract( texCoord.mul( u.textureDepths ) );
    If( u.bivariate, () => {
        const biNaN = bool(false).toVar('biNaN');
        const bivar = h.sample2ToOrder( localCoord, textureIdx, u.bivariateSelection );
		d.assign( bivar.r );
		biVal.assign( bivar.g );
		biNaN.assign( h.isNaNBits( d )
            .or( h.isNaNBits( biVal ) )
            .or( u.useF16.not().and( d.equal( 1.0 )) )
            .or( u.useF16.not().and( biVal.equal( 1.0 )) ) 
        );
		isnan.assign( biNaN );
    }).Else(()=>{
        d.assign( h.sample1( localCoord, textureIdx ) );
		// h.rescaler( d );
		isnan.assign( h.isNaNBits( d )
            .or( u.useF16.not().and(d.equal( 1.0 )) )
            .or( abs(d.sub( u.fillValue )).lessThan( 0.005 ) ) 
        );
		d.assign( max( min( d.mul( u.cScale ).add( u.cOffset ), 0.995 ), 0.0 ) );
    })
    const valid = d.greaterThanEqual( u.threshold.x ).and( d.lessThanEqual( u.threshold.y )).toVar('valid')
    return {d, biVal, isnan, valid}
}

const ddaColor = Fn(() =>{
    const vOrigin = varying(modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz);
    const vDirection = varying(positionLocal.sub(vOrigin));
    const rayDir = normalize( vDirection );
    const bounds = hitBox( vOrigin, rayDir ).toVar("bounds");
    If( bounds.x.greaterThan( bounds.y ), () => Discard());
    bounds.x.assign( max( bounds.x, 0.0 ) );
    const gridRes = vu.dataShape;
    const boxMin = vu.scale.mul( 0.5 ).negate();
    const voxelSize = vu.scale.div( gridRes );
    // Initial voxel from the ray's entry point into the box.
    const p0 = vOrigin.add( bounds.x.mul( rayDir ) );
    const localPos = clamp( p0.sub( boxMin ).div( vu.scale ), vec3( 0.0 ), vec3( 1.0 ).sub( vec3( EPSILON ) ) ).mul( gridRes );
    const voxel = clamp( ivec3( floor( localPos ) ), ivec3( 0 ), ivec3( gridRes ).sub( 1 ) ).toVar("voxel");
    // Standard 3D DDA (Amanatides & Woo) setup.
    const stepDir = sign( rayDir );
    const stepDirI = ivec3( stepDir );
    const nextBoundary = boxMin.add( vec3( voxel ).add( max( stepDir, 0.0 ) ).mul( voxelSize ) );
    const tMax = nextBoundary.sub( vOrigin ).div( rayDir ).toVar("tMax");
    const tDelta = voxelSize.div( abs( rayDir ) ).toVar("tDelta");
    // // Handle parallel rays. If ray has < eps component in an axis, it will never cross that axis
    // // If it is degen just manually set the interesction distance to someting arbitrarly high
    const degenerate = lessThan( abs( rayDir ), vec3( EPSILON ) );
    tMax.assign( select(degenerate, vec3( 1e30 ), tMax ));
    tDelta.assign( select(  degenerate, vec3( 1e30 ), tDelta ));
    const t = bounds.x.toVar('t');
    const maxSteps = int( gridRes.x.add( gridRes.y ).add( gridRes.z ) ).mul( 2 ).add( 8 );
    const accumColor = vec3( 0.0 ).toVar('accumColor');
    const alphaAcc = float( 0.0 ).toVar('alphaAcc');
    const Color = vec4(0).toVar("Color");
    // //Steps
    const stepForward = Fn(()=>{
        If( tMax.x.lessThan( tMax.y ).and( tMax.x.lessThan( tMax.z ) ), () => {
            t.assign( tMax.x );
            tMax.x.addAssign( tDelta.x );
            voxel.x.addAssign( stepDirI.x );
        } ).ElseIf( tMax.y.lessThan( tMax.z ), () => {
            t.assign( tMax.y );
            tMax.y.addAssign( tDelta.y );
            voxel.y.addAssign( stepDirI.y );
        } ).Else( () => {
            t.assign( tMax.z );
            tMax.z.addAssign( tDelta.z );
            voxel.z.addAssign( stepDirI.z );
        } );
    })
    Loop( maxSteps, () => {
        If( t.greaterThan( bounds.y ), () => {Break();});
        // Sample at the center of the current voxel. 
        const pCenter = boxMin.add( vec3( voxel ).add( 0.5 ).mul( voxelSize ) );
        const texCoord = vec3(0).toVar("texCoord");
        const maskUV = vec2(0).toVar("maskUV");
        const {skip, texCoord:newCoord, maskUV:newV} = shouldSkip(pCenter) as any;
        If(skip, () => {stepForward(); Continue()})
        texCoord.assign(newCoord);
        maskUV.assign(newV);

        const {d, biVal, isnan, valid} = sampleVoxel(texCoord) as any;
        If(valid.not(), () => {stepForward(); Continue()})
        If( isnan, () => {
            If( u.nanAlpha.greaterThan( 0.0 ), () => {
                const nanA = pow( u.nanAlpha, 5.0 );
                accumColor.addAssign( sub( 1.0, alphaAcc ).mul( nanA ).mul( u.nanColor ) );
                alphaAcc.addAssign( nanA );
            });
        }).Else( () => {
            // --- GET COLOR --- //
            If( u.bivariate, () => {
                const flipOrder = u.bivariateSelection.notEqual( 0 );
                Color.assign( select( flipOrder, h.colorMixer( biVal, d ), h.colorMixer( d, biVal ) ) );
            }).Else( () => {
                Color.assign( u.cmap.sample( vec2( d, 0.5 ) ).rgb );
            });
            // // --- GET ALPHA --- //
            const alphaFac = select( vu.revTransparency, sub( 1.0, d ), d );
            const alpha = float(0).toVar("alpha");
            If( vu.useClipScale, () => {
                const normalizedOpacity = clamp( alphaFac.sub( u.threshold.x ).div( u.threshold.y.sub( u.threshold.x ) ), 0.0, 1.0 );
                alpha.assign( pow( max( normalizedOpacity, 0.001 ), vu.transparency.mul( vu.opacityMag ) ) );
            } ).Else( () => {
                alpha.assign( pow( max( alphaFac, 0.001 ), vu.transparency.mul( vu.opacityMag ) ) );
            } );
            // --- ACCUMULATE --- //
            accumColor.addAssign( sub( 1.0, alphaAcc ).mul( alpha ).mul( Color ) );
            alphaAcc.addAssign( alpha.mul( sub( 1.0, alphaAcc ) ) );
        })

        If( alphaAcc.greaterThanEqual( 1.0 ), () => {
            // --- ADD BORDERS --- //
            If( u.useBorderTexture, () => {
                const pHit = vOrigin.add( t.mul( rayDir ) );
                const localPosContinuous = pHit.sub( boxMin ).div( vu.scale );
                const {maskUV:borderUV, valid} =  h.reprojector( localPosContinuous );
                const borderDist = u.borderTexture.sample( borderUV ).r;
                If( borderDist.lessThanEqual( u.borderWidth ).and( valid ), () => {
                    Color.assign( vec4( u.borderColor, 1.0 ) );
                });
            });
            Break();
        });
        stepForward();
        If( any( lessThan( voxel, ivec3( 0 ) ) )
            .or( any( greaterThanEqual( voxel, ivec3( gridRes ) ) ) 
            ), () =>{Break();}
        );
    })
    If( alphaAcc.lessThanEqual( 0.0 ), () => Discard());
    Color.assign(vec4(accumColor, alphaAcc));
    return Color
})

export const createDDAMaterial = () => {
    const material = new THREE.NodeMaterial();
    material.transparent = true;
    material.side = THREE.BackSide;
    material.colorNode = ddaColor();

    return material
}