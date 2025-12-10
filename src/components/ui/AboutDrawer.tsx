import Image from "next/image";
import logo from "@/app/logo.png";
import AboutInfo from "@/components/ui/AboutInfo";
import { Button } from "@/components/ui/button";
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

export default function LogoDrawer() {
	return (
		<Drawer>
			<DrawerTrigger asChild>
				<div className="left-4 z-2 py-2">
					<Tooltip delayDuration={500}>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="cursor-pointer"
								tabIndex={0}
								title="About Browzarr"
							>
								<Image src={logo} alt="browzarr" width={32} height={32} />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="right" align="start">
							<span>About Browzarr</span>
						</TooltipContent>
					</Tooltip>
				</div>
			</DrawerTrigger>

			<DrawerContent className="max-w-md mx-auto">
				<DrawerHeader>
					<DrawerTitle>About</DrawerTitle>
				</DrawerHeader>
				<div className="flex-1 overflow-y-auto px-4 pb-4">
					<AboutInfo />
				</div>
			</DrawerContent>
		</Drawer>
	);
}
