import React, {useState} from 'react'
import { Button } from '@/components/ui'
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { VariableAccordion } from './VariableAccordion';

const VariableHeader = () => {
    const variables = useGlobalStore(s => s.variables)
    const [meta, setMeta] = useState<Record<string, any> | undefined>(undefined)
    const [variable, setVariable] = useState<string | undefined>(undefined)

    return (
        <div>
            <VariableAccordion variables={variables} setVariable={setVariable} />
        
        </div>
    )
}

export default VariableHeader
