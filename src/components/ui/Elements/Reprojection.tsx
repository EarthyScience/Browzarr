import { usePlotStore } from '@/GlobalStates/PlotStore'
import React, { useRef, useState } from 'react'
import { useShallow } from 'zustand/shallow'
import { Hider } from '../Widgets/Hider'
import { ChevronDown } from 'lucide-react'
import { Input } from '../input'
import { Button } from '../button'
import { reproject } from '@/components/textures/ProjectionTexture'
import { TbReplace } from "react-icons/tb";

export const Reprojection = () => {
    const {projection, defaultProjection} = usePlotStore(useShallow(state => ({
        projection: state.projection,
        defaultProjection: state.defaultProjection
    })))
    const [showRepro, setShowRepro] = useState(false)
    const [changeNativeCRS, setChangeNativeCRS] = useState(false)
    const nativeCRS = useRef('')

    return (
        <div className="space-y-2">
            <button
                onClick={() => setShowRepro(x => !x)}
                className="flex items-center gap-2 w-full mb-2"
            >
                <b>Reprojection</b>
                <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                        showRepro ? '' : 'rotate-180'
                    }`}
                />
            </button>

            <Hider show={showRepro}>
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div
                            className="flex-1 rounded-md border border-[#333] bg-[#1e1e1e] px-3 py-2 font-mono text-sm text-[#d4d4d4] whitespace-pre-wrap"
                        >
                            {defaultProjection
                                ? `Native CRS: ${defaultProjection}`
                                : "No CRS detected"}
                        </div>
                        <button 
                            className="shrink-0 rounded-md p-2 hover:bg-muted cursor-pointer transition-colors"
                            onClick={()=>setChangeNativeCRS(x=>!x)}
                        >
                            <TbReplace className="h-4 w-4" />
                        </button>
                    </div>
                    <Hider show={!defaultProjection || changeNativeCRS}>
                        <div className="flex flex-col gap-2 rounded-md border border-dashed border-muted-foreground/30 p-3">
                            <Input
                                type="string"
                                defaultValue={nativeCRS.current}
                                onChange={e => (nativeCRS.current = e.target.value)}
                                placeholder="Enter native CRS"
                            />
                            <Button
                                className="cursor-pointer w-full"
                                onClick={() => {usePlotStore.setState({ defaultProjection: nativeCRS.current }); setChangeNativeCRS(false)}}
                            >
                                Set native CRS
                            </Button>
                        </div>
                    </Hider>
                    <div className="flex flex-col gap-2 pt-1">
                        <Input
                            type="string"
                            defaultValue={defaultProjection}
                            onChange={e => usePlotStore.setState({ projection: e.target.value })}
                            placeholder="Target projection"
                        />
                        <Button
                            className="cursor-pointer w-full"
                            onClick={()=>reproject(256)}
                            disabled={!projection || !defaultProjection}
                        >
                            Reproject
                        </Button>
                    </div>
                </div>
            </Hider>
        </div>
    )
}


