import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const SpiralTunnel = () => {
  const containerRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const spiralRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  const [depth, setDepth] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;

    /* ---------- SCENE ---------- */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    /* ---------- CAMERA ---------- */
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth /
        containerRef.current.clientHeight,
      0.1,
      2000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    /* ---------- RENDERER ---------- */
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    /* ---------- DATA ---------- */
    const monthNames = [
      'January', 'February', 'March', 'April',
      'May', 'June', 'July', 'August',
      'September', 'October', 'November', 'December'
    ];

    const monthColors = [
      0xff6b6b, 0xff8e53, 0xffc93c, 0x95e1d3,
      0x38e54d, 0x45b7d1, 0x4a90e2, 0x7b68ee,
      0xc77dff, 0xff69b4, 0xff1493, 0xdc143c
    ];

    /* ---------- SPIRAL CURVE (ALIGNED JANUARIES) ---------- */
    const points = [];
    const startYear = 2000;
    const endYear = 2222;
    const years = endYear - startYear + 1;
    const totalMonths = years * 12;
    const segments = 3000;

    const turnsPerYear = 1; // one full rotation per year

    for (let i = 0; i <= segments; i++) {
      const t = i / segments; // 0 → 1

      // Reverse t for inside = 2000, outside = 2222
      const tRev = 1 - t;

      const totalTurns = turnsPerYear * years * tRev;
      const angle = totalTurns * Math.PI * 2;

      const radius = 3.5 * Math.pow(tRev, 2.3); // shrinking inward
      const z = -t * 180; // depth along z

      points.push(
        new THREE.Vector3(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          z
        )
      );
    }

    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');

    /* ---------- TUBE GEOMETRY ---------- */
    const tubeSegments = segments;
    const tubeRadius = 0.18;
    const radialSegments = 8;

    const geometry = new THREE.TubeGeometry(
      curve,
      tubeSegments,
      tubeRadius,
      radialSegments,
      false
    );

    /* ---------- MATERIAL GROUPS (MONTHS) ---------- */
    geometry.clearGroups();

    const facesPerSegment = radialSegments * 6;
    const segmentsPerMonth = Math.floor(tubeSegments / totalMonths);

    const materials = [];

    for (let m = 0; m < totalMonths; m++) {
      const start = m * segmentsPerMonth * facesPerSegment;
      const count = segmentsPerMonth * facesPerSegment;

      geometry.addGroup(start, count, m);

      const monthIndex = m % 12;
      const year = startYear + Math.floor(m / 12);

      const mat = new THREE.MeshBasicMaterial({
        color: monthColors[monthIndex],
        side: THREE.DoubleSide
      });

      mat.userData = { year, monthName: monthNames[monthIndex] };
      materials.push(mat);
    }

    const spiral = new THREE.Mesh(geometry, materials);
    spiralRef.current = spiral;
    scene.add(spiral);

    /* ---------- WIREFRAME ---------- */
    const wireframe = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.25
      })
    );
    scene.add(wireframe);

    /* ---------- LIGHT ---------- */
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    /* ---------- SCROLL NAVIGATION ---------- */
    const handleScroll = (e) => {
      e.preventDefault();
      setDepth(d => Math.max(-50, Math.min(230, d + e.deltaY * 0.05)));
    };
    window.addEventListener('wheel', handleScroll, { passive: false });

    /* ---------- CLICK ---------- */
    const handleClick = (e) => {
      const rect = containerRef.current.getBoundingClientRect();

      mouseRef.current.x =
        ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y =
        -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      const hits = raycasterRef.current.intersectObject(spiral);

      if (hits.length > 0) {
        const hit = hits[0];
        const matIndex = hit.face.materialIndex;
        const mat = spiral.material[matIndex];

        if (mat?.userData) {
          setSelectedDate(mat.userData);
        }
      }
    };
    containerRef.current.addEventListener('click', handleClick);

    /* ---------- ANIMATE ---------- */
    const animate = () => {
      requestAnimationFrame(animate);

      spiral.rotation.z += 0.001;
      wireframe.rotation.z += 0.001;

      camera.position.z = 5 - depth; // scroll effect

      renderer.render(scene, camera);
    };
    animate();

    /* ---------- RESIZE ---------- */
    const handleResize = () => {
      camera.aspect =
        containerRef.current.clientWidth /
        containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(
        containerRef.current.clientWidth,
        containerRef.current.clientHeight
      );
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('wheel', handleScroll);
      containerRef.current.removeEventListener('click', handleClick);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="w-full h-screen bg-black relative">
      <div ref={containerRef} className="w-full h-full" />

      {selectedDate && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold">
          {selectedDate.monthName} {selectedDate.year}
        </div>
      )}
    </div>
  );
};

export default SpiralTunnel;
