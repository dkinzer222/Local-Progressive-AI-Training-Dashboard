// Advanced visualization for AI memory patterns
let scene, camera, renderer, graph;
let patterns = new Map();
let connections = [];
let animationFrame;

function initAdvancedViz() {
    // Set up Three.js scene
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / 2 / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth / 2, window.innerHeight / 2);
    document.getElementById('advancedViz').appendChild(renderer.domElement);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040);
    const directionalLight = new THREE.DirectionalLight(0x00ff00, 1);
    scene.add(ambientLight);
    scene.add(directionalLight);
    
    // Initialize force-directed graph
    graph = new THREE.Group();
    scene.add(graph);
    
    // Position camera
    camera.position.z = 5;
    
    // Start animation
    animate();
}

function updatePatternGraph(patterns) {
    // Clear existing nodes
    while(graph.children.length > 0) {
        graph.remove(graph.children[0]);
    }
    connections = [];
    
    // Create nodes for each pattern
    const geometry = new THREE.SphereGeometry(0.1, 32, 32);
    const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    
    let i = 0;
    patterns.forEach((confidence, pattern) => {
        const node = new THREE.Mesh(geometry, material);
        const angle = (i / patterns.size) * Math.PI * 2;
        const radius = 2;
        
        node.position.x = Math.cos(angle) * radius;
        node.position.y = Math.sin(angle) * radius;
        node.scale.setScalar(confidence);
        
        node.userData = { pattern, confidence };
        graph.add(node);
        
        // Create connections between related patterns
        for(let j = 0; j < i; j++) {
            if(Math.random() > 0.7) { // Random connections for demo
                const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                    node.position,
                    graph.children[j].position
                ]);
                const lineMaterial = new THREE.LineBasicMaterial({ 
                    color: 0x00ff00,
                    transparent: true,
                    opacity: 0.3
                });
                const line = new THREE.Line(lineGeometry, lineMaterial);
                connections.push(line);
                graph.add(line);
            }
        }
        i++;
    });
}

function animate() {
    animationFrame = requestAnimationFrame(animate);
    
    // Rotate graph
    graph.rotation.y += 0.001;
    
    // Update connections
    connections.forEach(line => {
        line.geometry.verticesNeedUpdate = true;
    });
    
    renderer.render(scene, camera);
}

function cleanupViz() {
    if(animationFrame) {
        cancelAnimationFrame(animationFrame);
    }
    if(renderer) {
        renderer.dispose();
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    if(camera && renderer) {
        camera.aspect = window.innerWidth / 2 / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth / 2, window.innerHeight / 2);
    }
});
