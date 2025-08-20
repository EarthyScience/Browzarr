"use client";

import { useEffect, useRef } from "react";

const isMobile = () => typeof window !== "undefined" && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const MobileUIHider: React.FC = () => {
	const activatedRef = useRef<boolean>(false);

	useEffect(() => {
		if (!isMobile()) return;
		// Avoid re-activating within the same session
		if (sessionStorage.getItem("ui-hide-activated") === "1") {
			activatedRef.current = true;
			return;
		}

		const attemptHideUI = async () => {
			if (activatedRef.current) return;
			activatedRef.current = true;
			sessionStorage.setItem("ui-hide-activated", "1");

			const root = document.documentElement as any;
			try {
				if (root.requestFullscreen) {
					await root.requestFullscreen({ navigationUI: "hide" } as any);
				} else if (root.webkitRequestFullscreen) {
					root.webkitRequestFullscreen();
				}
			} catch (_) {
				// Ignore
			}

			// Fallback: minimal scroll to prompt UI hide on some mobile browsers
			setTimeout(() => {
				if (!document.fullscreenElement) {
					// Ensure page is scrollable by 1px
					const spacer = document.createElement("div");
					spacer.style.height = "2px";
					spacer.style.width = "1px";
					spacer.style.pointerEvents = "none";
					document.body.appendChild(spacer);
					window.scrollTo(0, 1);
					setTimeout(() => {
						spacer.remove();
					}, 500);
				}
			}, 50);
		};

		const onFirstInteraction = () => {
			attemptHideUI();
			document.removeEventListener("pointerdown", onFirstInteraction);
			document.removeEventListener("touchend", onFirstInteraction);
			document.removeEventListener("keydown", onFirstInteraction);
		};

		document.addEventListener("pointerdown", onFirstInteraction, { passive: true } as any);
		document.addEventListener("touchend", onFirstInteraction, { passive: true } as any);
		document.addEventListener("keydown", onFirstInteraction);

		return () => {
			document.removeEventListener("pointerdown", onFirstInteraction);
			document.removeEventListener("touchend", onFirstInteraction);
			document.removeEventListener("keydown", onFirstInteraction);
		};
	}, []);

	return null;
};

export default MobileUIHider;
