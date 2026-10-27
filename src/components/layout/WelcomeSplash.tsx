import React, { useMemo, useEffect, useCallback, useRef, useId, useState } from 'react'
import { getCookie, setCookie } from '@/lib/cookies'
import { Button } from '../ui';
import { MainLogo } from '../elements/MainLogo';
import './css/WelcomeSplash.css'

const WelcomeSplash = () => {
	const hideWelcome = useMemo(()=>getCookie('hideWelcome') ,[])

	return (
		<>
		<Welcome />
		<MainLogo />
		</>
	)
}

export default WelcomeSplash

const EXIT_MS = 220

const Welcome = () =>{
	const [closing, setClosing] = useState(false);
	const panelRef = useRef<HTMLDivElement>(null);
	const primaryRef = useRef<HTMLButtonElement>(null);
	const timer = useRef<number | undefined>(undefined);
	const titleId = useId();
	const descId = useId();
	const accent = "#7cc4e8";
	const finish = useCallback(()=> undefined
	,[]);
	return(
		<div
			className={`bz-splash ${closing ? "bz-closing" : ""}`}
			style={{ "--bz-accent": accent }}
		> 
		<div
			ref={panelRef}
			className="bz-panel"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			aria-describedby={descId}
		>
			<button
			type="button"
			className="bz-x"
			aria-label="Close welcome"
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
				<MainLogo />
			</div>

			<h2 id={titleId} className="bz-title">
				SOMEThING
			</h2>
			<p id={descId} className="bz-tagline">
				ELSE
			</p>
			</header>

			<ul className="bz-links">
			{/* {links.map((l) => (
				<li key={l.title}>
				<a
					href={l.href}
					{...(l.external
					? { target: "_blank", rel: "noopener noreferrer" }
					: {})}
				>
					<span className="bz-link-title">{l.title}</span>
					<span className="bz-link-desc">{l.description}</span>
				</a>
				</li>
			))} */}
			</ul>

			<footer className="bz-footer">
			<Button
				className='cursor-pointer'
				variant='secondary'
			>
				Start exploring
			</Button>
			<button
				type="button"
				className="bz-btn bz-quiet"
			>
				Close and don&rsquo;t show again
			</button>
			</footer>
		</div>
		</div>
	)
}