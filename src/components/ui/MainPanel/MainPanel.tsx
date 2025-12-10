"use client";

import React, { useState } from "react";
import "../css/MainPanel.css";
import { Card } from "@/components/ui/card";
import {
	AdjustPlot,
	AnalysisOptions,
	Colormaps,
	Dataset,
	PlayButton,
	PlotType,
	Variables,
} from "../index";

const MainPanel = () => {
	const [openVariables, setOpenVariables] = useState<boolean>(false);
	return (
		<Card className="panel-container">
			<Dataset setOpenVariables={setOpenVariables} />
			<Variables
				openVariables={openVariables}
				setOpenVariables={setOpenVariables}
			/>
			<PlotType />
			<Colormaps />
			<AdjustPlot />
			<PlayButton />
			<AnalysisOptions />
		</Card>
	);
};

export default MainPanel;
