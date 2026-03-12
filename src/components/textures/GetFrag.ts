import { sphereFrag, flatFrag } from "./shaders"

const shaders ={
  sphereFrag,
  flatFrag
}

export const GetFrag = (shader:keyof typeof shaders, isFlat: boolean) => {
    const frag = shaders[shader]
    const prefix = isFlat ? "#define IS_FLAT\n" : "";
    const output = prefix + frag;
  return (
    output
  )
}