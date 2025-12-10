export function updateMetadataDescription(
	meta: Record<string, string | number | boolean | string[]>,
	containerId: string,
	nameId: string,
	unitsId: string,
) {
	const cDescription = document.getElementById(containerId);
	const cName = document.getElementById(nameId);
	const cUnits = document.getElementById(unitsId);

	if (cDescription && Object.keys(meta).length > 0) {
		// Create header
		let content = '<strong class="metadata-header">Metadata</strong>';
		// Create a container for the metadata content
		content += '<div class="metadata-content">';
		// Convert the meta object to a formatted string with bold keys
		const metaString = Object.entries(meta)
			.map(([key, value]) => {
				// adds variable name
				if (cName && key === "name") {
					cName.innerHTML = "";
					cName.innerHTML = `${value}`;
				}
				// adds units
				if (cUnits && key === "units") {
					cUnits.innerHTML = "";
					cUnits.innerHTML = `${value}`;
				}
				// all metadata
				if (Array.isArray(value)) {
					return `<strong>${key}</strong>: [${value.join(", ")}]`;
				}
				return `<strong>${key}</strong>: ${value}`;
			})
			.join("<br>");
		// Add metadata to the container
		content += metaString;
		content += "</div>";
		// Update the content
		cDescription.innerHTML = content;
	}
	return () => {}; // Return empty cleanup function if conditions are not met
}
