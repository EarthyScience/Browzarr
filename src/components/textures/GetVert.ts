import { flatBlocksVert, sphereVertex, sphereBlocksVert } from "@/components/textures/shaders"

const shaders ={
    flatBlocksVert,
    sphereVertex,
    sphereBlocksVert
}

export const GetVert = (shader:keyof typeof shaders, isFlat: boolean) => {
    const vert = shaders[shader as keyof typeof shaders]
    const prefix = isFlat ? "#define IS_FLAT\n" : "";
    const output = prefix + vert;
  return (
    output
  )
}


