"use client";

import Image from "next/image";
import { logoBGC, logoMPI } from "@/assets/index";

const AboutInfo = () => {
	return (
		<div>
			<h1>Browzarr</h1>
			builds on the lessons learned from the visualization prototype from the
			SeasFire project.
			<br />
			<br />
			<p>
				The ESA-funded SeasFire project is exploring the potential of
				spatio-temporal asynchronous links happening between pre-occurring and
				non-overlapping atmospheric conditions and European fire regimes to
				predict the seasonal burned areas sizes in Europe by leveraging two
				major advancements of our time:
			</p>
			<ul>
				<li>
					the availability of a huge amount of satellite data with a good
					spatio-temporal resolution, which will be used as fire drivers called
					the Earth system variables, and
				</li>
				<li>
					the progress in Deep Learning (DL) and especially in graph and image
					based modelling frameworks, finding methods capable of capturing the
					spatio-temporal interactions of the Earth System variables.
				</li>
			</ul>
			<a href="https://seasfire.hua.gr/" target="_blank" rel="noreferrer">
				https://seasfire.hua.gr/
			</a>
			<br />
			<a
				href="https://zenodo.org/records/8055879"
				target="_blank"
				rel="noreferrer"
			>
				zenodo
			</a>
			<p>
				<br />
				<strong>Citation: </strong> <br />
				Alonso, L., Gans, F., Karasante, I., Ahuja, A., Prapas, I., Kondylatos,
				S., Papoutsis, I., Panagiotou, E., Mihail, D., Cremer, F., Weber, U., &
				Carvalhais, N. (2023). SeasFire Cube: A Global Dataset for Seasonal Fire
				Modeling in the Earth System (0.3) [Data set]. Zenodo.
				https://doi.org/10.5281/zenodo.8055879
			</p>
			<br />
			<p>
				{" "}
				<strong> Contact :</strong>
			</p>
			<div>
				<span>
					<a
						href="https://lazarusa.github.io/"
						target="_blank"
						rel="noreferrer"
					>
						<strong>Lazaro Alonso</strong>
					</a>{" "}
					&
					<a
						href="https://www.bgc-jena.mpg.de/person/jpoehls/2206"
						target="_blank"
						rel="noreferrer"
					>
						<strong> Jeran Poehls</strong>
					</a>
				</span>
			</div>
			<br></br>
			<p>
				<strong>Max-Planck Institute for Biogeochemistry</strong>
				<br />
				Hans-Knöll Str. 10
				<br />
				07745 Jena
			</p>
			<br></br>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<a
					href="https://www.bgc-jena.mpg.de/en/bgi/home"
					target="_blank"
					rel="noreferrer"
				>
					<Image src={logoMPI} alt="logoMPI" height={32} />
				</a>
				<a
					href="https://www.bgc-jena.mpg.de/en/bgi/mdi"
					target="_blank"
					rel="noreferrer"
				>
					<Image src={logoBGC} alt="logoBGC" height={32} />
				</a>
			</div>
			<br></br>
			<p>
				Ⓒ{" "}
				<a
					href="https://github.com/EarthyScience/FireSight?tab=Apache-2.0-1-ov-file#readme"
					target="_blank"
					rel="noreferrer"
				>
					Apache License, Version 2.0
				</a>
			</p>
		</div>
	);
};

export default AboutInfo;
