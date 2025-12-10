"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useGlobalStore } from "@/utils/GlobalStates";
import { useShallow } from "zustand/shallow";

export function DatasetToast() {
	const { titleDescription } = useGlobalStore(
		useShallow((state) => ({
			titleDescription: state.titleDescription,
		})),
	);

	useEffect(() => {
		if (titleDescription?.title) {
			const id = `dataset:${titleDescription.title}`;
			toast(titleDescription.title, {
				description: titleDescription.description || "",
				action: {
					label: "Dismiss",
					onClick: () => null,
				},
			});
		}
	}, [titleDescription]);

	return null;
}

export default DatasetToast;
