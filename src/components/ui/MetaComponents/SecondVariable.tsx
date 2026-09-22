import { useGlobalStore } from '@/GlobalStates/GlobalStore'
import { useIsMobile } from '@/hooks'
import React, { useEffect, useState } from 'react'
import { useShallow } from 'zustand/shallow'
import { VariableCombo } from './VariableCombo'
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { renderAttributes, defaultAttributes } from '../MetaData'
import { Badge, Switch, Hider } from '@/components/ui'
import { GetAttributes } from '@/components/zarr/ZarrLoaderLRU'

const sameShape = (mainShape: number[], newShape: number[]): boolean =>{
    return mainShape.every((val, idx) => val === newShape[idx])
}

interface SecondProps{
    dataShape: number[];
    isBivariate: boolean;
    setIsBivariate: React.Dispatch<React.SetStateAction<boolean>>
}

export const SecondVariable = ({dataShape, isBivariate, setIsBivariate} : SecondProps) => {
    const { variable2, zMeta, shareScale, setVariable2 } = useGlobalStore(useShallow(s => ({
        variable2: s.variable2, zMeta: s.zMeta, shareScale: s.shareScale, setVariable2: s.setVariable2
    })))
    const isMobile = useIsMobile();
    const [metadata, setMetadata] = useState<Record<string, any> | undefined>(undefined);
    const [variables, setVariables] = useState<string[]>([])
    const setShareScale = (newVal: boolean) => useGlobalStore.setState({ shareScale: newVal})
    useEffect(()=>{
        let compatibleVariables: string[] = []
        zMeta && Object.values(zMeta).forEach(val => {
            const {shape, name} = val as {shape: number[], name: string};
            if (!shape && !name) return;
            if (sameShape(dataShape, shape)) compatibleVariables.push(name)
        })
        setVariables(compatibleVariables)
    },[zMeta])

    const updateVariable = (e: string) => {
        GetAttributes(e).then(result => {
            setMetadata(result);
        })
        setVariable2(e)
    }

    useEffect(()=>{
        // Load attributes on mount if variable2
        if (variable2) GetAttributes(variable2).then(result => setMetadata(result))
    },[])

    return (
        <>
        <Hider show={isBivariate}>
            <div className="flex items-center justify-between gap-2">
                <VariableCombo variables={variables} initValue={variable2} setVariable={updateVariable} />
                {isMobile ? (
                    <Dialog>
                    <DialogTrigger className="cursor-pointer" asChild>
                    {metadata && <Badge variant="default" className="block">Attributes</Badge>}
                    </DialogTrigger>
                    <DialogContent className="metadata-dialog">
                        <DialogHeader>
                        <DialogTitle>Attributes</DialogTitle>
                        <DialogDescription className="sr-only">Metadata Information for variable</DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[60vh] text-[12px] overflow-y-auto break-words p-0">
                        <div className="grid grid-cols-1 md:grid-cols-[max-content_1fr] gap-x-1 gap-y-[6px]">
                            {renderAttributes(metadata, defaultAttributes)}
                        </div>
                        </div>
                    </DialogContent>
                    </Dialog>
                ) : (
                    <Popover>
                    <PopoverTrigger className="cursor-pointer" asChild>
                        {metadata && <Badge variant="default" className="block">Attributes</Badge>}
                    </PopoverTrigger>
                    <PopoverContent
                        data-meta-popover
                        className="w-[300px] max-h-[50vh] overflow-y-auto"
                        align="center"
                    >
                        {renderAttributes(metadata, defaultAttributes)}
                    </PopoverContent>
                    </Popover>
                )}
            </div>
        </Hider>
        <div className={isBivariate ? 'grid grid-cols-2 gap-x-2' : ''}>
            <div className={`grid grid-cols-[auto_40px]`} style={{display: isBivariate ? '' : 'none'}}>
                <label htmlFor="shareScale">Share Scale</label>
                <Switch id="shareScale" defaultChecked={shareScale} onCheckedChange={e => setShareScale(e)}/>
            </div>
            <div className={`grid grid-cols-[auto_40px]`}>
                <label htmlFor="isBivariate">Bivariate Plot</label>
                <Switch id="isBivariate" defaultChecked={isBivariate} onCheckedChange={e => setIsBivariate(e)}/>
            </div>
        </div>
        
        </>
    )
}

