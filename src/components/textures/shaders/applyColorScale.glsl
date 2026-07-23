float applyColorScale(float x, int scaleType, float c, float eps, float range, float minV) {
    float safeRange = max(range, 0.000001);
    if (scaleType == 1) {
        if (minV > 0.0) {
            float K = safeRange / minV;
            float clampedX = max(x, 0.0);
            float num = log(1.0 + clampedX * K);
            float denom = log(1.0 + K);
            return denom != 0.0 ? num / denom : x;
        } else {
            float safeEps = max(eps, 0.000001);
            if (x < safeEps) return 0.0;
            float xRel = (x - safeEps) / (1.0 - safeEps);
            float K = (1.0 - safeEps) / safeEps;
            float num = log(1.0 + xRel * K);
            float denom = log(1.0 + K);
            return denom != 0.0 ? num / denom : x;
        }
    } else if (scaleType == 2) {
        float clampedX = max(x, 0.0);
        float num = log(1.0 + clampedX * safeRange);
        float denom = log(1.0 + safeRange);
        return denom != 0.0 ? num / denom : x;
    } else if (scaleType == 3) {
        float safeC = max(c, 0.00001);
        float clampedX = max(x, 0.0);
        float num = log(safeC + clampedX * safeRange) - log(safeC);
        float denom = log(safeC + safeRange) - log(safeC);
        return denom != 0.0 ? num / denom : x;
    } else if (scaleType == 4) {
        return sign(x) * sqrt(abs(x));
    } else if (scaleType == 5) {
        float clampedX = max(x, 0.0);
        float expR = min(safeRange, 10.0);
        float num = exp(clampedX * expR) - 1.0;
        float denom = exp(expR) - 1.0;
        return denom != 0.0 ? num / denom : x;
    }
    return x;
}
