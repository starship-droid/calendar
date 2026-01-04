import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const SpiralTunnel = () => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const spiralGroupRef = useRef(null);
  const [depth, setDepth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      2000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Month colors - vibrant and distinct
    const monthColors = [
      0xFF6B6B, // Jan - Red
      0xFF8E53, // Feb - Orange
      0xFFC93C, // Mar - Yellow
      0x95E1D3, // Apr - Mint
      0x38E54D, // May - Green
      0x45B7D1, // Jun - Cyan
      0x4A90E2, // Jul - Blue
      0x7B68EE, // Aug - Purple
      0xC77DFF, // Sep - Violet
      0xFF69B4, // Oct - Pink
      0xFF1493, // Nov - Deep Pink
      0xDC143C, // Dec - Crimson
    ];

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Create spiral group that we can keep adding to
    const spiralGroup = new THREE.Group();
    scene.add(spiralGroup);
    spiralGroupRef.current = spiralGroup;

    // Create spiral segments
    const createSpiralSegments = (startYear, numYears, startZ) => {
      const segmentsPerYear = 120; // Segments per full rotation (year)
      const segmentsPerMonth = segmentsPerYear / 12; // 10 segments per month
      const totalSegments = segmentsPerYear * numYears;
      const turnsPerYear = 1;
      const width = 0.15; // Much thinner tube
      
      for (let year = 0; year < numYears; year++) {
        for (let month = 0; month < 12; month++) {
          const points = [];
          const startSeg = year * segmentsPerYear + month * segmentsPerMonth;
          const endSeg = startSeg + segmentsPerMonth + 1; // +1 for overlap
          
          for (let i = startSeg; i <= endSeg; i++) {
            const t = i / segmentsPerYear; // Progress through this year
            const globalT = (year + t) / numYears; // Progress through all years
            const angle = t * Math.PI * 2 * turnsPerYear;
            const radius = 3 * (1 - globalT * 0.7);
            const z = startZ - (year + t) * 8;
            
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            points.push(new THREE.Vector3(x, y, z));
          }

          const curve = new THREE.CatmullRomCurve3(points);
          const tubeGeometry = new THREE.TubeGeometry(curve, segmentsPerMonth, width, 4, false);
          
          const material = new THREE.MeshBasicMaterial({
            color: monthColors[month],
            side: THREE.DoubleSide
          });

          const segment = new THREE.Mesh(tubeGeometry, material);
          segment.userData = { 
            year: startYear + year, 
            month: monthNames[month],
            startZ: startZ - year * 8
          };
          spiralGroup.add(segment);

          // Add wireframe
          const wireframeGeometry = new THREE.TubeGeometry(curve, segmentsPerMonth, width * 1.02, 4, false);
          const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            wireframe: true,
            transparent: true,
            opacity: 0.4
          });
          const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
          spiralGroup.add(wireframe);
        }
      }
    };

    // Initial creation - create spirals in both directions
    const currentYear = 2025;
    createSpiralSegments(currentYear - 50, 100, 5); // Create 100 years worth

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
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

    // Handle scroll/wheel for navigation
    const handleWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY * 0.01;
      setDepth(prev => prev + delta);
    };
    
    containerRef.current.addEventListener('wheel', handleWheel, { passive: false });

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
        containerRef.current.removeEventListener('wheel', handleWheel);
        if (renderer.domElement) {
          containerRef.current.removeChild(renderer.domElement);
        }
      }
      renderer.dispose();
    };
  }, []);

  // Update camera position based on depth
  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.position.z = 5 - depth;
      
      // Calculate current year based on depth
      const yearOffset = Math.floor(depth / 8);
      const currentYear = 2025 - yearOffset;
      
      // Find closest month segment
      if (spiralGroupRef.current) {
        let closestSegment = null;
        let closestDistance = Infinity;
        
        spiralGroupRef.current.children.forEach(child => {
          if (child.userData.year) {
            const distance = Math.abs(child.userData.startZ - cameraRef.current.position.z);
            if (distance < closestDistance) {
              closestDistance = distance;
              closestSegment = child;
            }
          }
        });
      }
    }
  }, [depth]);

  const handleDepthChange = (delta) => {
    setDepth(prev => prev + delta);
  };

  const currentYearOffset = Math.floor(depth / 8);
  const currentYear = 2025 - currentYearOffset;

  return (
    <div className="w-full h-screen flex flex-col bg-black">
      <div ref={containerRef} className="flex-1" />
      
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4 items-center">
        <button
          onClick={() => handleDepthChange(-2)}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold shadow-lg transition-colors"
        >
          ← Future
        </button>
        
        <div className="px-6 py-3 bg-gray-800 text-white rounded-lg font-mono">
          Year: {currentYear}
        </div>
        
        <button
          onClick={() => handleDepthChange(2)}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold shadow-lg"
        >
          Past →
        </button>
      </div>

      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-white text-center bg-black bg-opacity-50 px-6 py-4 rounded-lg">
        <h1 className="text-2xl font-bold mb-2">Spiral Calendar</h1>
        <p className="text-sm text-gray-300">Each rotation = 1 year | Each color = 1 month</p>
        <p className="text-xs text-gray-400 mt-1">Scroll to navigate through time</p>
      </div>

      <div className="absolute top-8 right-8 bg-black bg-opacity-50 px-4 py-3 rounded-lg text-white text-xs">
        <div className="font-bold mb-2">Month Colors:</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, i) => (
            <div key={month} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: `#${[0xFF6B6B, 0xFF8E53, 0xFFC93C, 0x95E1D3, 0x38E54D, 0x45B7D1, 0x4A90E2, 0x7B68EE, 0xC77DFF, 0xFF69B4, 0xFF1493, 0xDC143C][i].toString(16).padStart(6, '0')}` }}
              />
              <span>{month}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SpiralTunnel;