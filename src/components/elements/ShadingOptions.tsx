import React, { useState } from 'react'
import * as THREE from 'three'
import { Button, Switch, Slider, Input, Hider } from '@/components/ui'
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { useIsMobile } from '@/hooks'
import { ChevronLeft } from 'lucide-react'
import { usePlotStore } from '@/stores/PlotStore'
import { ColorField, SwitchField } from '../widgets/SettingFields'
import { useShallow } from 'zustand/shallow'
// Convert sun direction vector <-> azimuth/elevation (degrees)
const toAngles = (v: THREE.Vector3) => {
    const azimuth = THREE.MathUtils.radToDeg(Math.atan2(v.x, v.z))
    const elevation = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(v.y, -1, 1)))
    return { azimuth, elevation }
}

const fromAngles = (azimuth: number, elevation: number) => {
    const az = THREE.MathUtils.degToRad(azimuth)
    const el = THREE.MathUtils.degToRad(elevation)
    return new THREE.Vector3(
        Math.cos(el) * Math.sin(az),
        Math.sin(el),
        Math.cos(el) * Math.cos(az)
    ).normalize()
}

export const ShadingOptions = () => {
    const [showOpts, setShowOpts] = useState(false)
    const isMobile = useIsMobile();
    const popoverSide = isMobile ? "top" : "left";
    const {useShading, cameraAsSun, sunDirection, worldColor, showSunHelper} = usePlotStore(useShallow(s => ({
        useShading: s.useShading, cameraAsSun: s.cameraAsSun, 
        sunDirection: s.sunDirection, worldColor: s.worldColor, showSunHelper: s.showSunHelper
    })))
    const { azimuth, elevation } = toAngles(sunDirection)

    const setSun = (az: number, el: number) =>
        usePlotStore.setState({ sunDirection: fromAngles(az, el) })

    return (
        <Popover open={showOpts} onOpenChange={setShowOpts}>
            <PopoverTrigger asChild>
                <div className='flex items-center justify-between my-2'>
            <ChevronLeft className={`h-4 w-4 transition-transform duration-200 ${
                showOpts ? '' : 'rotate-180'} z-5`} />
            <Button
                variant='secondary'
                className="flex items-center flex-grow justify-center gap-2 my-[-10px] p-1 h-auto border-solid border-gray border-[1px]"
            >
                Shading
            </Button>
            </div>
            </PopoverTrigger>
            <PopoverContent side={popoverSide}>
                <div className='flex flex-col gap-3'>
                    <SwitchField id='interpolate-pixels' label='Use Shading' 
                        checked={useShading} 
                        onChange={(checked) => usePlotStore.setState({ useShading: checked })} 
                    />
                    <Hider show={useShading} className={`flex flex-col gap-3`}>
                        <SwitchField id='sun-helper' label='Sun Helper' 
                            checked={showSunHelper} 
                            onChange={(checked) => usePlotStore.setState({ showSunHelper: checked })} 
                        />
                        <SwitchField id='camera-as-sun' label='Camera as Sun' 
                            checked={cameraAsSun} 
                            onChange={(checked) => usePlotStore.setState({ cameraAsSun: checked })} 
                        />
                        <div className={`flex flex-col gap-3 ${cameraAsSun ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div>
                                <label>Sun Azimuth: {azimuth.toFixed(0)}°</label>
                                <Slider
                                    min={-180}
                                    max={180}
                                    step={1}
                                    value={[azimuth]}
                                    onValueChange={(vals: number[]) => setSun(vals[0], elevation)}
                                />
                            </div>
                            <div>
                                <label>Sun Elevation: {elevation.toFixed(0)}°</label>
                                <Slider
                                    min={-90}
                                    max={90}
                                    step={1}
                                    value={[elevation]}
                                    onValueChange={(vals: number[]) => setSun(azimuth, vals[0])}
                                />
                            </div>
                        </div>
                        <ColorField label='World color' defaultValue={worldColor} 
                            onChange={(e) => usePlotStore.setState({ worldColor: e.target.value })} 
                        />
                    </Hider>
                </div>
            </PopoverContent>
        </Popover>

    )
}


