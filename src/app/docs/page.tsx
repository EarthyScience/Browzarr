import Link from "next/link";

export const metadata = {
	title: "browzarr.io/docs",
	description: "Tutorial and documentation for Browzarr",
};

import { FaStar, FaThumbtack, FaGithub } from "react-icons/fa";
import { IoCloseCircleSharp, IoImage } from "react-icons/io5";
import { RxReset } from "react-icons/rx";
import { FaPlus, FaMinus } from "react-icons/fa";
import { HiHomeModern } from "react-icons/hi2";
import { HiInformationCircle } from "react-icons/hi";
import {
	MdFlipCameraIos,
	MdOutlineRocketLaunch,
	MdOutlineSwapVert,
	MdOutlineSquare,
} from "react-icons/md";
import { FaCarSide } from "react-icons/fa6";
import { VscGraphLine } from "react-icons/vsc";
import {
	BsMoonStarsFill,
	BsSunFill,
	BsFillQuestionCircleFill,
	BsTags,
} from "react-icons/bs";
import {
	FaCheck,
	FaPlay,
	FaPause,
	FaForwardStep,
	FaBackwardStep,
} from "react-icons/fa6";
import { LuChevronDown, LuSettings } from "react-icons/lu";
import {
	PiMathOperationsBold,
	PiPlayPauseFill,
	PiSphereThin,
	PiCubeLight,
} from "react-icons/pi";
import { CiUndo } from "react-icons/ci";
import { CgMenuGridO } from "react-icons/cg";
import { TbDatabasePlus, TbVariable } from "react-icons/tb";

export default function DocsPage() {
	return (
		<div className="px-4 py-8 max-w-4xl mx-auto">
			<h1 className="text-3xl font-bold mb-4 mt-8">
				Browzarr&rsquo;s features
			</h1>
			<div className="mb-6 text-2xl flex flex-wrap gap-4">
				<BsFillQuestionCircleFill />
				<FaBackwardStep />
				<FaForwardStep />
				<PiPlayPauseFill />
				<LuSettings />
				<LuChevronDown />
				<FaCheck />
				<BsTags />
				<TbVariable />
				<TbDatabasePlus />
				<CiUndo />
				<PiMathOperationsBold />
				<VscGraphLine />
				<FaCarSide />
				<MdOutlineSwapVert />
				<MdOutlineRocketLaunch />
				<MdFlipCameraIos />
				<BsSunFill />
				<BsMoonStarsFill />
				<HiInformationCircle />
				<HiHomeModern />
				<FaPlus />
				<FaMinus />
				<RxReset />
				<IoImage />
				<IoCloseCircleSharp />
				<FaGithub />
				<FaThumbtack />
				<FaStar />
				<PiCubeLight />
				<CgMenuGridO />
				<PiSphereThin />
				<MdOutlineSquare />
				<FaPlay />
				<FaPause />
			</div>
			<section className="mb-6">
				<h2 className="text-xl font-semibold">Getting started</h2>
				<p className="mt-2">
					Open a dataset via the UI, pick a variable and use the controls to
					pan, zoom and animate. This page is a good place to add step-by-step
					guides and screenshots.
				</p>
			</section>

			<section className="mb-6">
				<h2 className="text-xl font-semibold">Animation</h2>
				<ol className="list-decimal ml-5 mt-2">
					<li>
						Click the play icon in the top-right to open animation controls.
					</li>
					<li>Use the slider or FPS controls to adjust playback.</li>
					<li>
						Use &quot;Grab Prev/Next Chunk&quot; to load additional time chunks.
					</li>
				</ol>
			</section>

			<section className="mb-6">
				<h2 className="text-xl font-semibold">Contributing</h2>
				<p className="mt-2">
					Add docs in this folder (src/app/docs). For larger docs, add sub-pages
					or a layout at <code>src/app/docs/layout.tsx</code>.
				</p>
			</section>

			<div className="mt-8">
				<Link href="/" className="text-sm text-primary underline">
					← Back to app
				</Link>
			</div>
		</div>
	);
}
