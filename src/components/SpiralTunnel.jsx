import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const SpiralTunnel = () => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const spiralRef = useRef(null);
  const [depth, setDepth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create spiral geometry
    const createSpiral = () => {
      const points = [];
      const segments = 500;
      const turns = 15;
      const width = 0.8;
      
      for (let i = 0; i < segments; i++) {
        const t = i / segments;
        const angle = t * Math.PI * 2 * turns;
        const radius = 3 * (1 - t * 0.85);
        const z = -t * 50 + 5;
        
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        points.push(new THREE.Vector3(x, y, z));
      }

      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeometry = new THREE.TubeGeometry(curve, segments, width, 8, false);
      
      // Create gradient material
      const material = new THREE.MeshBasicMaterial({
        color: 0x4a90e2,
        wireframe: false,
        side: THREE.DoubleSide
      });

      const spiral = new THREE.Mesh(tubeGeometry, material);
      scene.add(spiral);
      spiralRef.current = spiral;

      // Add wireframe overlay
      const wireframeGeometry = new THREE.TubeGeometry(curve, segments, width * 1.01, 8, false);
      const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.3
      });
      const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
      scene.add(wireframe);
      spiralRef.current.wireframe = wireframe;
    };

    createSpiral();

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      if (spiralRef.current) {
        spiralRef.current.rotation.z += 0.002;
        if (spiralRef.current.wireframe) {
          spiralRef.current.wireframe.rotation.z += 0.002;
        }
      }
      
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update camera position based on depth
  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.position.z = 5 - depth;
    }
  }, [depth]);

  const handleDepthChange = (delta) => {
    setDepth(prev => Math.max(-40, Math.min(10, prev + delta)));
  };

  return (
    <div className="w-full h-screen flex flex-col bg-black">
      <div ref={containerRef} className="flex-1" />
      
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4 items-center">
        <button
          onClick={() => handleDepthChange(-2)}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold shadow-lg transition-colors"
        >
          ← Go Out
        </button>
        
        <div className="px-4 py-2 bg-gray-800 text-white rounded-lg font-mono">
          Depth: {depth.toFixed(1)}
        </div>
        
        <button
          onClick={() => handleDepthChange(2)}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold shadow-lg transition-colors"
        >
          Go In →
        </button>
      </div>

      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-white text-center">
        <h1 className="text-2xl font-bold mb-2">3D Spiral Tunnel</h1>
        <p className="text-sm text-gray-300">Navigate through the infinite spiral</p>
      </div>
    </div>
  );
};

export default SpiralTunnel;