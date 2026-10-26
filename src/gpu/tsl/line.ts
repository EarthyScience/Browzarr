import { all, attribute, cameraProjectionMatrix, float, Fn, If, int, modelViewMatrix, normalize, positionLocal, uniform, userData, varying, vec2, vec3, vec4 } from "three/tsl";
import * as THREE from 'three/webgpu'
import * as u from './utils/uniforms'

export const lu = {
    thickness: uniform(1),
    miter: uniform(1, 'int'),
    xScale: uniform(1),
    yScale: uniform(1),
    useLineColor: uniform(true),
    useMapColors: uniform(false),
    userColor: uniform(new THREE.Color(0xffffff))
}

export function createPlotLineMaterial(){
    const direction = attribute('direction', 'float');
    const next = attribute('next', 'vec3');
    const previous = attribute('previous', 'vec3');
    const normed = attribute('normed', 'float');
    const lineColor = userData('lineColor', 'vec3').div(255)

    // Varying
    const vNormed = varying(normed, 'vNormed');

    // Scale x/y like the original shader
    const scalePos = Fn(([p] : [any]) =>
        vec3(p.x.mul(lu.xScale.div(2)), p.y.mul(lu.yScale), p.z)
    );

    const getOrthographicZoom = Fn(([referenceWidth] : [any]) => {
        const m0 = cameraProjectionMatrix.element(int(0)).element(int(0)); // 2/(right-left)
        const viewWidth = float(2).div(m0);
        return referenceWidth.div(viewWidth);
    });

    const vertexNode = Fn(() => {
        const pos = scalePos(positionLocal);
        const prev = scalePos(previous);
        const nex = scalePos(next);
    
        const zoom = getOrthographicZoom(float(2));
    
        // View space positions
        const currentView = modelViewMatrix.mul(vec4(pos, 1.0));
        const prevView = modelViewMatrix.mul(vec4(prev, 1.0));
        const nextView = modelViewMatrix.mul(vec4(nex, 1.0));
    
        // Direction in view space
        const dir = vec3(0.0).toVar();
    
        If(all(currentView.xyz.equal(prevView.xyz)), () => {
            dir.assign(normalize(nextView.xyz.sub(currentView.xyz)));
        })
        .ElseIf(all(currentView.xyz.equal(nextView.xyz)), () => {
            dir.assign(normalize(currentView.xyz.sub(prevView.xyz)));
        })
        .Else(() => {
            const dirA = normalize(currentView.xyz.sub(prevView.xyz));
            If(lu.miter.equal(1), () => {
            const dirB = normalize(nextView.xyz.sub(currentView.xyz));
            // (perp / miterLen in the original were computed but never used)
            dir.assign(normalize(dirA.add(dirB)));
            }).Else(() => {
            dir.assign(dirA);
            });
        });
        // Normal in view space
        const normal = vec3(dir.y.negate(), dir.x, 0.0);
        const len = lu.thickness.div(zoom).div(500.0);
        const offset = normal.mul(len.mul(0.5).mul(direction));
    
        // Offset in view space, then project
        const offsetView = vec4(currentView.xyz.add(offset), currentView.w);
        return cameraProjectionMatrix.mul(offsetView);
    });

    const fragMentNode = Fn(() => {
        vNormed.lessThan(u.threshold.x)
        .or(vNormed.greaterThan(u.threshold.y)).discard()
        const Color = vec3(0).toVar();
        If(lu.useLineColor, ()=>{
            Color.assign(lu.userColor)
        }).ElseIf(lu.useMapColors, ()=>{
            Color.assign(u.cmap.sample(vec2(vNormed, 0.5)).rgb)
        }).Else(()=>{
            Color.assign(lineColor)
        })
        return vec4(Color, 1);
    })

    const material = new THREE.NodeMaterial()
    material.depthWrite = false;
    material.vertexNode = vertexNode();
    material.fragmentNode = fragMentNode();
    // material.fragmentNode = vec4(lineColor.x,0,0,1);
    return material
}