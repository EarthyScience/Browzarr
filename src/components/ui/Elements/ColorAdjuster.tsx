import React, {useRef} from 'react'
import { Button, Input } from '@/components/ui'
import { glslValidator } from '@/utils/glslValidator'
import { QuickTip } from '../Widgets/QuickTip'
import { useErrorStore } from '@/GlobalStates/ErrorStore'
import { useShallow } from 'zustand/shallow'
import { usePlotStore } from '@/GlobalStates/PlotStore'
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { useGlobalStore } from '@/GlobalStates/GlobalStore'
const ColorAdjuster = () => {
    const customShader = useRef('');
	const {setError, setCustomError} = useErrorStore(useShallow(s => s))
	const {colorScale} = usePlotStore(useShallow( s=>s))
	const {useF16Textures, setUseF16Textures, setStatus} = useGlobalStore(useShallow(s => s))
	const handleShader = () =>{
		const shader = customShader.current
		const {ok, log} = glslValidator(shader)
		if (!ok){
			setError('glsl')
			if (!log) return;
			const thirdIdx = log.indexOf(":", log.indexOf(":", log.indexOf(":") + 1) + 1) // The error starts with the code location in the boilerplate. This starts after that 
			setCustomError(log.slice(thirdIdx+1, log.length-2))
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
		<div className='grid gap-2'>
			{colorScale 
			? <p>Current operation: {colorScale}</p>
			: <p>Apply an operation to the current plot</p>
			}
			<QuickTip message={<div>Write operations in GLSL<br/> example: <b>x / 2.0</b></div>}>
				<Input type='string' placeholder='e.g; abs(x)'
					onChange={e=>customShader.current = e.target.value}
				/>
			</QuickTip>
			<div className='flex pt-2 '>
				<Button
				className='flex-grow'
					variant='pink'
					onClick={handleShader}
				>
					Apply Operation
				</Button>
				<Popover>
					<PopoverTrigger asChild>
						<Button variant='secondary'>
							<b>?</b>
						</Button>
					</PopoverTrigger>
					<PopoverContent>
						<p>Along with general arithmetic operations. The following globals can also be used:</p>
						<ul className='grid grid-cols-2 !list-none bg-gray-100 rounded-lg border-solid border-2'>
							{[
								'abs(x)', 'sqrt(x)', 'min(x, y)', 'max(x, y)', 
								'log(x)', 'log2(x)',  'exp(x)', 'exp2(x)', 
								'pow(x, y)', 'floor(x)', 'ceil(x)',  ,'mod(x, y)',
								'round(x)', 'mix(x, y, a)', 
								'fract(x)', 'inverseqrt(x)',
							].map((fn)=> (
								<li key={fn} className='font-mono '>{fn}</li>
							))}
						</ul>
						<p className='warn-box text-center'>Always use <b>FLOAT</b> <br/>
							<s>50</s> → <b>50.0</b>
						</p>
					</PopoverContent>
				</Popover>
			</div>
			<QuickTip message={
				<div>
					By default, Browzarr uses <span className='font-mono'>8-bit</span> textures
					to save memory.<br/>
					Switching to <span className='font-mono'>16-bit</span> provides
					greater granularity for high variability datasets.
				</div>
			}>
				<Button variant='pink'
					onClick={() =>{ setUseF16Textures(!useF16Textures); setStatus("Converting")}}
				>
					Use <span className='font-mono'>{useF16Textures ? '8-bit' : '16-bit'}</span> textures
				</Button>
			</QuickTip>
			
			
		</div>
	)
}

export const functionInjector = (shader:string, colorScale: string | undefined) => {
	if (!colorScale) return shader;
	const functionText = `
		denorm(x);
		${colorScale}
		norm(x);
	`
	return shader.replace('//LOGIC' , functionText)
}



export default ColorAdjuster
