import { useMemo } from "react";
import { usePlotStore } from "@/GlobalStates";
import { useShallow } from "zustand/shallow";


export const useCoordBounds = ()=>{
    const {lonExtent, latExtent, lonResolution, latResolution} = usePlotStore(useShallow(state=>({
        lonExtent: state.lonExtent,
        latExtent: state.latExtent,
        lonResolution: state.lonResolution,
        latResolution: state.latResolution,
    })))
    const [lonBounds, latBounds] = useMemo(()=>{ //The bounds for the shader. It takes the middle point of the furthest coordinate and adds the distance to edge of pixel
        const newLatStep = latResolution/2;
        const newLonStep = lonResolution/2;
        const newLonBounds = [Math.max(lonExtent[0]-newLonStep, -180), Math.min(lonExtent[1]+newLonStep, 180)]
        const newLatBounds = [Math.max(latExtent[0]-newLatStep, -90), Math.min(latExtent[1]+newLatStep, 90)]
        return [newLonBounds, newLatBounds]
    },[latExtent, lonExtent, lonResolution, latResolution])
    return {
        lonBounds,latBounds
    }
}
