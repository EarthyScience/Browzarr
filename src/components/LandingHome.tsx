"use client";
import * as THREE from "three";

THREE.Cache.enabled = true;

import { useEffect, useMemo } from "react";
import { useShallow } from "zustand/shallow";
import { LandingShapes, Plot, PlotArea } from "@/components/plots";
import { Error, Loading, MainPanel, Navbar } from "@/components/ui";
import {
	GetTitleDescription,
	GetVariableNames,
	GetZarrMetadata,
} from "@/components/zarr/GetMetadata";
import { GetStore, ZarrDataset } from "@/components/zarr/ZarrLoaderLRU";
import { useGlobalStore, useZarrStore } from "@/utils/GlobalStates";

export function LandingHome() {
	const {
		initStore,
		timeSeries,
		variable,
		plotOn,
		setZMeta,
		setVariables,
		setPlotOn,
		setTitleDescription,
	} = useGlobalStore(
		useShallow((state) => ({
			initStore: state.initStore,
			timeSeries: state.timeSeries,
			variable: state.variable,
			plotOn: state.plotOn,
			setZMeta: state.setZMeta,
			setVariables: state.setVariables,
			setPlotOn: state.setPlotOn,
			setTitleDescription: state.setTitleDescription,
		})),
	);

	const { currentStore, setCurrentStore, setZSlice, setYSlice, setXSlice } =
		useZarrStore(
			useShallow((state) => ({
				currentStore: state.currentStore,
				setCurrentStore: state.setCurrentStore,
				setZSlice: state.setZSlice,
				setYSlice: state.setYSlice,
				setXSlice: state.setXSlice,
			})),
		);
	function resetSlices() {
		setZSlice([0, null]);
		setYSlice([0, null]);
		setXSlice([0, null]);
	}
	useEffect(() => {
		// Update store if URL changes
		resetSlices();
		if (initStore.startsWith("local")) {
			// Don't fetch store if local
			return;
		}
		const newStore = GetStore(initStore);
		setCurrentStore(newStore);
	}, [initStore, setCurrentStore]);

	const ZarrDS = useMemo(() => new ZarrDataset(currentStore), [currentStore]);

	useEffect(() => {
		let isMounted = true;

		GetTitleDescription(currentStore).then((result) => {
			if (isMounted) setTitleDescription(result);
		});

		const fullmetadata = GetZarrMetadata(currentStore);
		const variables = GetVariableNames(fullmetadata);

		fullmetadata.then((e) => setZMeta(e));
		variables.then((e) => setVariables(e));

		return () => {
			isMounted = false;
		};
	}, [currentStore, setZMeta, setVariables, setTitleDescription]);

	return (
		<>
			<MainPanel />
			{variable == "Default" && <LandingShapes />}
			<Error />
			{!plotOn && <Navbar />}
			<Loading />

			{/* {variable === "Default" && <ScrollableLinksTable />} */}
			{variable != "Default" && <Plot ZarrDS={ZarrDS} />}
			{Object.keys(timeSeries).length >= 1 && <PlotArea />}
		</>
	);
}

export default LandingHome;
