import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { usePlotStore } from "@/stores/PlotStore";

type SunDirectionProps = {
    length?: number;
    color?: string;
};

export const SunDirection = ({ length = 3, color = "#ffcc00" }: SunDirectionProps) => {
    const sunDirection = usePlotStore(state => state.sunDirection);
    const arrow = useMemo(() => {
        return new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, 0),
            length,
            color,
            length * 0.1,
            length * 0.05
        );
    }, [length, color]);

    useEffect(() => {
        arrow.setDirection(sunDirection.clone().normalize());
    }, [arrow, sunDirection]);

    useEffect(() => {
        return () => arrow.dispose();
    }, [arrow]);

    return <primitive object={arrow} />;
};
