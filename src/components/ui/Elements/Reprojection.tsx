import { usePlotStore } from '@/GlobalStates/PlotStore'
import React, { useRef, useState } from 'react'
import { useShallow } from 'zustand/shallow'
import { Hider } from '../Widgets/Hider'
import { ChevronDown } from 'lucide-react'
import { Input } from '../input'
import { Button } from '../button'
import { checkProjString, reproject, resetProjection } from '@/components/textures/ProjectionTexture'
import { TbReplace } from "react-icons/tb";
import { RxReset } from "react-icons/rx";
import { useGlobalStore } from '@/GlobalStates/GlobalStore'

export const Reprojection = () => {
    const {projection, defaultProjection} = usePlotStore(useShallow(state => ({
        projection: state.projection,
        defaultProjection: state.defaultProjection
    })))
    const [showRepro, setShowRepro] = useState(false)
    const [changeNativeCRS, setChangeNativeCRS] = useState(false)

    const nativeCRS = useRef('')
    const repRes = useRef(256)

    function handleNativeCRS(){
        const valid = checkProjString(nativeCRS.current)
        if (valid){
            usePlotStore.setState({ defaultProjection: nativeCRS.current })
            setChangeNativeCRS(false)
        }
    }

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
                        <div className="flex flex-col gap-1">
                            <button 
                                className="shrink-0 rounded-md p-2 hover:bg-muted cursor-pointer transition-colors"
                                onClick={resetProjection}
                            >
                                <RxReset className="h-4 w-4" />
                            </button>
                            <button 
                                className="shrink-0 rounded-md p-2 hover:bg-muted cursor-pointer transition-colors"
                                onClick={()=>setChangeNativeCRS(x=>!x)}
                            >
                                <TbReplace className="h-4 w-4" />
                            </button>
                        </div>
                        
                    </div>
                    <Hider show={!defaultProjection || changeNativeCRS}>
                        <div className="flex flex-col gap-2 rounded-md border border-dashed border-muted-foreground/30 p-3">
                            <Input
                                type="string"
                                defaultValue={nativeCRS.current}
                                onChange={e => (nativeCRS.current = e.target.value)}
                                placeholder={`${defaultProjection ? "Update" : "Enter" } native CRS`}
                            />
                            <Button
                                className="cursor-pointer w-full"
                                onClick={handleNativeCRS}
                            >
                                Set native CRS
                            </Button>
                        </div>
                    </Hider>
                    <div className="grid grid-cols-[60%_35%] gap-2 pt-1">
                        <div className='col-span-2 grid grid-cols-[65%_30%]'>
                            <p>Target Projection</p>
                            <p>Resolution</p>
                            <Input
                                type="string"
                                defaultValue={projection}
                                onChange={e => usePlotStore.setState({ projection: e.target.value })}
                                placeholder="Target projection"
                            />
                            <Input
                                className='appearance-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-noneappearance-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
                                type="number"
                                defaultValue={repRes.current}
                                onChange={e => repRes.current = parseInt(e.target.value )}
                                placeholder="Resolution"
                            />
                        </div>
                         <Button
                            className="cursor-pointer col-span-2"
                            onClick={()=>reproject(repRes.current)}
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


