import React from 'react'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"

interface ComboProps{
    variables : string[]; 
    initValue : string| undefined;
    setVariable: (variable: string) => void;
}

export const VariableCombo = ({variables, initValue, setVariable} : ComboProps) => {

    return (
        <Combobox items={variables} defaultInputValue={initValue} onValueChange={e => setVariable(e as string)}>
            <ComboboxInput placeholder="Select a variable" />
            <ComboboxContent>
                <ComboboxEmpty>No items found.</ComboboxEmpty>
                <ComboboxList className='no-scrollbar'>
                    {(item) => (
                        <ComboboxItem key={item} value={item}>
                            {item}
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    )
}

