export async function epsgToProj(code: number){
    //Fetch string from spatialreference.org
    const response = await fetch(`https://spatialreference.org/ref/epsg/${code}/proj4.txt`);
    if(!response.ok){
        throw new Error(`Failed to fetch proj4 string for EPSG:${code}`);
    } return await response.text();
}