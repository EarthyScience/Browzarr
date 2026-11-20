import { createShaderContext, type Precision } from './common';
import { reductionShaders } from './reduction';
import { twoVarReductionShaders } from './twoVarReduction';
import { convolutionShaders } from './convolution';
import { twoVarConvolutionShaders } from './twoVarConvolution';
import { cumsumShaders } from './cumsum';

export type { Precision } from './common';
export { coarsenMinMaxShader } from './coarsen';

export const createShaders = (precision: Precision, wgs: {wgx: number, wgy: number, wgz: number}) => {
    const ctx = createShaderContext(precision, wgs);
    return {
        ...reductionShaders(ctx),
        ...twoVarReductionShaders(ctx),
        ...convolutionShaders(ctx),
        ...twoVarConvolutionShaders(ctx),
        ...cumsumShaders(ctx),
    };
};
