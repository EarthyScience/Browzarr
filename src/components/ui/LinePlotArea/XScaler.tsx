"use client";

import "../css/Scalers.css";
import { useEffect, useRef, useState } from "react";

const XScaler = ({
	scale,
	setScale,
}: {
	scale: number;
	setScale: React.Dispatch<React.SetStateAction<number>>;
}) => {
	const [isResizing, setIsResizing] = useState<boolean>(false);
	const initialPosition = useRef<number | null>(null);

	// Start resizing on mousedown
	const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
		e.preventDefault(); // Prevent text selection
		setIsResizing(true);
		initialPosition.current = e.clientX; // Record starting height
	};

	// Adjust height on mousemove
	const handleMouseMove = (e: MouseEvent) => {
		if (isResizing) {
			e.preventDefault();
			const sizeDelta = initialPosition.current
				? (initialPosition.current - e.clientX) / 1000
				: 0;
			setScale(Math.min(Math.max(scale + sizeDelta, 0.1), 2));
		}
	};

	// Stop resizing on mouseup
	const handleMouseUp = () => {
		setIsResizing(false);
	};

	// Add/remove document event listeners based on resizing state
	useEffect(() => {
		if (isResizing) {
			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
		}
		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, [isResizing]);

	return (
		<div
			className="xScaler"
			onMouseDown={handleMouseDown}
			onMouseUp={handleMouseUp}
		/>
	);
};

export default XScaler;
