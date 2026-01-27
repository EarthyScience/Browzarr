"use client";
import React from "react";
import {
	ExportImageSettings,
	PlotLineButton,
	useCSSVariable,
} from "@/components/ui";
import "./css/Navbar.css";
import { useRef, useState } from "react";
import { MdFlipCameraIos } from "react-icons/md";
import { RiCloseLargeLine, RiMenu2Line } from "react-icons/ri";
import { useShallow } from "zustand/shallow";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useGlobalStore, usePlotStore } from "@/GlobalStates";
import { Orthographic, Perspective } from "./Icons";
import PerformanceMode from "./PerformanceMode";

const Navbar = React.memo(function Navbar() {
	const { isFlat, plotOn } = useGlobalStore(
		useShallow((state) => ({
			isFlat: state.isFlat,
			plotOn: state.plotOn,
		})),
	);

	const { resetCamera, useOrtho, setResetCamera, setUseOrtho } = usePlotStore(
		useShallow((state) => ({
			resetCamera: state.resetCamera,
			useOrtho: state.useOrtho,
			setResetCamera: state.setResetCamera,
			setUseOrtho: state.setUseOrtho,
		})),
	);

	const [isOpen, setIsOpen] = useState<boolean>(true);
	const navRef = useRef<HTMLElement | null>(null);
	const iconCol = useCSSVariable("--text-plot");

	return (
		<nav className="navbar" ref={navRef}>
			<Tooltip delayDuration={500}>
				<TooltipTrigger asChild>
					{plotOn && (
						<Button
							variant="ghost"
							size="icon"
							className="navbar-trigger size-10"
							aria-expanded={isOpen}
							onClick={() => setIsOpen((prev) => !prev)}
						>
							{isOpen ? (
								<RiCloseLargeLine className="size-4" />
							) : (
								<RiMenu2Line className="size-6" />
							)}
						</Button>
					)}
				</TooltipTrigger>
				<TooltipContent side="right" align="start">
					{isOpen ? "Close navigation" : "Open navigation"}
				</TooltipContent>
			</Tooltip>

			<div className={cn("navbar-content", isOpen ? "open" : "closed")}>
				{/* <LogoDrawer /> */}
				<div className="navbar-left">
					{plotOn && (
						<>
							<Tooltip delayDuration={500}>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className="size-10 cursor-pointer"
										tabIndex={0}
										onClick={() =>
											setResetCamera(!resetCamera)
										}
									>
										<MdFlipCameraIos className="size-8" />
									</Button>
								</TooltipTrigger>
								<TooltipContent side="right" align="start">
									<span>Reset camera view</span>
								</TooltipContent>
							</Tooltip>
							<Button
								variant="ghost"
								size="icon"
								className="cursor-pointer"
								onClick={() => setUseOrtho(!useOrtho)}
							>
								{useOrtho ? (
									<Orthographic
										color={iconCol}
										className="size-8"
									/>
								) : (
									<Perspective
										color={iconCol}
										className="size-8"
									/>
								)}
							</Button>
						</>
					)}

					{plotOn && !isFlat && <PlotLineButton />}
					{plotOn && (
						<>
							<ExportImageSettings />
							<PerformanceMode />
						</>
					)}
				</div>
			</div>
		</nav>
	);
});

export default Navbar;
