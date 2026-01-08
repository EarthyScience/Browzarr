import { useEffect, useState } from "react";

/**
 * NetCDF WASM loader hook
 * Note: WASM files are automatically copied to `public/` during npm install
 */

export default function useNetCDF() {
  const [NetCDF4, setNetCDF4] = useState<any>(null);
  
  useEffect(() => {
    let mounted = true;
    
    (async () => {
      try {
        const { NetCDF4 } = await import("@earthyscience/netcdf4-wasm");
        
        if (mounted) {
          setNetCDF4(() => NetCDF4); // Wrap in function to prevent React from invoking it
        }
      } catch (err) {
        console.error("Failed to load NetCDF WASM:", err);
      }
    })();
    
    return () => {
      mounted = false;
    };
  }, []);
  
  return NetCDF4;
}