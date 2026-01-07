import { useEffect, useState } from "react";

export default function useNetCDF() {
  const [NetCDF4, setNetCDF4] = useState<any>(null);
  
  useEffect(() => {
    let mounted = true;
    
    (async () => {
      try {
        const { NetCDF4 } = await import("@lazarusa/netcdf4-wasm-test");
        
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

// TODO: Add a convenience function to copy/paste the .wasm file to public folder / before this hook is used /
// ! Also, make sure the .wasm file is in gitignore ! we don't want to bloat the repo (it's several MBs, not that big, but over time it adds up)