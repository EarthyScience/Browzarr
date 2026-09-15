import React, {useState} from 'react'
import { Button } from '@/components/ui'
import { VariableAccordion } from './VariableAccordion'
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useGlobalStore } from '@/GlobalStates/GlobalStore';

const VariableHeader = () => {
    const variables = useGlobalStore(s => s.variables)
    const [meta, setMeta] = useState<Record<string, any> | undefined>(undefined)

    return (
        <div>
            <Popover>
                <PopoverTrigger asChild>
                    <Button >
                        Variables
                    </Button>
                </PopoverTrigger>
                <PopoverContent side='left'>
                    <VariableAccordion variables={variables} setMeta={setMeta}/>
                </PopoverContent>
            </Popover>
        
        </div>
    )
}

export default VariableHeader
