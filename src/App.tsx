import "./App.css";
import exifr from "exifr"
import { useEffect, useState, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls, useProgress } from "@react-three/drei";
import {
  EffectComposer,
  DepthOfField,
  Vignette,
} from "@react-three/postprocessing";
import * as THREE from "three";
import ImageUrls from "./firebase/imageUrls";

function Photo({
  url,
  position,
  isSelected,
  cameraPos,
  selectedIndex,
  onClick,
}: {
  url: string;
  position: [number, number, number];
  isSelected: boolean;
  cameraPos: [number, number, number];
  selectedIndex: number | null;
  onClick: () => void;
}) {
  const texture = useLoader(THREE.TextureLoader, url);
  const aspect = texture.image.width / texture.image.height;
  const width = 5;
  const height = width / aspect;
  const borderWidth = 0.25;
  // const [hovered, setHovered] = useState<boolean>(false);
  // const [hoveredObject, setHoveredObject] = useState<THREE.Object3D | null>(
  //   null
  // );
  const ref = useRef<THREE.Group>(null);

  useFrame(() => {
    if (ref.current) {
      const targetPosition = isSelected
        ? new THREE.Vector3(cameraPos[0], cameraPos[1], cameraPos[2] - 10)
        : selectedIndex !== null
          ? new THREE.Vector3(
            // position[0] * 1.5,
            // position[1] * 1.5,
            // position[2]
            (position[0] - cameraPos[0]) * 1.5,
            (position[1] - cameraPos[1]) * 1.5,
            position[2]
          )
          : new THREE.Vector3(...position);
      ref.current.position.lerp(targetPosition, 0.15);
    }
  });

  return (
    <>
      <group
        ref={ref}
        // position={hovered ? [position[0], position[1], position[2] + 1] : position}
        // onPointerOver={() => {
        //   setHovered(true);
        //   setHoveredObject(ref.current);
        // }}
        // onPointerOut={() => {
        //   setHovered(false);
        //   setHoveredObject(null);
        // }}
        onClick={(e) => {
          e.stopPropagation(); // Prevent propagation to Canvas
          onClick();
        }}
      >
        <mesh position-z={-0.05}>
          <planeGeometry args={[width + borderWidth, height + borderWidth]} />
          <meshBasicMaterial color="white" />
        </mesh>
        <mesh>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial map={texture} />
        </mesh>
      </group>
    </>
  );
}

function Scene({
  imageUrls,
  positions,
  selectedIndex,
  setSelectedIndex,
}: {
  imageUrls: string[];
  positions: [number, number, number][];
  selectedIndex: number | null;
  setSelectedIndex: (index: number | null) => void;
}) {
  const { camera } = useThree();

  const handleClick = (index: number) => {
    if (selectedIndex === index)
      setSelectedIndex(null)
    else
      setSelectedIndex(index)
  };

  const handlePointerMissed = () => {
    setSelectedIndex(null);
  };

  return (
    <>
      <OrbitControls
        touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN }}
        enableZoom={true} enablePan={true} enableRotate={false} />
      <group onPointerMissed={handlePointerMissed}>
        {imageUrls.map((url, index) => (
          <Photo
            key={index}
            url={url}
            position={positions[index]}
            isSelected={selectedIndex === index}
            cameraPos={[
              camera.position.x,
              camera.position.y,
              camera.position.z,
            ]}
            onClick={() => handleClick(index)}
            selectedIndex={selectedIndex}
          />
        ))}
      </group>
      <EffectComposer>
        <DepthOfField
          focusDistance={0}
          focalLength={0.05}
          bokehScale={5}
          height={480}
        />
        <Vignette eskil={false} offset={0.05} darkness={0.65} />
      </EffectComposer>
    </>
  );
}

const normalizePosition = (value: number, min: number, max: number, range: number) => {
  if (max === min) {
    return 0; // 最小値と最大値が同じ場合、正規化結果は中心（0）
  }
  return ((value - min) / (max - min)) * range - range / 2;
};

function App() {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [positions, setPositions] = useState<[number, number, number][]>([]);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const { progress } = useProgress()

  useEffect(() => {
    const fetchUrls = async () => {
      const urls = await ImageUrls();
      setImageUrls(urls);
      const range = 65;
      // const newPositions: [number, number, number][] = urls.map((url, index) => [
      //   Math.random() * range - range / 2,
      //   Math.random() * range - range / 2,
      //   -index,
      // )];
      const latitudes: number[] = [];
      const longitudes: number[] = [];

      const metadataList = await Promise.all(
        urls.map(async (url) => {
          try {
            const metadata = await exifr.parse(url);
            return {
              latitude: metadata?.latitude,
              longitude: metadata?.longitude,
            };
          } catch (error) {
            console.error(`Error reading metadata from ${url}:`, error);
            return { latitude: null, longitude: null };
          }
        })
      );

      metadataList.forEach((metadata) => {
        if (metadata.latitude !== null) latitudes.push(metadata.latitude);
        if (metadata.longitude !== null) longitudes.push(metadata.longitude);
      });

      const latMin = Math.min(...latitudes);
      const latMax = Math.max(...latitudes);
      const lonMin = Math.min(...longitudes);
      const lonMax = Math.max(...longitudes);

      const newPositions: [number, number, number][] = metadataList.map((metadata, index) => {
        const latitude =
          metadata.latitude !== null
            ? normalizePosition(metadata.latitude, latMin, latMax, range)
            : Math.random() * range - range / 2;

        const longitude =
          metadata.longitude !== null
            ? normalizePosition(metadata.longitude, lonMin, lonMax, range)
            : Math.random() * range - range / 2;

        return [longitude, latitude, -index * 0.25];
      });
      setPositions(newPositions);
    };
    fetchUrls();
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      setIsLoaded(true);
    }
  }, [progress]);

  return (
    <div className="w-full bg-['#151515']">
      <div className="w-full h-dvh">
        {!isLoaded && (
          <h1 className="fixed top-1/2 left-1/2 z-10 text-2xl font-bold text-white -translate-x-1/2 -translate-y-1/2">
            Loading... {Math.round(progress)}%
          </h1>
        )}
        <Canvas
          camera={{ position: [0, 0, 25], fov: 100 }}
        >
          <color attach="background" args={["#eee"]} />
          <Scene
            imageUrls={imageUrls}
            positions={positions}
            selectedIndex={selectedIndex}
            setSelectedIndex={setSelectedIndex}
          />
        </Canvas>
        <div className="fixed text-white w-fit top-0 left-0 p-6 flex flex-col gap-0 text-sm">
          <h1 className="text-lg font-pacifico">Flow</h1>
          <p className="text-xs">Photo album in 3D space</p>
        </div>
        <div className="fixed text-white w-fit bottom-0 right-0 p-6 flex flex-col gap-0 text-xs">
          <p>Scroll and Drag to discover</p>
          <p>Click to see the details</p>
        </div>
      </div>
    </div>
  );
}

export default App;
