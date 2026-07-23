import * as THREE from 'three';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useShallow } from 'zustand/shallow';
import { useCoordBounds } from '@/hooks/useCoordBounds';
import { deg2rad, getLogEps, parseColorToVec4 } from './HelperFuncs';
import { colorScaleToId, exprToGLSL } from '@/components/textures';

export interface CommonUniformParams {
  colormap: THREE.Texture;
  cOffset: number;
  cScale: number;
  animProg: number;
  nanColor: string;
  nanTransparency: number;
  colorScale: string;
  logConstant: number;
  valueScales: { minVal: number; maxVal: number; minPosVal?: number };
  lowclip: string;
  highclip: string;
  useLowclip: boolean;
  useHighclip: boolean;
  latBounds?: [number, number] | number[];
  lonBounds?: [number, number] | number[];
  valueRange?: [number, number] | number[];
  fillValue?: number;
  maskValue?: number;
}

export function useCommonPlotState() {
  const globalState = useGlobalStore(
    useShallow((state) => ({
      colormap: state.colormap,
      isFlat: state.isFlat,
      valueScales: state.valueScales,
      flipY: state.flipY,
      dataShape: state.dataShape,
      textureArrayDepths: state.textureArrayDepths,
      axisDimArrays: state.axisDimArrays,
      remapTexture: state.remapTexture,
      shape: state.shape,
    }))
  );

  const plotState = usePlotStore(
    useShallow((state) => ({
      cOffset: state.cOffset,
      cScale: state.cScale,
      animProg: state.animProg,
      nanColor: state.nanColor,
      nanTransparency: state.nanTransparency,
      fillValue: state.fillValue,
      maskValue: state.maskValue,
      maskTexture: state.maskTexture,
      valueRange: state.valueRange,
      colorScale: state.colorScale,
      logConstant: state.logConstant,
      lowclip: state.lowclip,
      highclip: state.highclip,
      useLowclip: state.useLowclip,
      useHighclip: state.useHighclip,
    }))
  );

  const { latBounds, lonBounds } = useCoordBounds();

  return {
    ...globalState,
    ...plotState,
    latBounds,
    lonBounds,
  };
}

export function createCommonUniforms(p: CommonUniformParams) {
  const minV = p.valueScales?.minVal ?? 0;
  const maxV = p.valueScales?.maxVal ?? 1;
  const minPosV = (p.valueScales as any)?.minPosVal;
  const latB = p.latBounds ?? [0, 0];
  const lonB = p.lonBounds ?? [0, 0];
  const valR = p.valueRange ?? [0, 1];

  return {
    cmap: { value: p.colormap },
    cOffset: { value: p.cOffset },
    cScale: { value: p.cScale },
    animateProg: { value: p.animProg },
    nanColor: { value: new THREE.Color(p.nanColor) },
    nanAlpha: { value: 1 - p.nanTransparency },
    fillValue: { value: p.fillValue ?? NaN },
    maskValue: { value: p.maskValue ?? NaN },
    threshold: { value: new THREE.Vector2(valR[0], valR[1]) },
    valueRange: { value: new THREE.Vector2(valR[0], valR[1]) },
    latBounds: { value: new THREE.Vector2(deg2rad(latB[0]), deg2rad(latB[1])) },
    lonBounds: { value: new THREE.Vector2(deg2rad(lonB[0]), deg2rad(lonB[1])) },
    colorScale: { value: colorScaleToId(p.colorScale) },
    logConstant: { value: p.logConstant },
    logEps: { value: getLogEps(minV, maxV, minPosV) },
    dataRange: { value: Math.max(maxV - minV, 0.000001) },
    minVal: { value: minV },
    lowclip: { value: parseColorToVec4(p.lowclip) },
    highclip: { value: parseColorToVec4(p.highclip) },
    useLowclip: { value: p.useLowclip },
    useHighclip: { value: p.useHighclip },
  };
}

export function updateCommonUniforms(material: THREE.ShaderMaterial, p: CommonUniformParams) {
  if (!material) return;
  const u = material.uniforms;
  if (!u) return;

  const minV = p.valueScales?.minVal ?? 0;
  const maxV = p.valueScales?.maxVal ?? 1;
  const minPosV = (p.valueScales as any)?.minPosVal;
  const latB = p.latBounds ?? [0, 0];
  const lonB = p.lonBounds ?? [0, 0];
  const valR = p.valueRange ?? [0, 1];

  if (u.cmap) u.cmap.value = p.colormap;
  if (u.cOffset) u.cOffset.value = p.cOffset;
  if (u.cScale) u.cScale.value = p.cScale;
  if (u.animateProg) u.animateProg.value = p.animProg;
  if (u.nanColor) u.nanColor.value.set(p.nanColor);
  if (u.nanAlpha) u.nanAlpha.value = 1 - p.nanTransparency;
  if (u.fillValue) u.fillValue.value = p.fillValue ?? NaN;
  if (u.maskValue && p.maskValue !== undefined) u.maskValue.value = p.maskValue;
  if (u.threshold && valR) u.threshold.value.set(valR[0], valR[1]);
  if (u.valueRange && valR) u.valueRange.value.set(valR[0], valR[1]);
  if (u.latBounds && latB) u.latBounds.value.set(deg2rad(latB[0]), deg2rad(latB[1]));
  if (u.lonBounds && lonB) u.lonBounds.value.set(deg2rad(lonB[0]), deg2rad(lonB[1]));

  const scaleId = colorScaleToId(p.colorScale);
  if (u.colorScale) u.colorScale.value = scaleId;
  const customDef = scaleId === 6 ? exprToGLSL(p.colorScale) : '(val)';
  if (material.defines['CUSTOM_EXPR(val)'] !== customDef) {
    material.defines['CUSTOM_EXPR(val)'] = customDef;
    material.needsUpdate = true;
  }

  if (u.logConstant) u.logConstant.value = p.logConstant;
  if (u.logEps) u.logEps.value = getLogEps(minV, maxV, minPosV);
  if (u.dataRange) u.dataRange.value = Math.max(maxV - minV, 0.000001);
  if (u.minVal) u.minVal.value = minV;
  if (u.lowclip) u.lowclip.value = parseColorToVec4(p.lowclip);
  if (u.highclip) u.highclip.value = parseColorToVec4(p.highclip);
  if (u.useLowclip) u.useLowclip.value = p.useLowclip;
  if (u.useHighclip) u.useHighclip.value = p.useHighclip;
}
