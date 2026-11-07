import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { useShallow } from "zustand/shallow";
import { usePlotStore } from "@/stores/PlotStore";

type SunProps = {
    distance?: number;   // how far from the origin the light sits along sunDirection
    extent?: number;     // half-size of the orthographic shadow frustum
    mapSize?: number;
    showBounds?: boolean; // debug: draw the shadow camera frustum
};

// Directional "sun" + ambient fill driven by the same store values as the sunDirection/worldColor uniforms.
// Intensities are scaled by PI so a fully lit face reaches its albedo (three's Lambert BRDF divides by PI).
export const Sun = ({ distance = 4, extent = 3, mapSize = 4096, showBounds = false }: SunProps) => {
    const { sunDirection, cameraAsSun, worldColor } = usePlotStore(useShallow(s => ({
        sunDirection: s.sunDirection, cameraAsSun: s.cameraAsSun, worldColor: s.worldColor
    })));
    const gl = useThree(state => state.gl) as unknown as THREE.WebGPURenderer;
    const invalidate = useThree(state => state.invalidate);

    useEffect(() => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
    }, [gl]);

    const sun = useMemo(() => {
        const light = new THREE.DirectionalLight(0xffffff, Math.PI);
        light.castShadow = true;
        const cam = light.shadow.camera as THREE.OrthographicCamera;
        cam.left = -extent;
        cam.right = extent;
        cam.top = extent;
        cam.bottom = -extent;
        cam.near = 0.1;
        cam.far = distance * 2;
        cam.updateProjectionMatrix(); 
        light.shadow.mapSize.set(mapSize, mapSize);
        light.shadow.bias = -0.005;
        // light.shadow.normalBias = 0.001;
        return light;
    }, [distance, extent, mapSize]);

    const ambient = useMemo(() => new THREE.AmbientLight(0xffffff, Math.PI), []);

    useEffect(() => {
        if (cameraAsSun) return;
        sun.position.copy(sunDirection).normalize().multiplyScalar(distance);
        sun.updateMatrixWorld();
        invalidate();
    }, [sun, sunDirection, cameraAsSun, distance, invalidate]);

    useEffect(() => {
        ambient.color.set(worldColor);
        invalidate();
    }, [ambient, worldColor, invalidate]);

    // Shadow camera's matrices are normally only refreshed inside the shadow pass,
    // so update them here too to keep the helper in sync with the light.
    const boundsHelper = useMemo(
        () => showBounds ? new THREE.CameraHelper(sun.shadow.camera) : null,
        [sun, showBounds]
    );

    // Follow the camera when it is used as the sun
    useFrame(({ camera }) => {
        if (cameraAsSun) {
            sun.position.copy(camera.position).normalize().multiplyScalar(distance);
        }
        if (boundsHelper) {
            sun.updateMatrixWorld();
            sun.target.updateMatrixWorld();
            sun.shadow.updateMatrices(sun);
            boundsHelper.update();
        }
    });

    useEffect(() => () => sun.dispose(), [sun]);
    useEffect(() => () => boundsHelper?.dispose(), [boundsHelper]);

    return (
        <>
            <primitive object={sun} />
            <primitive object={sun.target} />
            <primitive object={ambient} />
            {boundsHelper && <primitive object={boundsHelper} />}
        </>
    );
};
