import { create } from "zustand";

type GraphState = {
    showPoints: boolean;
    pointSize: number;
    lineWidth: number;
    lineColor: string;
    pointColor: string;
    useLineColor: boolean;
    lineResolution: number;
    useCustomColor: boolean;
    useCustomPointColor: boolean;

    setShowPoints: (showPoints: boolean) => void;
    setLinePointSize: (pointSize: number) => void;
    setLineWidth: (lineWidth: number) => void;
    setLineColor: (lineColor: string) => void;
    setPointColor: (pointColor: string) => void;
    setUseLineColor: (lineColor: boolean) => void;
    setLineResolution: (lineResolution: number) => void;
    setUseCustomColor: (useCustomColor : boolean) => void;
    setUseCustomPointColor: (useCustomPointColor: boolean) => void
}

export const useGraphStore = create<GraphState>((set, get) => ({
    showPoints: true,
    pointSize: 2,
    lineWidth: 1.25,
    lineColor: "#111111",
    pointColor: "#EA8686",
    useLineColor: false,
    lineResolution: 3,
    useCustomColor: false,
    useCustomPointColor: false,

    setShowPoints: (showPoints) => set({ showPoints }),
    setLinePointSize: (pointSize) => set({ pointSize }),
    setLineWidth: (lineWidth) => set({ lineWidth }),
    setLineColor: (lineColor) => set({ lineColor }),
    setPointColor: (pointColor) => set({ pointColor }),
    setUseLineColor: (useLineColor) => set({ useLineColor }),
    setLineResolution: (lineResolution) => set({ lineResolution }),
    setUseCustomColor: (useCustomColor) => set({ useCustomColor }),
    setUseCustomPointColor: (useCustomPointColor) => set({ useCustomPointColor}),
}))