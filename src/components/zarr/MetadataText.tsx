import { Edges, RoundedBox, Text, useCursor } from "@react-three/drei";
import { useRef, useState } from "react";
import { Group } from "three";
import { ZarrMetadata } from "@/components/zarr/Interfaces";
import { useGlobalStore } from "@/utils/GlobalStates"; // Import global store

interface MetadataTextProps {
	position?: [number, number, number];
	metadata: ZarrMetadata;
	fontSize?: number;
	maxWidth?: number;
	textColor?: string;
	backgroundColor?: string;
	hoverColor?: string;
	viewHoverColor?: string;
	onViewClick?: (name: string) => void;
}

export default function MetadataText({
	position = [0, 0, 0],
	metadata,
	fontSize = 0.15,
	maxWidth = 2.85,
	textColor = "white",
	backgroundColor = "#292b32",
	hoverColor = "#1e1e1e",
	viewHoverColor = "gold",
	onViewClick = () => {},
}: MetadataTextProps) {
	const groupRef = useRef<Group>(null);
	const [hovered, setHovered] = useState(false);
	const [viewHovered, setViewHovered] = useState(false);
	useCursor(viewHovered);

	const setVariable = useGlobalStore((state) => state.setVariable); // Access the global setter

	const handleViewClick = (e: any) => {
		e.stopPropagation();
		if (onViewClick) onViewClick(metadata.name);
		setVariable(metadata.name); // Update global variable here
	};

	const formatArray = (value: string | number[]): string => {
		if (typeof value === "string") return value;
		return Array.isArray(value) ? value.join(", ") : String(value);
	};

	const content = `
name: ${metadata.name}
${metadata.groupPath ? `group: ${metadata.groupPath}\n` : ""}shape: [${formatArray(metadata.shape)}]
chunks: [${formatArray(metadata.chunks)}]
dtype: ${metadata.dtype}
total size: ${metadata.totalSizeFormatted}
chunk count: ${metadata.chunkCount}
chunk size: ${metadata.chunkSizeFormatted}
`.trim();

	const padding = 0.1;
	const width = maxWidth;
	const lineCount = content.split("\n").length;
	const height = fontSize * lineCount * 1.4;

	return (
		<group
			ref={groupRef}
			position={position}
			onPointerDown={(e) => e.stopPropagation()}
			onClick={(e) => e.stopPropagation()}
			onPointerOver={(e) => {
				e.stopPropagation();
				setHovered(true);
			}}
			onPointerOut={() => setHovered(false)}
		>
			<RoundedBox
				args={[width, height + 2 * padding, 0.01]}
				radius={0.025}
				smoothness={2}
				position={[width / 2, -height / 2, -0.03]}
			>
				<meshStandardMaterial
					color={hovered ? hoverColor : backgroundColor}
					metalness={0.7}
					roughness={0.3}
				/>
				{hovered && (
					<Edges
						scale={1.0}
						threshold={20}
						color={viewHoverColor}
						lineWidth={0.0}
					/>
				)}
			</RoundedBox>
			{/* Foreground text */}
			<Text
				position={[padding, 0, 0]}
				fontSize={fontSize}
				maxWidth={maxWidth}
				lineHeight={1.4}
				color={textColor}
				anchorX="left"
				anchorY="top"
			>
				{content}
			</Text>
			{/* middle-right "View" button */}
			<group position={[width - 0.55, -1.2, -0.0]}>
				<RoundedBox
					args={[0.9, 0.35, 0.02]}
					radius={0.025}
					smoothness={1}
					onClick={handleViewClick} // Calls `setVariable`
					onPointerOver={(e) => {
						e.stopPropagation();
						setViewHovered(true);
					}}
					onPointerOut={() => setViewHovered(false)}
				>
					<meshStandardMaterial
						color={viewHovered ? "gold" : "white"}
						metalness={0}
						roughness={0.1}
					/>
				</RoundedBox>
				<Text
					position={[0.2, 0.02, 0.011]}
					fontSize={0.16}
					color="#222831"
					anchorX="center"
					anchorY="middle"
				>
					View
				</Text>
			</group>
		</group>
	);
}
