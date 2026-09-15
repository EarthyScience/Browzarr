import React, {useState, useRef, useEffect} from 'react'
import { Button } from '@/components/ui'
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { VariableCombo } from './VariableCombo';
import { useShallow } from 'zustand/shallow';
import { GetDimInfo } from '@/utils/HelperFuncs';

const VariableHeader = () => {
    const {variables, variable, variable2, bivariate, setVariable, setVariable2} = useGlobalStore(useShallow(s => ({
        variables: s.variables, variable: s.variable, variable2: s.variable2, bivariate: s.bivariate,
        setVariable: s.setVariable, setVariable2: s.setVariable2
    })))
    const [meta, setMeta] = useState<Record<string, any> | undefined>(undefined);
    const [useBivariate, setUseBivariate] = useState(bivariate);
    const prevVar1 = useRef(variable);
    const prevVar2 = useRef(variable2);
    const mainShape = useRef([0,0,0])

    useEffect(()=>{
        if (prevVar1.current != variable){
            
        } else {

        }
    })




    return (
        <div>
            <VariableCombo variables={variables} initValue={variable} setVariable={setVariable} />
            {bivariate && <VariableCombo variables={variables} initValue={variable2} setVariable={setVariable2} />}
        </div>
    )
}

export default VariableHeader
