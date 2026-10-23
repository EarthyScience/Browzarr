"use client";
import React from "react";
import {
	ExportImageSettings,
	PlotLineButton,
	QuickTip,
	useCSSVariable,
} from "@/components/ui";
import "../css/Navbar.css";
import { useRef, useState } from "react";
import { MdFlipCameraIos } from "react-icons/md";
import { RiCloseLargeLine, RiMenu2Line } from "react-icons/ri";
import { useShallow } from "zustand/shallow";
import { Button, AxisBars } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { ParameterExport } from "./ParameterExport";
import { Orthographic, Perspective } from "../Elements/Icons";
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
	{isOpen ? "Close navigation" : "Open navigation"}
	return (
		<nav className="navbar" ref={navRef}>
			<QuickTip message={isOpen ? "Close navigation" : "Open navigation"}>
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
			</QuickTip>
			<div className={cn("navbar-content", isOpen ? "open" : "closed")}>
				{/* <LogoDrawer /> */}
				<div className="navbar-left">
						<QuickTip message='Reset camera view'>
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
						</QuickTip>
					<Button
						variant="ghost"
						size="icon"
						className="cursor-pointer"
						onClick={() => setUseOrtho(!useOrtho)}
					>
					<QuickTip message={`Change camera to use ${useOrtho ? "Perspective" : "Orthographic"} view`}>
						<div>
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
						</div>
					</QuickTip>
					</Button>
					<PlotLineButton />
					<ExportImageSettings />
					<ParameterExport />
					<PerformanceMode />
				</div>
			</div>
			{plotOn && <AxisBars />}
		</nav>
	);
});

export default Navbar;
