import React, {useRef} from 'react'
import { Button } from '../button'
import { Input } from '../input'
import { glslValidator } from '@/utils/glslValidator'
import { QuickTip } from '../Widgets/QuickTip'
import { useErrorStore } from '@/GlobalStates/ErrorStore'
import { useShallow } from 'zustand/shallow'

const ColorAdjuster = () => {
    const customShader = useRef('');
	const {setError, setCustomError} = useErrorStore(useShallow(s => s))
	const handleShader = () =>{
		const {ok, log} = glslValidator(customShader.current)
		if (!ok){
			setError('glsl')
			if (!log) return;
			const thirdIdx = log.indexOf(":", log.indexOf(":", log.indexOf(":") + 1) + 1)
			setCustomError(log.slice(thirdIdx+1))
			return
		} 
	}

	return (
		<div>
			<QuickTip message='Write operations in GLSL. Click __ for available methods'>
				<Input type='string' placeholder='apply operations to "x"'
					onChange={e=>customShader.current = e.target.value}
				/>
			</QuickTip>
			<Button
				onClick={handleShader}
			>
				Apply Operation
			</Button>

		</div>
	)
}

export default ColorAdjuster
