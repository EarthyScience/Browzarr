"use client";
import { getCookie, setCookie } from '@/lib/cookies';
import React, { SetStateAction, useCallback, useEffect, useState } from 'react';
import { TbExternalLink } from "react-icons/tb";
import { MainLogo } from '../elements/MainLogo';
import { Button } from '../ui';
import './css/WelcomeSplash.css';

const links = [
	{
		title:"Quick Start",
		description:"Jump in immediately with an example dataset",
		href: 'https://browzarr.io/latest/?initStore=https%3A%2F%2Fs3.bgc-jena.mpg.de%3A9000%2Fesdl-esdc-v3.0.2%2Fesdc-16d-2.5deg-46x72x1440-3.0.2.zarr&variable=air_temperature_2m&useNC=false&ndSlices=%5B%5B0%2C+10%5D%2C+%5B0%2C+null%5D%2C+%5B0%2C+null%5D%5D&plotType=volume&transparency=0.5&showBorders=true&nativeCRS=WGS84&destCRS=%2Bproj%3Dmoll&cameraPosition=%7B%22x%22%3A+-4%2C+%22y%22%3A+4%2C+%22z%22%3A+4%7D&export=false&reproject=true'
	},
	{
		title:"Documentation/Guides",
		description:"Get an overview on the systems and workflows in Browzarr",
		href: "https://browzarr.io/docs/getting-started/introduction",
		icon: <TbExternalLink />
	},
	{
		title:"Follow Development",
		description:"Get an overview on the systems and workflows in Browzarr",
		href: "https://github.com/EarthyScience/Browzarr",
		icon: <TbExternalLink />
	},
]

const WelcomeSplash = () => {
	const [hideSplash, setHideSplash] = useState(false)
	useEffect(()=>{
		const cookieVal = getCookie("hideSplash") as boolean | undefined
		setHideSplash(Boolean(cookieVal))
	},[])

	return (
		<>
		{!hideSplash && <Welcome setHideSplash={setHideSplash} />}
		{hideSplash && <MainLogo style={{maxWidth:'500px'}}/>}
		</>
	)
}

export default WelcomeSplash

const Welcome = ({setHideSplash} : {setHideSplash: React.Dispatch<SetStateAction<boolean>>}) =>{
	const finish = useCallback(
		(kind: "close" | "never")=> {
			if (kind === 'never')setCookie('hideSplash', true, 30)
			setHideSplash(true)
		}
	,[]);

	const style = {
		width:"90%",
		bottom:"10%"
	}
	return(
		<div
			className={`bz-splash`}
		> 
		<div
			className="bz-panel"
			role="dialog"
		>
			<button
			type="button"
			className="bz-x"
			onClick={()=>finish("close")}
			>
			<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
				<path
				d="M2 2l10 10M12 2L2 12"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				/>
			</svg>
			</button>

			<header className="bz-header">
				<div className="bz-stage" >
					<MainLogo style={style}/>
				</div>

				<h2 className="bz-title">
					Welcome to Browzarr
				</h2>
				<p className="bz-tagline">
					Explore Earth science datasets in 3D, right in your browser.
				</p>
			</header>

			<ul className="bz-links">
			{links.map((l) => (
				<li key={l.title}>
				<a
					href={l.href}
					target={l.icon ? "_blank" : undefined}
					rel={l.icon ? "noopener noreferrer" : undefined}
				>
					<span className="bz-link-title">{l.title}{l.icon}</span>
					<span className="bz-link-desc">{l.description}</span>
				</a>
				</li>
			))}
			</ul>

			<footer className="bz-footer">
			<Button
				className='cursor-pointer'
				variant='secondary'
				onClick={()=>finish("close")}
			>
				Start exploring
			</Button>
			<button
				type="button"
				className="bz-btn bz-quiet"
				onClick={()=>finish("never")}
			>
				Close and don&rsquo;t show again
			</button>
			</footer>
		</div>
		</div>
	)
}