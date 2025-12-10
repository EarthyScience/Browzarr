import * as THREE from "three";
import { useMemo, useState, useEffect, useRef } from "react";
import { ZarrDataset } from "@/components/zarr/ZarrLoaderLRU";
import {
	parseUVCoords,
	getUnitAxis,
	GetTimeSeries,
	GetCurrentArray,
} from "@/utils/HelperFuncs";
import {
	useAnalysisStore,
	useGlobalStore,
	usePlotStore,
} from "@/utils/GlobalStates";
import { useShallow } from "zustand/shallow";
import { evaluate_cmap } from "js-colormaps-es";

export const UVCube = ({ ZarrDS }: { ZarrDS: ZarrDataset }) => {
	const {
		setTimeSeries,
		setPlotDim,
		setDimCoords,
		updateTimeSeries,
		updateDimCoords,
	} = useGlobalStore(
		useShallow((state) => ({
			setTimeSeries: state.setTimeSeries,
			setPlotDim: state.setPlotDim,
			setDimCoords: state.setDimCoords,
			updateTimeSeries: state.updateTimeSeries,
			updateDimCoords: state.updateDimCoords,
		})),
	);

	const { analysisMode, analysisArray } = useAnalysisStore(
		useShallow((state) => ({
			analysisMode: state.analysisMode,
			analysisArray: state.analysisArray,
		})),
	);

	const { shape, dataShape, strides, dimArrays, dimNames, dimUnits } =
		useGlobalStore(
			useShallow((state) => ({
				shape: state.shape,
				dataShape: state.dataShape,
				strides: state.strides,
				dimArrays: state.dimArrays,
				dimNames: state.dimNames,
				dimUnits: state.dimUnits,
			})),
		);

	const { selectTS, getColorIdx, incrementColorIdx } = usePlotStore(
		useShallow((state) => ({
			selectTS: state.selectTS,
			getColorIdx: state.getColorIdx,
			incrementColorIdx: state.incrementColorIdx,
		})),
	);

	const lastNormal = useRef<number | null>(0);

	function HandleTimeSeries(event: THREE.Intersection) {
		const point = event.point;
		const uv = event.uv!;
		const normal = event.normal!;
		const dimAxis = getUnitAxis(normal);
		if (dimAxis != lastNormal.current) {
			setTimeSeries({}); //Clear timeseries if new axis
			setDimCoords({});
		}
		lastNormal.current = dimAxis;

		if (ZarrDS) {
			const tempTS = GetTimeSeries(
				{
					data: analysisMode ? analysisArray : GetCurrentArray(),
					shape: dataShape,
					stride: strides,
				},
				{ uv, normal },
			);
			const plotDim = normal
				.toArray()
				.map((val, idx) => {
					if (Math.abs(val) > 0) {
						return idx;
					}
					return null;
				})
				.filter((idx) => idx !== null);
			setPlotDim(2 - plotDim[0]); //I think this 2 is only if there are 3-dims. Need to rework the logic

			const coordUV = parseUVCoords({ normal: normal, uv: uv });
			let dimCoords = coordUV.map((val, idx) =>
				val ? dimArrays[idx][Math.round(val * dimArrays[idx].length)] : null,
			);
			const thisDimNames = dimNames.filter((_, idx) => dimCoords[idx] !== null);
			const thisDimUnits = dimUnits.filter((_, idx) => dimCoords[idx] !== null);
			dimCoords = dimCoords.filter((val) => val !== null);
			const tsID = `${dimCoords[0]}_${dimCoords[1]}`;
			const tsObj = {
				color: evaluate_cmap(getColorIdx() / 10, "Paired"),
				data: tempTS,
			};
			updateTimeSeries({ [tsID]: tsObj });
			incrementColorIdx();
			const dimObj = {
				first: {
					name: thisDimNames[0],
					loc: dimCoords[0] ?? 0,
					units: thisDimUnits[0],
				},
				second: {
					name: thisDimNames[1],
					loc: dimCoords[1] ?? 0,
					units: thisDimUnits[1],
				},
				plot: {
					units: dimUnits[2 - plotDim[0]],
				},
			};
			updateDimCoords({ [tsID]: dimObj });
		}
	}

	const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

	useEffect(() => {
		return () => {
			geometry.dispose(); // Dispose when unmounted
		};
	}, []);

	return (
		<>
			<mesh
				geometry={geometry}
				scale={shape}
				onClick={(e) => {
					e.stopPropagation();
					if (e.intersections.length > 0 && selectTS) {
						HandleTimeSeries(e.intersections[0]);
					}
				}}
			>
				<meshBasicMaterial transparent opacity={0} />
			</mesh>
		</>
	);
};
