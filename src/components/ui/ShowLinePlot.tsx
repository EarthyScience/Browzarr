import React from "react";
import "./css/ShowLinePlot.css";

const ShowLinePlot = ({ onClick }: { onClick: () => void }) => {
	return (
		<div className="lineplot-tab" onClick={onClick}>
			<div className="plottab-line" />
			<div className="plottab-line" />
			<div className="plottab-line" />
		</div>
	);
};

export default ShowLinePlot;
