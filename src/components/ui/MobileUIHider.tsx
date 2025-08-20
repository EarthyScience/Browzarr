"use client";

import { useEffect, useRef } from "react";

const isIOSSafari = () => {
	if (typeof navigator === "undefined") return false;
	const ua = navigator.userAgent;
	const isIOS = /iP(hone|ad)/i.test(ua);
	const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/i.test(ua);
	return isIOS && isSafari;
};

const isMobile = () => typeof window !== "undefined" && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

const MobileUIHider: React.FC = () => {
	const activatedRef = useRef<boolean>(false);
	const spacerRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!isMobile()) return;
		if (sessionStorage.getItem("ui-hide-activated") === "1") {
			activatedRef.current = true;
			return;
		}

		const ensureSpacer = () => {
			const viewportH = typeof window !== "undefined" ? window.innerHeight : 800;
			const extraRatio = isIOSSafari() ? 0.2 : 0.15;
			const h = Math.max(120, Math.round(viewportH * extraRatio));
			if (!spacerRef.current) {
				const spacer = document.createElement("div");
				spacer.style.width = "1px";
				spacer.style.pointerEvents = "none";
				spacer.style.opacity = "0";
				spacer.style.userSelect = "none";
				spacer.setAttribute("aria-hidden", "true");
				spacerRef.current = spacer;
				document.body.appendChild(spacer);
			}
			spacerRef.current!.style.height = `${h}px`;
			return spacerRef.current;
		};

		const sequenceScroll = () => {
			// Sequence tiny scrolls; some browsers need multiple frames
			requestAnimationFrame(() => {
				window.scrollTo(0, 1);
				setTimeout(() => window.scrollTo(0, 1), 50);
				setTimeout(() => window.scrollTo(0, 1), 150);
			});
		};

		const attemptHideUI = async () => {
			if (activatedRef.current) return;
			activatedRef.current = true;
			sessionStorage.setItem("ui-hide-activated", "1");

			// Try fullscreen where allowed (e.g., Android Chrome)
			const root = document.documentElement as any;
			try {
				if (root.requestFullscreen) {
					await root.requestFullscreen({ navigationUI: "hide" } as any);
				} else if (root.webkitRequestFullscreen) {
					root.webkitRequestFullscreen();
				}
			} catch (_) {
				/* no-op */
			}

			ensureSpacer();
			sequenceScroll();
		};

		const onFirstInteraction = () => {
			attemptHideUI();
			document.removeEventListener("pointerdown", onFirstInteraction);
			document.removeEventListener("pointerup", onFirstInteraction);
			document.removeEventListener("touchend", onFirstInteraction);
			document.removeEventListener("keydown", onFirstInteraction);
		};

		document.addEventListener("pointerdown", onFirstInteraction, { passive: true } as any);
		document.addEventListener("pointerup", onFirstInteraction, { passive: true } as any);
		document.addEventListener("touchend", onFirstInteraction, { passive: true } as any);
		document.addEventListener("keydown", onFirstInteraction);

		const onViewportChange = () => {
			if (!activatedRef.current) return;
			ensureSpacer();
			sequenceScroll();
		};
		window.addEventListener("orientationchange", onViewportChange);
		window.addEventListener("resize", onViewportChange);
		if (window.visualViewport) {
			window.visualViewport.addEventListener("resize", onViewportChange);
		}
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "visible" && activatedRef.current) {
				ensureSpacer();
				sequenceScroll();
			}
		});

		return () => {
			document.removeEventListener("pointerdown", onFirstInteraction);
			document.removeEventListener("pointerup", onFirstInteraction);
			document.removeEventListener("touchend", onFirstInteraction);
			document.removeEventListener("keydown", onFirstInteraction);
			window.removeEventListener("orientationchange", onViewportChange);
			window.removeEventListener("resize", onViewportChange);
			if (window.visualViewport) {
				window.visualViewport.removeEventListener("resize", onViewportChange);
			}
		};
	}, []);

	return null;
};

export default MobileUIHider;
