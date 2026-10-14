import { useMemo, useEffect, Children, JSX } from 'react';
import * as THREE from 'three/webgpu';

type Props = {
  children: React.ReactNode;
  fontSize?: number;           // world units (same meaning as drei's fontSize)
  color?: string;
  anchorX?: 'left' | 'center' | 'right';
  anchorY?: 'top' | 'middle' | 'bottom';
  font?: string;               // CSS font-family
  resolution?: number;         // canvas px per em; raise for crisper text
} & Omit<JSX.IntrinsicElements['group'], 'children'>;

const UNIT_PLANE = new THREE.PlaneGeometry(1, 1);

export function CanvasText({
  children, fontSize = 0.1, color = '#fff',
  anchorX = 'center', anchorY = 'middle',
  font = 'sans-serif', resolution = 128,
  ...meshProps
}: Props) {
    const content = children as string ?? Children.toArray(children).join('') as string;
    const { texture, width, height } = useMemo(() => {
        const pad = resolution * 0.1;
        const ctx = document.createElement('canvas').getContext('2d')!;
        ctx.font = `${resolution}px ${font}`;
        const textW = ctx.measureText(content).width;
        const canvas = ctx.canvas;
        canvas.width = Math.ceil(textW + pad * 2);
        canvas.height = Math.ceil(resolution * 1.4);

        // resizing resets context state, so set it again
        ctx.font = `${resolution}px ${font}`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(content, canvas.width / 2, canvas.height / 2);

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;

        const s = fontSize / resolution; // px -> world units
        return { texture: tex, width: canvas.width * s, height: canvas.height * s };
    }, [children, color, fontSize, font, resolution]);

  const offsetX = anchorX === 'left' ? width / 2 : anchorX === 'right' ? -width / 2 : 0;
  const offsetY = anchorY === 'top' ? -height / 2 : anchorY === 'bottom' ? height / 2 : 0;

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <group {...meshProps} >
      <mesh  geometry={UNIT_PLANE} position={[offsetX, offsetY, 0]}
        scale={[width, height, 1]}>
      <meshBasicMaterial
        map={texture}
        transparent
        depthTest={true}
        depthWrite={false}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </mesh>
    </group>
    
  );
}