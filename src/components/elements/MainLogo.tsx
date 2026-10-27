"use client";
import { useEffect, useState } from 'react';
import { MainLogo1, MainLogo2 } from '../widgets/Icons';

const gradientVariants = {
  // ─── Original ───
  sunsetOcean: {
    z1: "#ffd06f",
    z2: "#e76254",
    b1: "#1e466e",
    b2: "#72bcd5",
  },
  // ─── Nature-related (5) ───
  forestFloor: {      // Autumn leaves over deep woodland
    z1: "#ffb627",
    z2: "#e4572e",
    b1: "#1b3a2d",
    b2: "#5f8f6b",
  },
  alpineLake: {       // Alpenglow on snowy peaks above glacial water
    z1: "#ffe08a",
    z2: "#ff7b54",
    b1: "#0f2e4a",
    b2: "#5fa8c9",
  },
  desertDusk: {       // Sunset sand against twilight sky
    z1: "#ffcf5c",
    z2: "#d9453b",
    b1: "#3b2a5c",
    b2: "#8a7fb8",
  },
  coralReef: {        // Bright coral and anemone over tropical water
    z1: "#ff9f6e",
    z2: "#ff4f79",
    b1: "#0b3c49",
    b2: "#2fb5a8",
  },
  meadowDawn: {       // Wildflowers in a misty green field
    z1: "#ffd23f",
    z2: "#ee6c4d",
    b1: "#26452f",
    b2: "#98c9a3",
  },

  // ─── Abstract / stylized (5) ───
  neonNight: {
    z1: "#fff275",
    z2: "#ff3c78",
    b1: "#1a1446",
    b2: "#3f8efc",
  },
  citrusMidnight: {
    z1: "#d7ff3f",
    z2: "#ff8a00",
    b1: "#14213d",
    b2: "#4a5d8f",
  },
  candyArcade: {
    z1: "#ffe66d",
    z2: "#ff6b9d",
    b1: "#2b1b5a",
    b2: "#7b6cf6",
  },
  molten: {
    z1: "#ffc857",
    z2: "#f2542d",
    b1: "#1f2937",
    b2: "#5b7083",
  },
  electricMint: {
    z1: "#fff07a",
    z2: "#ff5d73",
    b1: "#0d2b3e",
    b2: "#4fd1c5",
  },
  mossAndBerry: {      // Wild berries on mossy ground (magenta Zs on green Bs)
    z1: "#ff4d8d",
    z2: "#ffa3c4",
    b1: "#23401c",
    b2: "#8fae5a",
  },
  auroraNight: {       // Northern lights over dark sky (cool Zs on cool Bs, pops via luminance)
    z1: "#5cffb1",
    z2: "#b86bff",
    b1: "#0a1128",
    b2: "#1f3b6e",
  },
  canyonRiver: {       // Turquoise river cutting through red rock (cool Zs on warm Bs)
    z1: "#5ff2e0",
    z2: "#2f9bff",
    b1: "#4a1d0e",
    b2: "#c9742f",
  },
  cherryBlossom: {     // Pale petals and fresh leaves against deep wine bark
    z1: "#fff1b8",
    z2: "#6fe0a4",
    b1: "#4d1328",
    b2: "#b84a73",
  },
  lavenderField: {     // Lime stems and teal shade over layered purple rows
    z1: "#d4ff4f",
    z2: "#35e0a1",
    b1: "#34225e",
    b2: "#a58bd9",
  },

  // ─── Abstract / stylized (5) ───
  monoInk: {           // Neutral grays, neon accents
    z1: "#c6ff00",
    z2: "#00e0ff",
    b1: "#111111",
    b2: "#6b6b6b",
  },
  paperPop: {          // Light Bs, dark saturated Zs (value is inverted)
    z1: "#1d3bff",
    z2: "#ff3d2e",
    b1: "#f4efe6",
    b2: "#d9cfbf",
  },
  synthGreen: {        // Magenta/purple Bs, acid green/cyan Zs
    z1: "#b8ff3c",
    z2: "#00f5d4",
    b1: "#3a0b4d",
    b2: "#b5179e",
  },
  triadicBlue: {       // Magenta + lime Zs on a bright blue base
    z1: "#ff2fb3",
    z2: "#b6ff2e",
    b1: "#1b3a8a",
    b2: "#5aa0ff",
  },
  oliveElectric: {     // Earthy olive Bs, electric pink/blue Zs
    z1: "#ff4fd8",
    z2: "#4fa3ff",
    b1: "#33381c",
    b2: "#8a8f4e",
  },
};


export const MainLogo = () => {
	const [variant, setVariant] = useState<boolean | undefined>(undefined);
  const [colorScheme, setColorScheme] = useState<any>({})
	const {z1, z2, b1, b2} = colorScheme;
  // const intervalRef = useRef();
  useEffect(() => {
    setVariant(Math.random() >= 0.5);
    const gradients = Object.keys(gradientVariants);
    const thisGradient = gradients[Math.floor(Math.random() * gradients.length)]
    setColorScheme(gradientVariants[thisGradient as keyof typeof gradientVariants])
  }, []);

  const style = {
    position:'absolute',
    width:'50%',
    left:'50%',
    bottom:'20%',
    transform:'translateX(-50%)',
    color: 'var(--logo-text)',
    animation: 'logo-pulse 5s ease-in-out infinite'
  }
	return (
		<div style={{
			position:'absolute',
			zIndex:5,
      width:"100%",
      height:'100%',
      pointerEvents:'none'
		}}>
			{colorScheme.z1 && (variant 
				? <MainLogo2 style={style} z1={z1} z2={z2} b1={b1} b2={b2} />
				: <MainLogo1 style={style} z1={z1} z2={z2} b1={b1} b2={b2} />
			)}
		</div>
	)
}
