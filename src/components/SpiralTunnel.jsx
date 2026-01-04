import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const START_YEAR = 2000;
const END_YEAR = 2032;

const SpiralTunnel = () => {
  const containerRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const spiralGroupRef = useRef(null);
  const solidMeshesRef = useRef([]);

  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  const [depth, setDepth] = useState(0);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [selectedInfo, setSelectedInfo] = useState(null);

  const targetCameraPos = useRef(null);
  const targetLookAt = useRef(null);
  const initialCameraState = useRef(null);

  const monthColors = [
    0xFF6B6B, 0xFF8E53, 0xFFC93C, 0x95E1D3,
    0x38E54D, 0x45B7D1, 0x4A90E2, 0x7B68EE,
    0xC77DFF, 0xFF69B4, 0xFF1493, 0xDC143C
  ];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();



  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    const camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 2000);

    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);

    cameraRef.current = camera;

    initialCameraState.current = {
      position: camera.position.clone(),
      quaternion: camera.quaternion.clone()
    };


    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const spiralGroup = new THREE.Group();
    scene.add(spiralGroup);
    spiralGroupRef.current = spiralGroup;

    const years = END_YEAR - START_YEAR + 1;
    const segmentsPerYear = 120;
    const segmentsPerMonth = segmentsPerYear / 12;
    const turnsPerYear = 1;
    const tubeRadius = 0.1;
    const radialSegments = 6;
    const zStep = 3 / segmentsPerYear;

    let globalIndex = 0;
    let lastZ = 5;

    for (let y = 0; y < years; y++) {
      for (let m = 0; m < 12; m++) {
        const year = START_YEAR + y;
        const points = [];
        const startIndex = globalIndex;

        for (let i = 0; i <= segmentsPerMonth; i++) {
          const g = startIndex + i;
          const t = g / (segmentsPerYear * years);
          const angle = -t * Math.PI * 2 * turnsPerYear * years;
          const radius = 1 * (1 - t * 0.7);
          lastZ -= zStep;
          points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, lastZ));
        }

        globalIndex += segmentsPerMonth;
        const curve = new THREE.CatmullRomCurve3(points);

        const solid = new THREE.Mesh(
          new THREE.TubeGeometry(curve, segmentsPerMonth * 2, tubeRadius, radialSegments, false),
          new THREE.MeshBasicMaterial({ color: monthColors[m], side: THREE.DoubleSide })
        );
        solid.userData = { year, month: monthNames[m], monthIndex: m };
        spiralGroup.add(solid);
        solidMeshesRef.current.push(solid);

        const wire = new THREE.Mesh(
          new THREE.TubeGeometry(curve, daysInMonth(year, m), tubeRadius * 1.01, radialSegments, false),
          new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.35 })
        );
        spiralGroup.add(wire);
      }
    }

    const today = new Date();
    solidMeshesRef.current.forEach(mesh => {
      if (mesh.userData.year === today.getFullYear() && mesh.userData.monthIndex === today.getMonth()) {
        mesh.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
      }
    });

    scene.add(new THREE.AmbientLight(0xffffff, 1));

    const animate = () => {
      requestAnimationFrame(animate);

      if (targetCameraPos.current) {
        camera.position.lerp(targetCameraPos.current, 0.08);
        camera.lookAt(targetLookAt.current);
      } else {
        camera.position.z = 5 - depth;
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleWheel = e => {
      e.preventDefault();
      targetCameraPos.current = null;
      targetLookAt.current = null;
      setDepth(d => THREE.MathUtils.clamp(d + e.deltaY * 0.01, -200, 200));
    };

    const handleKey = e => {
      if (e.key === 'ArrowUp') setDepth(d => d - 5);
      if (e.key === 'ArrowDown') setDepth(d => d + 5);
    };

    const handleMove = e => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(mouse.current, camera);
      const hits = raycaster.current.intersectObjects(solidMeshesRef.current);
      if (hits.length) {
        setHoverInfo(hits[0].object.userData);
        setHoverPos({ x: e.clientX, y: e.clientY });
      } else setHoverInfo(null);
    };

    const handleClick = e => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(mouse.current, camera);
      const hits = raycaster.current.intersectObjects(solidMeshesRef.current);
      if (hits.length) {
        const obj = hits[0].object;
        setSelectedInfo(obj.userData);
        const box = new THREE.Box3().setFromObject(obj);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3()).length();
        const dir = new THREE.Vector3().subVectors(camera.position, center).normalize();
        targetCameraPos.current = center.clone().add(dir.multiplyScalar(size * 0.8));
        targetLookAt.current = center.clone();
      }
    };

    const el = containerRef.current;
    el.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKey);
    renderer.domElement.addEventListener('mousemove', handleMove);
    renderer.domElement.addEventListener('click', handleClick);

    return () => {
      el.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKey);
      renderer.domElement.removeEventListener('mousemove', handleMove);
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.dispose();
    };
  }, []);

  const resetView = () => {
    setDepth(0);
    setSelectedInfo(null);

    targetCameraPos.current = null;
    targetLookAt.current = null;

    if (!cameraRef.current || !initialCameraState.current) return;

    const camera = cameraRef.current;
    const { position, quaternion } = initialCameraState.current;

    camera.position.copy(position);
    camera.quaternion.copy(quaternion);
  };


  return (
    <div className="w-full h-screen bg-black relative">
      <div ref={containerRef} className="w-full h-full" />

      {hoverInfo && (
        <div className="absolute pointer-events-none bg-black/80 text-white text-xs px-3 py-1 rounded"
          style={{ left: hoverPos.x + 12, top: hoverPos.y + 12 }}>
          {hoverInfo.month} {hoverInfo.year}
        </div>
      )}

      {selectedInfo && (
        <div className="absolute top-4 left-4 bg-black/80 text-white px-4 py-2 rounded">
          Selected: {selectedInfo.month} {selectedInfo.year}
        </div>
      )}

      <button onClick={resetView} className="absolute top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded">
        Reset
      </button>
    </div>
  );
};

export default SpiralTunnel;
