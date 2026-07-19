import { useMemo } from "react";
import { usePlotStore } from "@/GlobalStates/PlotStore";
import { useShallow } from "zustand/shallow";


import { useGlobalStore } from "@/GlobalStates/GlobalStore";

export const useCoordBounds = ()=>{
    const {lonExtent, latExtent, lonResolution, latResolution} = usePlotStore(useShallow(state=>({
        lonExtent: state.lonExtent,
        latExtent: state.latExtent,
        lonResolution: state.lonResolution,
        latResolution: state.latResolution,
    })))
    const {flipY} = useGlobalStore(useShallow(state => ({
        flipY: state.flipY
    })))
    const [lonBounds, latBounds] = useMemo(()=>{ //The bounds for the shader. It takes the middle point of the furthest coordinate and adds the distance to edge of pixel
        const newLatStep = latResolution/2;
        const newLonStep = lonResolution/2;
        const minLat = Math.min(latExtent[0], latExtent[1]);
        const maxLat = Math.max(latExtent[0], latExtent[1]);
        const minLon = Math.min(lonExtent[0], lonExtent[1]);
        const maxLon = Math.max(lonExtent[0], lonExtent[1]);
        const newLonBounds = [Math.max(minLon-newLonStep, -180), Math.min(maxLon+newLonStep, 180)]
        let newLatBounds = [Math.max(minLat-newLatStep, -90), Math.min(maxLat+newLatStep, 90)]
        newLatBounds = flipY ? [newLatBounds[1], newLatBounds[0]] : newLatBounds
        return [newLonBounds, newLatBounds]
    },[latExtent, lonExtent, lonResolution, latResolution, flipY])
    return {
        lonBounds,latBounds
    }
}
