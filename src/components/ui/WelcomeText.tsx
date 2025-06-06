import * as THREE from 'three'
import { useRef, useState, useMemo, useEffect, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import { Environment, OrbitControls } from '@react-three/drei'

import MetadataText from '@/components/zarr/MetadataText'
import { ZarrMetadata } from "@/components/zarr/Interfaces";

function Word({
  position,
  text,
  textColor,
  isActive,
  isDimmed,
  isHovered,
  setHoveredWord,
  onClick,
}: {
  position: [number, number, number],
  text: string | ZarrMetadata,
  textColor: string,
  isActive: boolean,
  isDimmed: boolean,
  isHovered: boolean,
  setHoveredWord: (w: string | ZarrMetadata | null) => void,
  onClick: (e: any) => void
}) {
  const color = new THREE.Color()
  const fontProps = { fontSize: 2.25, letterSpacing: 0.015, lineHeight: 1 }
  const ref = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (ref.current) {
      const material = ref.current.material as THREE.MeshBasicMaterial
      if (material?.color) {
        const baseColor = isHovered ? 'orange' : textColor
        material.color.lerp(color.set(baseColor), 0.5)
        material.opacity = isDimmed ? 0.65 : 1
        material.transparent = true
      }
    }
  })

  return (
    <Billboard position={position}>
      {!isActive && (
        <Text
          ref={ref}
          onPointerOver={() => setHoveredWord(text)}
          onPointerOut={() => setHoveredWord(null)}
          onClick={onClick}
          {...fontProps}
        >
          {typeof text === 'string' ? text : text.name}
        </Text>
      )}

      {isActive && typeof text !== 'string' && (
        <group
          scale={[6, 6, 6]}
          position={[-8, 3, 3]}
          rotation={[-0.0, -0.0, 0.0]}
        >
          <MetadataText
            metadata={text}
          />
        </group>
      )}
    </Billboard>
  )
}



function Cloud({ 
  variables, 
  radius = 20,
  textColor,
}: { 
  variables: string[] | ZarrMetadata[]; 
  radius?: number;
  textColor: string;
}) {
  const [hoveredWord, setHoveredWord] = useState<string | ZarrMetadata | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | ZarrMetadata | null>(null);


  const words = useMemo(() => {
    const temp: [THREE.Vector3, string | ZarrMetadata][] = []
    const spherical = new THREE.Spherical()
    const count = variables.length
    const phiSpan = Math.PI / (count + 1)
    const thetaSpan = (Math.PI * 2) / count

    for (let i = 1; i <= count; i++) {
      const word = variables[i - 1] || `Word${i}`
      const position = new THREE.Vector3().setFromSpherical(
        spherical.set(radius, phiSpan * i, thetaSpan * 0)
      )
      temp.push([position, word])
    }

    return temp
  }, [variables, radius])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Dismiss metadata unless we clicked inside a component that stopped propagation
      e.stopPropagation();
      // setSelectedWord(null)
    }
    window.addEventListener('pointerdown', handleClick)
    return () => window.removeEventListener('pointerdown', handleClick)
  }, [])

  return (
    <>
      {words.map(([pos, word], index) => (
        <Word
          key={index}
          position={[pos.x, pos.y, pos.z]}
          text={word}
          textColor={textColor}
          isActive={selectedWord === word}
          isDimmed={selectedWord !== null && selectedWord !== word}
          isHovered={hoveredWord === word}
          setHoveredWord={setHoveredWord}
          onClick={(e) => {
            e.stopPropagation()
            setSelectedWord(word)
          }}
        />
      ))}
    </>
  )
}

export default function WelcomeText({ 
  title,
  description,
  variablesPromise, 
  fogColor,
  textColor,
}: {
  title: string;
  description: string;
  variablesPromise: Promise<string[]> | Promise<ZarrMetadata[]>;
  fogColor: string;
  textColor: string;
}) {
  const [variables, setVariables] = useState<string[] | ZarrMetadata[]>([]);

  useEffect(() => {
    variablesPromise.then(setVariables).catch((err) => console.error('Failed to load variables', err));
  }, [variablesPromise]);

  
  function CameraController() {
    const { camera } = useThree();
    const angle = useRef<number>(0)

    useEffect(() => {
      const handleScroll = (event: any) => {
        angle.current -=  event.deltaY * 0.0006; //The scaling value is arbitrary. I think it scrool smooth at this value but we can change
        angle.current = Math.min(angle.current , Math.PI/2) //This is currently because it loops back. May change if we need more than half a circle
        angle.current = Math.max(angle.current , -Math.PI/2)
        camera.position.z = Math.cos(angle.current) * 85
        camera.position.y = Math.sin(angle.current) * 85
        camera.updateProjectionMatrix()
      };

      window.addEventListener("wheel", handleScroll);
      return () => window.removeEventListener("wheel", handleScroll);
    }, [camera]);

    return null;
  }


  return (
    <div className="canvas" >
      <div className="canvas-title">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 85], fov: 90 }} >
        <CameraController/>
        <OrbitControls
          enablePan={false}
          enableRotate={true}
          enableZoom={false}
          minAzimuthAngle={0}
          maxAzimuthAngle={0}
        />
        <fog attach="fog" args={[fogColor, 0, 150]} />
        <ambientLight intensity={2} />
        <Suspense fallback={null}>
          <Cloud 
            variables={variables} 
            radius={50} 
            textColor={textColor}
          />
        </Suspense>
        <Environment preset="sunset" />
      </Canvas>
    </div>
  );
}
