export const glslValidator = (source: string, type='fragment') => {
    const canvas = document.createElement("canvas");
	const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");

	if (!gl) {
		return { ok: false, log: "WebGL not supported" };
	}

	const shaderType =
		type === "fragment" ? gl.FRAGMENT_SHADER : gl.VERTEX_SHADER;

	const shader = gl.createShader(shaderType);
	if (!shader) return {ok: false, log:null}
	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	const ok = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
	const log = gl.getShaderInfoLog(shader);

	gl.deleteShader(shader);

	return { ok, log };
}