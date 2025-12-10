"use client";

import React, { useEffect, useRef } from "react";

const KernelVisualizer = ({ size, depth }: { size: number; depth: number }) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	// useEffect hook to handle drawing on the canvas whenever size or depth changes
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return; // Exit if canvas is not yet available

		const ctx = canvas.getContext("2d");
		if (!ctx) return; // Exit if context cannot be obtained

		const canvasSize = 150; // Fixed canvas dimension
		canvas.width = canvasSize;
		canvas.height = canvasSize;

		// --- Drawing Parameters ---
		const margin = 20; // Margin from the canvas edges
		const perspectiveOffset = 6; // How much each layer is offset to create a 3D effect
		const availableSpace = canvasSize - margin * 2;
		const strokeColor = "#334155"; // Dark slate color for borders
		const defaultFillColor = "rgba(255, 255, 255, 1)"; // Semi-transparent slate
		const centerFillColor = "#da5d5dff"; // Red for the center cell

		// --- Calculation for Cell Sizing ---
		// Calculate the total offset caused by all depth layers
		const totalDepthOffset = Math.max(0, depth - 1) * perspectiveOffset;

		// Calculate the size of each individual cell.
		// The cell size shrinks as `size` or `depth` increases to fit the fixed canvas.
		const cellSize = (availableSpace - totalDepthOffset) / size;

		// Clear the canvas before redrawing
		ctx.clearRect(0, 0, canvasSize, canvasSize);

		// --- Drawing Logic ---
		// Loop through each layer, starting from the back (d = depth - 1) to the front (d = 0).
		// This ensures that front layers are drawn on top of back layers.
		for (let d = depth - 1; d >= 0; d--) {
			// Calculate the starting position for the current layer, including perspective offset
			const layerOffsetX = d * perspectiveOffset;
			const layerOffsetY = (d * perspectiveOffset) / 1.5;

			// Loop through each row and column to draw the cells for the current layer
			for (let row = 0; row < size; row++) {
				for (let col = 0; col < size; col++) {
					// Determine if the current cell is the absolute center on the front-most layer
					const isCenter =
						(row === Math.floor(size / 2) && col === Math.floor(size / 2)) ||
						(d == Math.floor(depth / 2) && depth != 1);

					// Set the fill color based on whether it's the center cell
					ctx.fillStyle = isCenter ? centerFillColor : defaultFillColor;
					ctx.strokeStyle = strokeColor;
					ctx.lineWidth = 1;

					// Calculate the x and y coordinates for the current cell
					const x = margin + layerOffsetX + col * cellSize;
					const y = margin + layerOffsetY + row * cellSize;

					// Draw the cell rectangle
					ctx.beginPath();
					ctx.rect(x, y, cellSize, cellSize);
					ctx.fill();
					ctx.stroke();
				}
			}
		}
	}, [size, depth]); // Rerun this effect if size or depth changes

	return <canvas ref={canvasRef} />;
};

export default KernelVisualizer;
