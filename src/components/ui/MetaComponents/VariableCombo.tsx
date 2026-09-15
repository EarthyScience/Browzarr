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
    initValue : string;
    setVariable: React.Dispatch<React.SetStateAction<string>>;
}

export const VariableCombo = ({variables, initValue, setVariable} : ComboProps) => {

    return (
        <Combobox items={variables} defaultInputValue={initValue}>
            <ComboboxInput placeholder="Select a variable" />
            <ComboboxContent>
                <ComboboxEmpty>No items found.</ComboboxEmpty>
                <ComboboxList>
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

