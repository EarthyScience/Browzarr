import { useMemo } from "react";
import { usePlotStore } from "@/GlobalStates/PlotStore";
import { useShallow } from "zustand/shallow";
import { useGlobalStore } from "@/GlobalStates/GlobalStore";
import { deg2rad } from "@/utils/HelperFuncs";

export const useCoordBounds = ()=>{
    const {lonExtent, latExtent, lonResolution, latResolution} = usePlotStore(useShallow(s => s))
    const {flipY} = useGlobalStore(useShallow(s => s))
    const [lonBounds, latBounds] = useMemo(()=>{ //The bounds for the shader. It takes the middle point of the furthest coordinate and adds the distance to edge of pixel
        const newLatStep = latResolution/2;
        const newLonStep = lonResolution/2;
        const newLonBounds = [lonExtent[0]-newLonStep, lonExtent[1]+newLonStep]
        let newLatBounds = [latExtent[0]-newLatStep, latExtent[1]+newLatStep]
        flipY && newLatBounds.reverse()
        return [newLonBounds, newLatBounds]
    },[latExtent, lonExtent, lonResolution, latResolution, flipY])
    return {
        lonBounds:lonBounds.map(e => deg2rad(e)),
        latBounds: latBounds.map(e => deg2rad(e))
    }
}
