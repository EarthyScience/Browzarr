import React, {useRef} from 'react'
import { Button, Input } from '@/components/ui'
import { glslValidator } from '@/utils/glslValidator'
import { QuickTip } from '../Widgets/QuickTip'
import { useErrorStore } from '@/GlobalStates/ErrorStore'
import { useShallow } from 'zustand/shallow'
import { usePlotStore } from '@/GlobalStates/PlotStore'
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
const ColorAdjuster = () => {
    const customShader = useRef('');
	const {setError, setCustomError} = useErrorStore(useShallow(s => s))
	const {colorScale} = usePlotStore(useShallow( s=>s))
	const handleShader = () =>{
		const shader = customShader.current
		const {ok, log} = glslValidator(shader)
		if (!ok){
			setError('glsl')
			if (!log) return;
			const thirdIdx = log.indexOf(":", log.indexOf(":", log.indexOf(":") + 1) + 1) // The error starts with the code location in the boilerplate. This starts after that 
			setCustomError(log.slice(thirdIdx+1))
			return
		} 
		if (shader.length == 0){
			usePlotStore.setState({colorScale:undefined});
			return;
		}
		const glslString = `x = ${shader};`
		usePlotStore.setState({colorScale:glslString})
	}

	return (
		<div>
			{colorScale 
			? <p>Current operation: {colorScale}</p>
			: <p>Apply an operation to the current plot</p>
			}
			<QuickTip message='Write operations in GLSL. Click __ for available methods'>
				<Input type='string' placeholder='apply operations to "x"'
					onChange={e=>customShader.current = e.target.value}
				/>
			</QuickTip>
			<Button
				variant='pink'
				onClick={handleShader}
			>
				Apply Operation
			</Button>
			<Popover>
				<PopoverTrigger asChild>
					<Button variant='secondary'>
						Functions List
					</Button>
				</PopoverTrigger>
				<PopoverContent>
					<p>Along with general arithmetic operations. The following globals can also be used:</p>
					<ul className='columns-2'>
						<li></li>
					</ul>
				</PopoverContent>
			</Popover>
			
		</div>
	)
}

export default ColorAdjuster
