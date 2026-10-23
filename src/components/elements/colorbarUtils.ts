export function Num2String(value: number){
    if ((Math.abs(value) > 1e-3 && Math.abs(value) < 1e6) || value === 0){
        return parseFloat(value.toFixed(2)).toString() // This seems redundant but it removes trailing zeros
    } else{
        return value.toExponential(2)
    }
}

export const operationMap = {
    // Reductions
    Mean: "Mean",
    Min: "Min",
    Max: "Max",
    StDev: "StDev",
    LinearSlope: "Slope",
    // 3D Convolutions
    Mean3D: "Local Mean",
    Min3D: "Local Min",
    Max3D: "Local Max",
    StDev3D: "Local StDev",
    // 2D Convolutions
    Mean2D: "Local Mean",
    Min2D: "Local Min",
    Max2D: "Local Max",
    StDev2D: "Local StDev",
    // Multivariate
    Correlation2D: "R",
    Correlation3D: "Local R",
    TwoVarLinearSlope2D: "Slope",
    TwoVarLinearSlope3D: "Local Slope",
    Covariance2D: "Covariance",
    Covariance3D: "Covariance",
    // Special
    CUMSUM3D: "Cumulative Sum"
};