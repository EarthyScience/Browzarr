"use client";
import React, { useEffect, useState } from "react";
import { BsTags } from "react-icons/bs";
import { FaCheck } from "react-icons/fa6";
import { LuChevronDown } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

const VersionSelector = () => {
	const [versions, setVersions] = useState<string[]>([]);
	const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

	useEffect(() => {
		const { hostname, pathname, origin } = window.location;
		const pathSegments = pathname.split("/").filter(Boolean);

		const isGitHubPages = hostname.endsWith("github.io");
		const isLocalhost = hostname === "localhost" || hostname.startsWith("10.");

		const repoBase =
			isGitHubPages && pathSegments.length ? `/${pathSegments[0]}` : "";

		// dev mode: no versions.json
		if (isLocalhost) {
			setTimeout(() => {
				setVersions(["latest"]);
				setSelectedVersion("latest");
			}, 0);
			return;
		}

		const versionsUrl = `${origin}${repoBase}/versions.json`;

		fetch(versionsUrl)
			.then((res) => {
				if (!res.ok) throw new Error(`Failed to load ${versionsUrl}`);
				return res.json();
			})
			.then((data: string[]) => {
				const sorted = data.sort((a, b) => {
					if (a === "latest") return -1;
					if (b === "latest") return 1;
					const parse = (v: string) =>
						v.replace("v", "").split(".").map(Number);
					const [aMaj, aMin, aPatch] = parse(a);
					const [bMaj, bMin, bPatch] = parse(b);
					if (aMaj !== bMaj) return bMaj - aMaj;
					if (aMin !== bMin) return bMin - aMin;
					return bPatch - aPatch;
				});

				setVersions(sorted);

				const currentVersionFromPath = isGitHubPages
					? pathSegments[1] || "latest" // repo/version/...
					: pathSegments[0] || "latest"; // version/... on custom domain

				const detectedVersion = sorted.find(
					(v) => v === currentVersionFromPath,
				);
				setSelectedVersion(detectedVersion || sorted[0] || null);
			})
			.catch((err) => {
				console.error("Could not fetch versions.json", err);
				setVersions(["latest"]);
				setSelectedVersion("latest");
			});
	}, []);

	const handleVersionSelect = (version: string) => {
		setSelectedVersion(version);
		setIsOpen(false);

		const { hostname, pathname } = window.location;
		const pathSegments = pathname.split("/").filter(Boolean);

		const isGitHubPages = hostname.endsWith("github.io");
		const repoBase =
			isGitHubPages && pathSegments.length ? `/${pathSegments[0]}` : "";

		const targetUrl =
			version === "latest" ? `${repoBase}/latest/` : `${repoBase}/${version}/`;
		setRedirectUrl(targetUrl);
	};
	useEffect(() => {
		if (redirectUrl) {
			window.location.href = redirectUrl;
		}
	}, [redirectUrl]);

	if (!versions.length || !selectedVersion) return null;

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<Tooltip>
				<TooltipTrigger asChild>
					<PopoverTrigger asChild>
						<Button variant="ghost" size="sm" className="cursor-pointer">
							<span>
								<BsTags />
							</span>
							<LuChevronDown
								className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
							/>
						</Button>
					</PopoverTrigger>
				</TooltipTrigger>
				<TooltipContent side="left">{selectedVersion}</TooltipContent>
			</Tooltip>
			<PopoverContent className="w-28 p-1" align="end">
				<div className="space-y-1">
					{versions.map((version) => (
						<Button
							key={version}
							variant="ghost"
							size="sm"
							className="cursor-pointer flex items-center justify-between w-full px-3 py-2 text-sm rounded-sm"
							onClick={() => handleVersionSelect(version)}
							aria-label={`Select version ${version}`}
						>
							<span className={selectedVersion === version ? "font-bold" : ""}>
								{version}
							</span>
							{selectedVersion === version && (
								<FaCheck className="w-4 h-4 text-orange-600" />
							)}
						</Button>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
};

export default VersionSelector;
