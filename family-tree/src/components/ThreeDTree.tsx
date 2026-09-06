import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  User, 
  Heart, 
  Edit2, 
  UserPlus, 
  HeartHandshake, 
  Trash2, 
  Link as LinkIcon, 
  X, 
  ChevronLeft,
  Sparkles,
  TreePine,
  Flower2,
  Leaf,
  Maximize2,
  MousePointerClick,
  Eye,
  Compass
} from 'lucide-react';
import type { Person, Spouse, TreeActions, FamilyTree, ThemeMode } from '../types/family';

interface ThreeDTreeProps {
  tree: FamilyTree;
  actions: TreeActions;
  onNavigateLink: (treeId: string, personId: string) => void;
  themeMode?: ThemeMode;
}

interface Node3DData {
  id: string;
  name: string;
  title?: string;
  isSpouse: boolean;
  isRoot: boolean;
  isMarried: boolean;
  level: number;
  position: THREE.Vector3;
  mesh?: THREE.Object3D;
  sprite?: THREE.Sprite;
  rawPerson?: Person;
  rawSpouse?: Spouse;
  links?: any[];
  spouseName?: string;
  hasChildren: boolean;
  parentId?: string;
  sectorCenterAngle?: number;
}

// Polar Spatial Layout Entry
interface PolarLayoutNode {
  id: string;
  person: Person;
  spouse?: Spouse;
  isMarried: boolean;
  level: number;
  parentId?: string;
  weight: number;
  startAngle: number;
  endAngle: number;
  centerAngle: number;
  radius: number;
  y: number;
  pos: THREE.Vector3;
}

// Active Botanical Animation Branch Item
interface BranchAnimItem {
  id: string;
  parentId: string;
  group: THREE.Group;
  branchMesh: THREE.Mesh;
  curve: THREE.CubicBezierCurve3;
  tubularSegments: number;
  startR: number;
  endR: number;
  flowerGroup?: THREE.Group;
  petals?: THREE.Mesh[];
  leafGroup?: THREE.Group;
  sprite?: THREE.Sprite;
  targetSpriteScale: { x: number; y: number };
  targetSpriteY: number;
  aspectRatio: number;
  scaleFactor: number;
  startTime: number;
  duration: number;
  isCollapsing?: boolean;
  collapseStartTime?: number;
  isFullyGrown?: boolean;
}

interface ToastNotice {
  id: number;
  text: string;
  type: 'click1' | 'click2' | 'info';
}

// Organic Easing Functions
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(t: number): number {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// Helper: Get all children of a person (direct or from spouses)
function getPersonChildren(p: Person): Array<{ child: Person; spouse?: Spouse; isFromSpouse: boolean }> {
  const result: Array<{ child: Person; spouse?: Spouse; isFromSpouse: boolean }> = [];
  if (p.children && p.children.length > 0) {
    p.children.forEach(c => result.push({ child: c, isFromSpouse: false }));
  }
  if (p.spouses && p.spouses.length > 0) {
    p.spouses.forEach(s => {
      if (s.children && s.children.length > 0) {
        s.children.forEach(c => {
          if (!result.some(r => r.child.id === c.id)) {
            result.push({ child: c, spouse: s, isFromSpouse: true });
          }
        });
      }
    });
  }
  return result;
}

function personHasChildren(p: Person): boolean {
  if (p.children && p.children.length > 0) return true;
  if (p.spouses && p.spouses.some(s => s.children && s.children.length > 0)) return true;
  return false;
}

// Compute subtree leaf weight for proportional sector allocation
function computeSubtreeWeight(person: Person): number {
  const children = getPersonChildren(person);
  if (children.length === 0) return 1;
  let sum = 0;
  for (const { child } of children) {
    sum += computeSubtreeWeight(child);
  }
  return Math.max(1, sum);
}

export const ThreeDTree: React.FC<ThreeDTreeProps> = ({ tree, actions, onNavigateLink, themeMode = 'dark' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<Node3DData | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node3DData | null>(null);
  const [isAutoRotate, setIsAutoRotate] = useState(false);
  const [toast, setToast] = useState<ToastNotice | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Active expanded branches: Set of Person IDs
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => new Set());
  // Solo branch isolation mode
  const [isolatedBranchId, setIsolatedBranchId] = useState<string | null>(null);
  // Current active generation filter: 'root' | 'gen1' | 'gen2' | 'all'
  const [activeGenFilter, setActiveGenFilter] = useState<'root' | 'gen1' | 'gen2' | 'all'>('root');

  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const targetFocusRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 140, 0));
  const targetCameraPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 520, 1650));

  // Non-blocking camera transition
  const isCameraTransitioningRef = useRef<boolean>(false);
  const cameraTransitionStartRef = useRef<number>(0);

  // Double-click tracking
  const lastClickedNodeRef = useRef<{ id: string; time: number } | null>(null);

  // Three.js Core Refs
  const branchesContainerRef = useRef<THREE.Group | null>(null);
  const interactiveObjectsRef = useRef<THREE.Object3D[]>([]);
  const nodeDataMapRef = useRef<Map<string, Node3DData>>(new Map());
  const activeAnimItemsRef = useRef<Map<string, BranchAnimItem>>(new Map());
  const animatedFlowersRef = useRef<THREE.Group[]>([]);
  const rootSpriteRef = useRef<THREE.Sprite | null>(null);
  const layoutMapRef = useRef<Map<string, PolarLayoutNode>>(new Map());

  const isLight = themeMode === 'light';
  const isComfort = themeMode === 'comfort';

  // Helper: show toast notice
  const showToast = useCallback((text: string, type: 'click1' | 'click2' | 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now(), text, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 2800);
  }, []);

  // Smooth camera transition
  const triggerCameraTransition = useCallback((targetFocus: THREE.Vector3, targetCamPos?: THREE.Vector3) => {
    targetFocusRef.current.copy(targetFocus);
    if (targetCamPos) {
      targetCameraPosRef.current.copy(targetCamPos);
    }
    isCameraTransitioningRef.current = true;
    cameraTransitionStartRef.current = performance.now();
  }, []);

  // =========================================================================
  // 1. Polar Reingold-Tilford Non-Overlapping Layout Calculation
  // =========================================================================
  useMemo(() => {
    const layout = new Map<string, PolarLayoutNode>();

    // Gen 0: Root Ancestor
    const rootPos = new THREE.Vector3(0, 45, 0);
    const rootWeight = computeSubtreeWeight(tree.root);
    layout.set(tree.root.id, {
      id: tree.root.id,
      person: tree.root,
      spouse: tree.root.spouses?.[0],
      isMarried: (tree.root.spouses && tree.root.spouses.length > 0) || false,
      level: 0,
      weight: rootWeight,
      startAngle: 0,
      endAngle: Math.PI * 2,
      centerAngle: 0,
      radius: 0,
      y: 45,
      pos: rootPos
    });

    // Recursively partition sectors
    const processChildren = (
      parent: Person,
      parentLevel: number,
      parentSectorStart: number,
      parentSectorEnd: number
    ) => {
      const childrenEntries = getPersonChildren(parent);
      if (childrenEntries.length === 0) return;

      const level = parentLevel + 1;
      const totalWeight = childrenEntries.reduce((sum, c) => sum + computeSubtreeWeight(c.child), 0);
      const sectorSpan = parentSectorEnd - parentSectorStart;

      // Tiered Rings Geometry (Each generation has its own distinct radius and elevated terrace)
      let radius: number;
      let y: number;
      if (level === 1) {
        radius = 420;
        y = 150;
      } else if (level === 2) {
        radius = 820;
        y = 290;
      } else if (level === 3) {
        radius = 1220;
        y = 430;
      } else {
        radius = 1220 + (level - 3) * 380;
        y = 430 + (level - 3) * 140;
      }

      let currentAngle = parentSectorStart;
      childrenEntries.forEach(({ child, spouse }) => {
        const cWeight = computeSubtreeWeight(child);
        const deltaAngle = (cWeight / totalWeight) * sectorSpan;
        const startA = currentAngle;
        const endA = currentAngle + deltaAngle;
        const centerA = startA + deltaAngle / 2;
        currentAngle = endA;

        const isMarried = (child.spouses && child.spouses.length > 0) || Boolean(spouse);
        const childPos = new THREE.Vector3(
          Math.cos(centerA) * radius,
          y,
          Math.sin(centerA) * radius
        );

        layout.set(child.id, {
          id: child.id,
          person: child,
          spouse: spouse || child.spouses?.[0],
          isMarried,
          level,
          parentId: parent.id,
          weight: cWeight,
          startAngle: startA,
          endAngle: endA,
          centerAngle: centerA,
          radius,
          y,
          pos: childPos
        });

        // Recurse for grandchildren
        processChildren(child, level, startA, endA);
      });
    };

    processChildren(tree.root, 0, 0, Math.PI * 2);
    layoutMapRef.current = layout;
  }, [tree]);

  // =========================================================================
  // 2. Ultra-HD Canvas Plaque Generators (Tack-Sharp 4K Cairo Typography)
  // =========================================================================

  const createRootPlaqueTexture = useCallback((name: string, title?: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 440;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 1200, 440);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 32;
    ctx.shadowOffsetY = 14;

    // Royal Pill Plaque
    ctx.beginPath();
    ctx.roundRect(24, 24, 1152, 392, 72);
    const grad = ctx.createLinearGradient(0, 24, 0, 416);
    if (isComfort) {
      grad.addColorStop(0, '#451a03');
      grad.addColorStop(0.5, '#78350f');
      grad.addColorStop(1, '#271003');
    } else {
      grad.addColorStop(0, '#064e3b');
      grad.addColorStop(0.5, '#047857');
      grad.addColorStop(1, '#022c22');
    }
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#fbbf24';
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(40, 40, 1120, 360, 58);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.75)';
    ctx.stroke();

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 52px sans-serif';
    ctx.fillText('👑', 600, 95);

    ctx.font = 'bold 84px "Cairo", "Alexandria", sans-serif';
    ctx.lineWidth = 15;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(name, 600, title ? 195 : 240);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(name, 600, title ? 195 : 240);

    if (title) {
      ctx.font = 'bold 48px "Cairo", sans-serif';
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(title, 600, 315);
      ctx.fillStyle = '#fef08a';
      ctx.fillText(title, 600, 315);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 16;
    return tex;
  }, [isComfort]);

  const createMarriageFlowerPlaqueTexture = useCallback((husbandName: string, wifeName: string, title?: string, hasChildren = false) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 1200, 480);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 32;
    ctx.shadowOffsetY = 14;

    ctx.beginPath();
    ctx.roundRect(24, 24, 1152, 432, 72);
    const grad = ctx.createLinearGradient(0, 24, 1152, 456);
    if (isComfort) {
      grad.addColorStop(0, '#78350f');
      grad.addColorStop(0.5, '#881337');
      grad.addColorStop(1, '#451a03');
    } else if (isLight) {
      grad.addColorStop(0, '#4c0519');
      grad.addColorStop(0.5, '#881337');
      grad.addColorStop(1, '#0f172a');
    } else {
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#4c0519');
      grad.addColorStop(1, '#022c22');
    }
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#fda4af';
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(40, 40, 1120, 400, 60);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
    ctx.stroke();

    // Sprout Indicator in far corner
    if (hasChildren) {
      ctx.beginPath();
      ctx.arc(95, 90, 26, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.45)';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#6ee7b7';
      ctx.stroke();

      ctx.direction = 'ltr';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '26px sans-serif';
      ctx.fillText('🌸', 95, 92);
    }

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Primary Person
    ctx.font = 'bold 76px "Cairo", "Alexandria", sans-serif';
    ctx.lineWidth = 13;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(husbandName, 600, title ? 120 : 155);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(husbandName, 600, title ? 120 : 155);

    // Spouse with Heart
    ctx.font = 'bold 64px "Cairo", "Alexandria", sans-serif';
    const spouseText = `❤️  ${wifeName}`;
    ctx.lineWidth = 11;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(spouseText, 600, title ? 220 : 265);
    ctx.fillStyle = '#fecdd3';
    ctx.fillText(spouseText, 600, title ? 220 : 265);

    if (title) {
      ctx.font = 'bold 42px "Cairo", sans-serif';
      ctx.lineWidth = 7;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(title, 600, 335);
      ctx.fillStyle = '#fef08a';
      ctx.fillText(title, 600, 335);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 16;
    return tex;
  }, [isComfort, isLight]);

  const createLeafPlaqueTexture = useCallback((name: string, title?: string, isChildOfMarriage = false, hasChildren = false) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 380;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 1080, 380);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 12;

    ctx.beginPath();
    ctx.roundRect(24, 24, 1032, 332, 64);
    const grad = ctx.createLinearGradient(0, 24, 0, 356);
    if (isComfort) {
      grad.addColorStop(0, '#2e3818');
      grad.addColorStop(0.5, '#365314');
      grad.addColorStop(1, '#1a2e05');
    } else {
      grad.addColorStop(0, '#064e3b');
      grad.addColorStop(0.5, '#047857');
      grad.addColorStop(1, '#022c22');
    }
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 10;
    ctx.strokeStyle = isChildOfMarriage ? '#6ee7b7' : '#38bdf8';
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(38, 38, 1004, 304, 52);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.stroke();

    if (hasChildren) {
      ctx.beginPath();
      ctx.arc(85, 82, 24, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.45)';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#6ee7b7';
      ctx.stroke();

      ctx.direction = 'ltr';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '24px sans-serif';
      ctx.fillText('🌱', 85, 84);
    }

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 80px "Cairo", "Alexandria", sans-serif';
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(name, 540, title ? 145 : 190);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(name, 540, title ? 145 : 190);

    if (title) {
      ctx.font = 'bold 44px "Cairo", sans-serif';
      ctx.lineWidth = 7;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(title, 540, 265);
      ctx.fillStyle = isChildOfMarriage ? '#a7f3d0' : '#bae6fd';
      ctx.fillText(title, 540, 265);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 16;
    return tex;
  }, [isComfort]);

  // =========================================================================
  // 3. Initialize Persistent Three.js Scene Environment
  // =========================================================================
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    if (isLight) {
      scene.background = new THREE.Color(0xf1f5f9);
      scene.fog = new THREE.FogExp2(0xf1f5f9, 0.00028);
    } else if (isComfort) {
      scene.background = new THREE.Color(0x1f1a16);
      scene.fog = new THREE.FogExp2(0x1f1a16, 0.00032);
    } else {
      scene.background = new THREE.Color(0x0b1120);
      scene.fog = new THREE.FogExp2(0x0b1120, 0.00028);
    }

    const camera = new THREE.PerspectiveCamera(45, width / height, 10, 10000);
    camera.position.set(0, 520, 1650);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isLight ? 1.05 : 1.22;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxDistance = 5500;
    controls.minDistance = 220;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controls.target.set(0, 140, 0);
    controlsRef.current = controls;

    controls.addEventListener('start', () => {
      isCameraTransitioningRef.current = false;
    });

    // --- Cinematic Lighting ---
    const ambientLight = new THREE.AmbientLight(
      isLight ? 0xffffff : isComfort ? 0xfef3c7 : 0xe0f2fe, 
      isLight ? 0.95 : 0.82
    );
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.65);
    sunLight.position.set(450, 1300, 750);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 100;
    sunLight.shadow.camera.far = 4000;
    const d = 1600;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.75);
    rimLight.position.set(-600, 600, -800);
    scene.add(rimLight);

    const coreGlow = new THREE.PointLight(0xfbbf24, 1.4, 1800);
    coreGlow.position.set(0, 140, 0);
    scene.add(coreGlow);

    // --- Ground Island ---
    const islandGeo = new THREE.CylinderGeometry(1500, 1650, 65, 64);
    const islandMat = new THREE.MeshStandardMaterial({
      color: isComfort ? 0x27272a : isLight ? 0xdcfce7 : 0x14532d,
      roughness: 0.85,
      metalness: 0.08
    });
    const island = new THREE.Mesh(islandGeo, islandMat);
    island.position.y = -105;
    island.receiveShadow = true;
    scene.add(island);

    // --- Subtle Generational Rings on the Ground ---
    const ringRadii = [420, 820, 1220];
    ringRadii.forEach((r, idx) => {
      const ringGeo = new THREE.RingGeometry(r - 4, r + 4, 128);
      const ringMat = new THREE.MeshBasicMaterial({
        color: idx === 0 ? 0x10b981 : idx === 1 ? 0xfbbf24 : 0x38bdf8,
        transparent: true,
        opacity: isLight ? 0.35 : 0.22,
        side: THREE.DoubleSide
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = -71;
      scene.add(ringMesh);
    });

    // --- Fireflies Floating System ---
    const fireflyCount = 90;
    const fireflyGeo = new THREE.BufferGeometry();
    const fireflyPositions = new Float32Array(fireflyCount * 3);
    const fireflySpeeds: number[] = [];

    for (let i = 0; i < fireflyCount; i++) {
      const r = 250 + Math.random() * 1150;
      const th = Math.random() * Math.PI * 2;
      fireflyPositions[i * 3] = Math.cos(th) * r;
      fireflyPositions[i * 3 + 1] = -50 + Math.random() * 750;
      fireflyPositions[i * 3 + 2] = Math.sin(th) * r;
      fireflySpeeds.push(0.35 + Math.random() * 0.55);
    }
    fireflyGeo.setAttribute('position', new THREE.BufferAttribute(fireflyPositions, 3));

    const fireflyMat = new THREE.PointsMaterial({
      color: isLight ? 0xeab308 : isComfort ? 0xf59e0b : 0x6ee7b7,
      size: isLight ? 4.8 : 5.8,
      transparent: true,
      opacity: isLight ? 0.7 : 0.9,
      blending: THREE.AdditiveBlending
    });
    const fireflySystem = new THREE.Points(fireflyGeo, fireflyMat);
    scene.add(fireflySystem);

    // --- Trunk & Base Roots ---
    const barkMat = new THREE.MeshStandardMaterial({
      color: isComfort ? 0x451a03 : 0x54361c,
      roughness: 0.82,
      metalness: 0.12
    });

    const trunkGeo = new THREE.CylinderGeometry(36, 68, 230, 24);
    const trunkMesh = new THREE.Mesh(trunkGeo, barkMat);
    trunkMesh.position.set(0, -45, 0);
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    trunkMesh.userData = { id: tree.root.id, isRoot: true };
    scene.add(trunkMesh);
    interactiveObjectsRef.current.push(trunkMesh);

    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const rootEnd = new THREE.Vector3(Math.cos(angle) * 150, -115, Math.sin(angle) * 150);
      const rootStart = new THREE.Vector3(Math.cos(angle) * 46, -70, Math.sin(angle) * 46);
      const rCurve = new THREE.LineCurve3(rootStart, rootEnd);
      const rGeo = new THREE.TubeGeometry(rCurve, 8, 12, 8, false);
      const rMesh = new THREE.Mesh(rGeo, barkMat);
      rMesh.userData = { id: tree.root.id, isRoot: true };
      scene.add(rMesh);
      interactiveObjectsRef.current.push(rMesh);
    }

    // --- Root Plaque ---
    const rootPlaquePos = new THREE.Vector3(0, 48, 88);
    const rootTexture = createRootPlaqueTexture(tree.root.name, tree.root.title || 'رأس العائلة ومؤسسها');
    if (rootTexture) {
      const rootSpriteMat = new THREE.SpriteMaterial({ 
        map: rootTexture, 
        depthTest: false, 
        depthWrite: false 
      });
      const rootSprite = new THREE.Sprite(rootSpriteMat);
      rootSprite.scale.set(260, 95, 1);
      rootSprite.position.copy(rootPlaquePos);
      rootSprite.renderOrder = 20000;
      rootSprite.userData = { id: tree.root.id, isRoot: true, pos: rootPlaquePos };
      scene.add(rootSprite);
      rootSpriteRef.current = rootSprite;
      interactiveObjectsRef.current.push(rootSprite);

      nodeDataMapRef.current.set(tree.root.id, {
        id: tree.root.id,
        name: tree.root.name,
        title: tree.root.title,
        isSpouse: false,
        isRoot: true,
        isMarried: (tree.root.spouses && tree.root.spouses.length > 0) || false,
        level: 0,
        position: rootPlaquePos,
        mesh: trunkMesh,
        sprite: rootSprite,
        rawPerson: tree.root,
        links: tree.root.links || [],
        hasChildren: personHasChildren(tree.root)
      });
    }

    // Container for dynamic branches
    const branchesContainer = new THREE.Group();
    scene.add(branchesContainer);
    branchesContainerRef.current = branchesContainer;

    // --- Pointer & Tap Detection with Double Click Support ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0, time: 0 };
    let hoveredObject: THREE.Object3D | null = null;

    const onPointerDown = (event: PointerEvent) => {
      pointerDownPos = { x: event.clientX, y: event.clientY, time: Date.now() };
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveObjectsRef.current, true);

      if (intersects.length > 0) {
        const obj = intersects[0].object;
        if (hoveredObject !== obj) {
          hoveredObject = obj;
          renderer.domElement.style.cursor = 'pointer';
        }

        let currObj: THREE.Object3D | null = obj;
        let targetId: string | null = null;
        while (currObj) {
          if (currObj.userData?.id) { targetId = currObj.userData.id; break; }
          currObj = currObj.parent;
        }

        if (targetId) {
          const matched = nodeDataMapRef.current.get(targetId);
          setHoveredNode(matched || null);
        }
      } else {
        if (hoveredObject) {
          hoveredObject = null;
        }
        setHoveredNode(null);
        renderer.domElement.style.cursor = 'grab';
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      const dist = Math.hypot(event.clientX - pointerDownPos.x, event.clientY - pointerDownPos.y);
      const elapsed = Date.now() - pointerDownPos.time;

      if (dist < 12 && elapsed < 450) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(interactiveObjectsRef.current, true);

        if (intersects.length > 0) {
          let targetObj: THREE.Object3D | null = intersects[0].object;
          let targetId: string | null = null;
          let targetPos: THREE.Vector3 | undefined = undefined;

          while (targetObj) {
            if (targetObj.userData?.id) {
              targetId = targetObj.userData.id;
              targetPos = targetObj.userData.pos;
              break;
            }
            targetObj = targetObj.parent;
          }

          if (targetId) {
            const matched = nodeDataMapRef.current.get(targetId);
            const now = Date.now();
            const lastClick = lastClickedNodeRef.current;
            const isSecondClick = (lastClick && lastClick.id === targetId && (now - lastClick.time) < 2600);

            if (isSecondClick) {
              lastClickedNodeRef.current = null;
              handleToggleExpand(targetId, targetPos || matched?.position);
            } else {
              lastClickedNodeRef.current = { id: targetId, time: now };
              if (matched) {
                setSelectedNode(matched);
                triggerCameraTransition(matched.position);
              }

              const hasChildren = matched?.hasChildren ?? false;
              if (hasChildren) {
                setExpandedNodeIds(currentExpanded => {
                  const isAlreadyOpen = currentExpanded.has(targetId);
                  if (isAlreadyOpen) {
                    showToast('👆 انقر مرة ثانية لطي هذا الغصن 🌱', 'click1');
                  } else {
                    showToast('👆 انقر مرة ثانية لتفتيح هذا الغصن وإظهار الأبناء 🌸', 'click1');
                  }
                  return currentExpanded;
                });
              } else {
                showToast(`📌 تم تحديد ${matched?.name || 'الفرد'}`, 'info');
              }
            }
          }
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // --- Animation Loop ---
    let animId: number;
    const startTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      const elapsed = (now - startTime) * 0.001;

      if (isCameraTransitioningRef.current) {
        const transElapsed = now - cameraTransitionStartRef.current;
        if (transElapsed > 850) {
          isCameraTransitioningRef.current = false;
        } else {
          controls.target.lerp(targetFocusRef.current, 0.055);
          camera.position.lerp(targetCameraPosRef.current, 0.045);
        }
      }

      // Screen-space calibrated plaque scaling
      const camPos = camera.position;
      const fovRad = (camera.fov * Math.PI) / 180;
      const tanHalfFov = Math.tan(fovRad / 2);
      const vHeight = renderer.domElement.clientHeight || 800;

      const calcPlaqueScale = (pos: THREE.Vector3, aspect: number, sFactor = 1.0) => {
        const dist = camPos.distanceTo(pos);
        const visibleHeightAtDist = 2 * tanHalfFov * dist;
        const worldUnitsPerPixel = visibleHeightAtDist / vHeight;
        const targetPixels = Math.max(54, Math.min(82, 82 - (dist - 800) * 0.006)) * sFactor;
        const h = targetPixels * worldUnitsPerPixel;
        const w = h * aspect;
        return { w, h };
      };

      // Root Plaque: Positioned on the front face of the trunk facing camera
      if (rootSpriteRef.current) {
        const camDistXZ = Math.hypot(camPos.x, camPos.z);
        const nx = camDistXZ > 0.001 ? camPos.x / camDistXZ : 0;
        const nz = camDistXZ > 0.001 ? camPos.z / camDistXZ : 1;
        rootSpriteRef.current.position.set(nx * 92, 45, nz * 92);

        const sz = calcPlaqueScale(rootSpriteRef.current.position, 1200 / 440, 1.05);
        rootSpriteRef.current.scale.set(sz.w, sz.h, 1);
        const dist = camPos.distanceTo(rootSpriteRef.current.position);
        rootSpriteRef.current.renderOrder = 20000 - Math.min(19000, Math.floor(dist));
      }

      // Progressive Branch Growth & Scaling
      activeAnimItemsRef.current.forEach((item, key) => {
        if (item.isCollapsing && item.collapseStartTime) {
          const cProgress = 1 - Math.min(1, (now - item.collapseStartTime) / 300);
          item.group.scale.setScalar(cProgress);
          if (cProgress <= 0.01) {
            branchesContainerRef.current?.remove(item.group);
            activeAnimItemsRef.current.delete(key);
          }
          return;
        }

        const rawT = Math.min(1, Math.max(0, (now - item.startTime) / item.duration));
        const branchProgress = easeOutCubic(rawT);

        // Distance sorted plaque rendering
        if (item.sprite && item.sprite.visible) {
          const sz = calcPlaqueScale(item.sprite.position, item.aspectRatio, item.scaleFactor);
          const dist = camPos.distanceTo(item.sprite.position);
          item.sprite.renderOrder = 20000 - Math.min(19000, Math.floor(dist));

          if (rawT >= 1.0) {
            item.sprite.scale.set(sz.w, sz.h, 1);
            item.sprite.position.y = item.targetSpriteY;
          } else if (rawT >= 0.5) {
            const spriteT = (rawT - 0.5) / 0.5;
            const sScale = easeOutBack(spriteT);
            item.sprite.scale.set(sz.w * sScale, sz.h * sScale, 1);
            item.sprite.position.y = item.targetSpriteY - (1 - easeOutCubic(spriteT)) * 20;
          } else {
            item.sprite.scale.set(0.001, 0.001, 1);
            item.sprite.position.y = item.targetSpriteY - 25;
          }
        }

        // Branch curve geometry vertex extension
        const posAttr = item.branchMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
        if (posAttr && (rawT < 1.0 || !item.isFullyGrown)) {
          const tubularSegs = item.tubularSegments;
          const radialSegs = 8;
          const frames = item.curve.computeFrenetFrames(tubularSegs, false);

          for (let i = 0; i <= tubularSegs; i++) {
            const t = (i / tubularSegs) * branchProgress;
            const p = item.curve.getPoint(t);
            const r = (item.startR + (item.endR - item.startR) * Math.pow(i / tubularSegs, 0.7)) * Math.min(1, branchProgress * 1.5);
            const N = frames.normals[i];
            const B = frames.binormals[i];

            for (let j = 0; j <= radialSegs; j++) {
              const v = (j / radialSegs) * Math.PI * 2;
              const sin = Math.sin(v);
              const cos = -Math.cos(v);
              const nx = cos * N.x + sin * B.x;
              const ny = cos * N.y + sin * B.y;
              const nz = cos * N.z + sin * B.z;

              const idx = i * (radialSegs + 1) + j;
              posAttr.setXYZ(idx, p.x + r * nx, p.y + r * ny, p.z + r * nz);
            }
          }
          posAttr.needsUpdate = true;
          item.branchMesh.geometry.computeVertexNormals();
          if (rawT >= 1.0) {
            item.isFullyGrown = true;
          }
        }

        // Flower Petals Blooming
        if (item.flowerGroup && item.petals) {
          if (rawT < 0.35) {
            item.flowerGroup.scale.set(0.001, 0.001, 0.001);
          } else {
            const flowerT = (rawT - 0.35) / 0.65;
            const flowerScale = easeOutBack(flowerT);
            item.flowerGroup.scale.setScalar(Math.max(0.001, flowerScale));

            const petalOpen = easeOutCubic(flowerT) * 1.05;
            item.petals.forEach(p => {
              p.rotation.x = petalOpen;
            });
          }
        }

        // Leaf Sprouting
        if (item.leafGroup) {
          if (rawT < 0.35) {
            item.leafGroup.scale.set(0.001, 0.001, 0.001);
          } else {
            const leafT = (rawT - 0.35) / 0.65;
            const leafScale = easeOutBack(leafT) * 0.68;
            item.leafGroup.scale.setScalar(Math.max(0.001, leafScale));
          }
        }
      });

      // Fireflies floating
      const posArray = fireflyGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < fireflyCount; i++) {
        posArray[i * 3 + 1] += fireflySpeeds[i];
        posArray[i * 3] += Math.sin(elapsed * 0.6 + i) * 0.35;
        posArray[i * 3 + 2] += Math.cos(elapsed * 0.6 + i) * 0.35;

        if (posArray[i * 3 + 1] > 950) {
          posArray[i * 3 + 1] = -50;
        }
      }
      fireflyGeo.attributes.position.needsUpdate = true;

      // Petal gentle sway
      animatedFlowersRef.current.forEach((flower, fIdx) => {
        flower.rotation.y = Math.sin(elapsed * 0.8 + fIdx) * 0.04;
      });

      if (isAutoRotate) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.75;
      } else {
        controls.autoRotate = false;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.dispose();
    };
  }, [tree, themeMode, isComfort, isLight, createRootPlaqueTexture]);

  // =========================================================================
  // 4. Progressive Sprouting Engine using Pre-Computed Polar Coordinates
  // =========================================================================

  const sproutChildrenForParent = useCallback((parentNode: Person) => {
    const branchesContainer = branchesContainerRef.current;
    if (!branchesContainer) return;

    const parentLayout = layoutMapRef.current.get(parentNode.id);
    const parentPos = parentLayout?.pos || new THREE.Vector3(0, 45, 0);

    const childrenEntries = getPersonChildren(parentNode);
    if (childrenEntries.length === 0) return;

    const childPositions: THREE.Vector3[] = [];

    childrenEntries.forEach(({ child, spouse }, cIdx) => {
      const childLayout = layoutMapRef.current.get(child.id);
      if (!childLayout) return;

      const childPos = childLayout.pos;
      childPositions.push(childPos);

      // Smooth Botanical Bezier Curve connecting parent to child
      const startPos = parentLayout?.level === 0 
        ? new THREE.Vector3(0, 65, 0)
        : parentPos.clone();

      const midLift = Math.max(45, (childPos.y - startPos.y) * 0.5);
      const p1 = new THREE.Vector3(
        startPos.x + (childPos.x - startPos.x) * 0.35,
        startPos.y + midLift,
        startPos.z + (childPos.z - startPos.z) * 0.35
      );
      const p2 = new THREE.Vector3(
        startPos.x + (childPos.x - startPos.x) * 0.75,
        childPos.y - 25,
        startPos.z + (childPos.z - startPos.z) * 0.75
      );

      const curve = new THREE.CubicBezierCurve3(startPos, p1, p2, childPos);
      const tubularSegments = 24;
      const radialSegments = 8;
      const branchThickStart = Math.max(3.2, 7.5 - childLayout.level * 1.3);
      const branchThickEnd = Math.max(2.0, 4.2 - childLayout.level * 0.8);

      const branchGeo = new THREE.TubeGeometry(curve, tubularSegments, branchThickStart, radialSegments, false);
      const barkMat = new THREE.MeshStandardMaterial({
        color: isComfort ? 0x54361c : 0x5c3a21,
        roughness: 0.75,
        metalness: 0.1
      });

      const branchMesh = new THREE.Mesh(branchGeo, barkMat);
      branchMesh.castShadow = true;
      branchMesh.receiveShadow = true;
      branchMesh.frustumCulled = false;
      branchMesh.userData = { id: child.id, isBranch: true, pos: childPos };
      interactiveObjectsRef.current.push(branchMesh);

      const nodeGroup = new THREE.Group();
      nodeGroup.add(branchMesh);

      const isMarried = childLayout.isMarried;
      const hasGrandChildren = personHasChildren(child);
      const scaleFactor = Math.max(0.72, 1.0 - childLayout.level * 0.08);

      let flowerGroup: THREE.Group | undefined;
      let petals: THREE.Mesh[] | undefined;
      let leafGroup: THREE.Group | undefined;
      let sprite: THREE.Sprite | undefined;

      const targetSpriteScale = { 
        x: Math.round((isMarried ? 240 : 216) * scaleFactor), 
        y: Math.round((isMarried ? 96 : 76) * scaleFactor) 
      };
      // Elevated comfortably above flowers and leaves to eliminate all intersection
      const targetSpriteY = childPos.y + (isMarried ? 72 : 62) * scaleFactor;

      if (isMarried) {
        // --- 3D Blooming Flower ---
        flowerGroup = new THREE.Group();
        flowerGroup.position.copy(childPos);
        flowerGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
        flowerGroup.userData = { id: child.id, isFlower: true, pos: childPos };

        const petalShape = new THREE.Shape();
        petalShape.moveTo(0, 0);
        petalShape.bezierCurveTo(10, 16, 20, 38, 14, 56);
        petalShape.bezierCurveTo(8, 68, 0, 78, 0, 78);
        petalShape.bezierCurveTo(0, 78, -8, 68, -14, 56);
        petalShape.bezierCurveTo(-20, 38, -10, 16, 0, 0);

        const petalGeo = new THREE.ExtrudeGeometry(petalShape, {
          depth: 1.4,
          bevelEnabled: true,
          bevelSegments: 2,
          bevelSize: 0.9,
          bevelThickness: 0.9
        });

        const flowerPetalMat = new THREE.MeshStandardMaterial({
          color: isComfort ? 0xf59e0b : 0xf43f5e,
          roughness: 0.42,
          metalness: 0.16,
          side: THREE.DoubleSide,
          emissive: isComfort ? 0xd97706 : 0xf43f5e,
          emissiveIntensity: 0.25
        });

        petals = [];
        for (let p = 0; p < 8; p++) {
          const pMesh = new THREE.Mesh(petalGeo, flowerPetalMat);
          pMesh.rotation.y = (p * Math.PI * 2) / 8;
          pMesh.rotation.x = 0;
          pMesh.scale.set(0.72, 0.72, 0.72);
          pMesh.castShadow = true;
          pMesh.frustumCulled = false;
          pMesh.userData = { id: child.id, isFlower: true, pos: childPos };
          flowerGroup.add(pMesh);
          petals.push(pMesh);
          interactiveObjectsRef.current.push(pMesh);
        }

        const coreGeo = new THREE.SphereGeometry(14, 20, 20);
        const coreMat = new THREE.MeshStandardMaterial({ 
          color: 0xfbbf24, 
          emissive: 0xfbbf24, 
          emissiveIntensity: 0.65, 
          roughness: 0.2 
        });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        coreMesh.position.y = 8;
        coreMesh.frustumCulled = false;
        coreMesh.userData = { id: child.id, isFlower: true, pos: childPos };
        flowerGroup.add(coreMesh);
        interactiveObjectsRef.current.push(coreMesh);

        const stalkGeo = new THREE.CylinderGeometry(1.6, 1.6, 38, 8);
        const stalkMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 });
        const stalkMesh = new THREE.Mesh(stalkGeo, stalkMat);
        stalkMesh.position.set(0, 19, 0);
        stalkMesh.frustumCulled = false;
        flowerGroup.add(stalkMesh);

        nodeGroup.add(flowerGroup);
        animatedFlowersRef.current.push(flowerGroup);

        // 4K Marriage Plaque
        const primarySpouse = spouse || child.spouses![0];
        const flTex = createMarriageFlowerPlaqueTexture(child.name, primarySpouse.name, child.title, hasGrandChildren);
        if (flTex) {
          const sMat = new THREE.SpriteMaterial({ map: flTex, depthTest: false, depthWrite: false });
          sprite = new THREE.Sprite(sMat);
          sprite.scale.set(0.001, 0.001, 1);
          sprite.position.set(childPos.x, targetSpriteY, childPos.z);
          sprite.renderOrder = 20000;
          sprite.userData = { id: child.id, isMarried: true, pos: childPos };
          nodeGroup.add(sprite);
          interactiveObjectsRef.current.push(sprite);
        }

        nodeDataMapRef.current.set(child.id, {
          id: child.id,
          name: child.name,
          title: child.title,
          isSpouse: false,
          isRoot: false,
          isMarried: true,
          spouseName: primarySpouse.name,
          level: childLayout.level,
          position: childPos,
          mesh: flowerGroup,
          sprite,
          rawPerson: child,
          rawSpouse: primarySpouse,
          links: child.links || [],
          hasChildren: hasGrandChildren || false,
          parentId: parentNode.id,
          sectorCenterAngle: childLayout.centerAngle
        });

      } else {
        // --- 3D Natural Tree Leaf ---
        leafGroup = new THREE.Group();
        leafGroup.position.copy(childPos);
        leafGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
        leafGroup.userData = { id: child.id, isLeaf: true, pos: childPos };

        const leafShape = new THREE.Shape();
        leafShape.moveTo(0, 0);
        leafShape.bezierCurveTo(16, 20, 30, 52, 20, 90);
        leafShape.bezierCurveTo(12, 110, 0, 126, 0, 126);
        leafShape.bezierCurveTo(0, 126, -12, 110, -20, 90);
        leafShape.bezierCurveTo(-30, 52, -16, 20, 0, 0);

        const leafGeo = new THREE.ExtrudeGeometry(leafShape, {
          depth: 1.4,
          bevelEnabled: true,
          bevelSegments: 2,
          bevelSize: 0.85,
          bevelThickness: 0.85
        });

        const leafMat = new THREE.MeshStandardMaterial({
          color: isComfort ? 0x4d7c0f : 0x10b981,
          roughness: 0.48,
          metalness: 0.12,
          side: THREE.DoubleSide
        });

        const leafMesh = new THREE.Mesh(leafGeo, leafMat);
        leafMesh.rotation.x = 0.55;
        leafMesh.scale.set(0.68, 0.68, 0.68);
        leafMesh.castShadow = true;
        leafMesh.frustumCulled = false;
        leafMesh.userData = { id: child.id, isLeaf: true, pos: childPos };
        leafGroup.add(leafMesh);
        interactiveObjectsRef.current.push(leafMesh);

        const stemGeo = new THREE.CylinderGeometry(1.6, 2.8, 55, 8);
        const stemMesh = new THREE.Mesh(stemGeo, barkMat);
        stemMesh.position.set(0, 18, 1.2);
        stemMesh.rotation.x = 0.55;
        stemMesh.frustumCulled = false;
        stemMesh.userData = { id: child.id, isLeaf: true, pos: childPos };
        leafGroup.add(stemMesh);
        interactiveObjectsRef.current.push(stemMesh);

        nodeGroup.add(leafGroup);

        // 4K Single Child Plaque
        const lfTex = createLeafPlaqueTexture(child.name, child.title, false, hasGrandChildren);
        if (lfTex) {
          const sMat = new THREE.SpriteMaterial({ map: lfTex, depthTest: false, depthWrite: false });
          sprite = new THREE.Sprite(sMat);
          sprite.scale.set(0.001, 0.001, 1);
          sprite.position.set(childPos.x, targetSpriteY, childPos.z);
          sprite.renderOrder = 20000;
          sprite.userData = { id: child.id, isMarried: false, pos: childPos };
          nodeGroup.add(sprite);
          interactiveObjectsRef.current.push(sprite);
        }

        nodeDataMapRef.current.set(child.id, {
          id: child.id,
          name: child.name,
          title: child.title,
          isSpouse: false,
          isRoot: false,
          isMarried: false,
          level: childLayout.level,
          position: childPos,
          mesh: leafGroup,
          sprite,
          rawPerson: child,
          links: child.links || [],
          hasChildren: hasGrandChildren || false,
          parentId: parentNode.id,
          sectorCenterAngle: childLayout.centerAngle
        });
      }

      nodeGroup.traverse(c => {
        if ((c as any).isMesh) {
          (c as any).frustumCulled = false;
        }
      });

      branchesContainer.add(nodeGroup);

      // Register branch for animation
      activeAnimItemsRef.current.set(child.id, {
        id: child.id,
        parentId: parentNode.id,
        group: nodeGroup,
        branchMesh,
        curve,
        tubularSegments,
        startR: branchThickStart,
        endR: branchThickEnd,
        flowerGroup,
        petals,
        leafGroup,
        sprite,
        targetSpriteScale,
        targetSpriteY,
        aspectRatio: isMarried ? (1200 / 480) : (1080 / 380),
        scaleFactor,
        startTime: performance.now() + cIdx * 50,
        duration: 750
      });
    });

    // Auto-reframe camera gracefully to encompass new branches
    if (childPositions.length > 0) {
      const avg = new THREE.Vector3();
      childPositions.forEach(p => avg.add(p));
      avg.divideScalar(childPositions.length);

      const framingTarget = new THREE.Vector3().addVectors(parentPos, avg).multiplyScalar(0.5);
      const span = parentPos.distanceTo(avg);
      const camDist = Math.max(1200, span * 1.6 + 650);
      const camAngle = Math.atan2(framingTarget.x, framingTarget.z);
      const targetCamPos = new THREE.Vector3(
        Math.sin(camAngle) * camDist,
        Math.max(340, framingTarget.y + 260),
        Math.cos(camAngle) * camDist
      );

      triggerCameraTransition(framingTarget, targetCamPos);
    }
  }, [isComfort, createMarriageFlowerPlaqueTexture, createLeafPlaqueTexture, triggerCameraTransition]);

  // Collapse children recursively
  const collapseBranch = useCallback((nodeId: string): string[] => {
    const toRemove: string[] = [];
    const findChildren = (id: string) => {
      activeAnimItemsRef.current.forEach(item => {
        if (item.parentId === id) {
          toRemove.push(item.id);
          findChildren(item.id);
        }
      });
    };
    findChildren(nodeId);

    const now = performance.now();
    toRemove.forEach(id => {
      const item = activeAnimItemsRef.current.get(id);
      if (item) {
        item.isCollapsing = true;
        item.collapseStartTime = now;
      }
    });

    interactiveObjectsRef.current = interactiveObjectsRef.current.filter(obj => {
      const targetId = obj.userData?.id;
      return !toRemove.includes(targetId);
    });

    return toRemove;
  }, []);

  // Toggle expand on node
  const handleToggleExpand = useCallback((nodeId: string, pos?: THREE.Vector3) => {
    let found: Person | undefined;
    if (nodeId === tree.root.id) {
      found = tree.root;
    } else {
      const findPerson = (p: Person): Person | null => {
        if (p.id === nodeId) return p;
        if (p.spouses) {
          for (const s of p.spouses) {
            for (const c of s.children || []) {
              const res = findPerson(c);
              if (res) return res;
            }
          }
        }
        for (const c of p.children || []) {
          const res = findPerson(c);
          if (res) return res;
        }
        return null;
      };
      found = findPerson(tree.root) || undefined;
    }

    if (!found) return;

    const childList = getPersonChildren(found);
    if (childList.length === 0) {
      showToast('📌 نهاية هذا الفرع (لا يوجد أبناء مسجلين) 🍃', 'info');
      return;
    }

    setExpandedNodeIds(prev => {
      const next = new Set(prev);
      const isExpanding = !next.has(nodeId);

      if (isExpanding) {
        next.add(nodeId);
        showToast('🌸 تم تفتيح هذا الغصن بنجاح!', 'click2');
        sproutChildrenForParent(found!);
      } else {
        next.delete(nodeId);
        const removedIds = collapseBranch(nodeId);
        removedIds.forEach(id => next.delete(id));
        showToast('🌱 تم طي الغصن بنجاح', 'click2');
        if (pos) {
          triggerCameraTransition(pos);
        }
      }
      return next;
    });
  }, [tree.root, sproutChildrenForParent, collapseBranch, showToast, triggerCameraTransition]);

  // Expand all branches cleanly
  const handleExpandAll = useCallback(() => {
    const all = new Set<string>();
    const expandNode = (p: Person) => {
      all.add(p.id);
      sproutChildrenForParent(p);
      const children = getPersonChildren(p);
      children.forEach(({ child }) => expandNode(child));
    };

    expandNode(tree.root);
    setExpandedNodeIds(all);
    setActiveGenFilter('all');
    showToast('✨ تم تفتيح كامل شجرة العائلة بالمدرجات الملكية!', 'click2');
    triggerCameraTransition(new THREE.Vector3(0, 240, 0), new THREE.Vector3(0, 850, 2100));
  }, [tree.root, sproutChildrenForParent, showToast, triggerCameraTransition]);

  // Collapse back to trunk
  const handleCollapseAll = useCallback(() => {
    collapseBranch(tree.root.id);
    setExpandedNodeIds(new Set());
    setActiveGenFilter('root');
    showToast('🌱 تم طي الشجرة إلى الجذع', 'click2');
    triggerCameraTransition(new THREE.Vector3(0, 120, 0), new THREE.Vector3(0, 380, 1350));
    setSelectedNode(null);
    setIsolatedBranchId(null);
  }, [tree.root.id, collapseBranch, showToast, triggerCameraTransition]);

  // Generation Filter: 'gen1' or 'gen2'
  const handleFilterGeneration = useCallback((gen: 'root' | 'gen1' | 'gen2' | 'all') => {
    setActiveGenFilter(gen);
    if (gen === 'root') {
      handleCollapseAll();
      return;
    }

    if (gen === 'gen1') {
      collapseBranch(tree.root.id);
      const gen1Set = new Set<string>([tree.root.id]);
      sproutChildrenForParent(tree.root);
      setExpandedNodeIds(gen1Set);
      showToast('🌸 عرض الجيل الأول (الأبناء المباشرين) فقط', 'info');
      triggerCameraTransition(new THREE.Vector3(0, 140, 0), new THREE.Vector3(0, 620, 1400));
      return;
    }

    if (gen === 'gen2') {
      collapseBranch(tree.root.id);
      const nextSet = new Set<string>([tree.root.id]);
      sproutChildrenForParent(tree.root);
      const gen1Children = getPersonChildren(tree.root);
      gen1Children.forEach(({ child }) => {
        nextSet.add(child.id);
        sproutChildrenForParent(child);
      });
      setExpandedNodeIds(nextSet);
      showToast('🍃 عرض حتى الجيل الثاني (الأحفاد)', 'info');
      triggerCameraTransition(new THREE.Vector3(0, 200, 0), new THREE.Vector3(0, 850, 1850));
      return;
    }

    if (gen === 'all') {
      handleExpandAll();
    }
  }, [tree.root, handleCollapseAll, handleExpandAll, collapseBranch, sproutChildrenForParent, showToast, triggerCameraTransition]);

  // Solo Branch Isolation Mode
  const handleToggleIsolateBranch = useCallback((branchId: string) => {
    if (isolatedBranchId === branchId) {
      setIsolatedBranchId(null);
      showToast('👁️ تم إلغاء عزل الفرع وعرض كامل المشهد', 'info');
      activeAnimItemsRef.current.forEach(item => {
        item.group.visible = true;
      });
    } else {
      setIsolatedBranchId(branchId);
      showToast('🎯 تم عزل هذا الفرع للتركيز الكامل على ذريته', 'info');
      
      // Determine lineage branch members
      const activeIds = new Set<string>([branchId, tree.root.id]);
      const addDescendants = (id: string) => {
        activeAnimItemsRef.current.forEach(item => {
          if (item.parentId === id) {
            activeIds.add(item.id);
            addDescendants(item.id);
          }
        });
      };
      addDescendants(branchId);

      // Hide unrelated branches
      activeAnimItemsRef.current.forEach(item => {
        item.group.visible = activeIds.has(item.id);
      });

      const branchLayout = layoutMapRef.current.get(branchId);
      if (branchLayout) {
        triggerCameraTransition(branchLayout.pos);
      }
    }
  }, [isolatedBranchId, tree.root.id, showToast, triggerCameraTransition]);

  // Camera Presets
  const handleFullTreeView = () => {
    triggerCameraTransition(new THREE.Vector3(0, 200, 0), new THREE.Vector3(0, 680, 2050));
    setSelectedNode(null);
  };

  const handleReadingView = () => {
    triggerCameraTransition(new THREE.Vector3(0, 220, 0), new THREE.Vector3(0, 950, 1680));
    setSelectedNode(null);
    showToast('👁️ تم ضبط الزاوية العلوية المريحة لقراءة جميع الأسماء', 'info');
  };

  const handleCanopyTopView = () => {
    triggerCameraTransition(new THREE.Vector3(0, 220, 0), new THREE.Vector3(0, 1750, 350));
    showToast('🧭 رؤية رأسية علوية لدوائر ومدرجات الأجيال', 'info');
  };

  const handleTrunkView = () => {
    triggerCameraTransition(new THREE.Vector3(0, 45, 0), new THREE.Vector3(0, 120, 750));
  };

  const handleZoom = (inOut: 'in' | 'out') => {
    if (cameraRef.current) {
      const factor = inOut === 'in' ? 0.75 : 1.35;
      targetCameraPosRef.current.multiplyScalar(factor);
      triggerCameraTransition(targetFocusRef.current, targetCameraPosRef.current);
    }
  };

  return (
    <div className={`relative w-full h-[76vh] md:h-[84vh] rounded-3xl overflow-hidden border shadow-2xl select-none transition-colors duration-300 ${
      isLight ? 'border-slate-200 bg-[#f1f5f9]' : isComfort ? 'border-[#543d26] bg-[#1f1a16]' : 'border-emerald-900/60 bg-[#0b1120]'
    }`}>
      
      {/* 3D Botanical WebGL Canvas */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing touch-none" />

      {/* Real-Time Hover Reading Lens HUD (High-DPI Inspection Card) */}
      {!toast && hoveredNode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 animate-in fade-in zoom-in-95 duration-150 pointer-events-none max-w-[92vw] sm:max-w-md">
          <div className={`px-4 py-2.5 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-center gap-3 transition-all overflow-hidden ${
            isLight 
              ? 'bg-white/95 text-slate-900 border-emerald-200 ring-4 ring-emerald-500/10' 
              : isComfort 
              ? 'bg-[#292218]/95 text-[#fef3c7] border-[#543d26] ring-4 ring-amber-500/15' 
              : 'bg-slate-950/90 text-white border-emerald-500/50 ring-4 ring-emerald-500/20'
          }`}>
            <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-lg ${
              hoveredNode.isRoot ? 'bg-amber-500 text-slate-950 font-black' :
              hoveredNode.isMarried ? 'bg-rose-500 text-white' :
              'bg-emerald-600 text-white'
            }`}>
              {hoveredNode.isRoot ? '👑' : hoveredNode.isMarried ? <Heart size={18} /> : <User size={18} />}
            </div>
            <div className="min-w-0 text-right flex-1">
              <div className={`text-base sm:text-lg font-black leading-tight break-words ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {hoveredNode.name}
              </div>
              {hoveredNode.isMarried && hoveredNode.spouseName && (
                <div className="text-xs sm:text-sm font-bold text-rose-400 break-words mt-0.5">
                  ❤️ {hoveredNode.spouseName}
                </div>
              )}
              <div className={`text-[11px] font-medium mt-0.5 flex items-center gap-2 ${
                isLight ? 'text-slate-500' : isComfort ? 'text-amber-200/80' : 'text-slate-400'
              }`}>
                <span>
                  {hoveredNode.isRoot ? 'جذع العائلة ورأس الشجرة' : 
                   hoveredNode.isMarried ? 'زهرة اقتران وزواج' : 'فرد في العائلة'}
                </span>
                {hoveredNode.title && <span>• {hoveredNode.title}</span>}
                {hoveredNode.hasChildren && (
                  <span className="text-emerald-400 font-bold">• انقر مرتين لتفتيح الأغصان 🌸</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Guidance Toast Notification */}
      {toast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
          <div className={`px-4 py-2.5 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-center gap-2.5 text-xs md:text-sm font-black ${
            toast.type === 'click1'
              ? 'bg-amber-500/95 text-slate-950 border-amber-300 ring-4 ring-amber-400/20'
              : toast.type === 'click2'
              ? 'bg-emerald-600/95 text-white border-emerald-400 ring-4 ring-emerald-500/25'
              : isLight 
              ? 'bg-white/95 text-slate-900 border-slate-200' 
              : 'bg-slate-900/95 text-white border-slate-700'
          }`}>
            {toast.type === 'click1' ? (
              <MousePointerClick size={18} className="animate-bounce" />
            ) : (
              <Flower2 size={18} className="animate-spin" />
            )}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {/* Floating Generation Filter Bar (Top Center / Under Toast) */}
      <div className={`absolute top-3 left-1/2 -translate-x-1/2 z-20 hidden sm:flex items-center gap-1.5 p-1.5 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all ${
        isLight ? 'bg-white/90 border-slate-200 text-slate-800' : isComfort ? 'bg-[#292218]/90 border-[#543d26] text-[#fef3c7]' : 'glass-panel-dark text-white border-emerald-800/50'
      }`}>
        <button
          onClick={() => handleFilterGeneration('root')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
            activeGenFilter === 'root'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <span>👑 رأس العائلة</span>
        </button>

        <button
          onClick={() => handleFilterGeneration('gen1')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
            activeGenFilter === 'gen1'
              ? 'bg-emerald-600 text-white shadow-md font-black'
              : isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <span>🌸 الجيل الأول (الأبناء)</span>
        </button>

        <button
          onClick={() => handleFilterGeneration('gen2')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
            activeGenFilter === 'gen2'
              ? 'bg-emerald-600 text-white shadow-md font-black'
              : isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <span>🍃 الجيل الثاني (الأحفاد)</span>
        </button>

        <button
          onClick={() => handleFilterGeneration('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
            activeGenFilter === 'all'
              ? 'bg-rose-600 text-white shadow-md font-black'
              : isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <Sparkles size={13} />
          <span>كامل الشجرة</span>
        </button>
      </div>

      {/* Floating View & Expansion Control HUD (Top Right) */}
      <div className="absolute top-3 right-3 md:top-4 md:right-4 z-20 flex flex-col gap-2">
        <div className={`p-1.5 md:p-2 rounded-2xl border shadow-2xl flex flex-col gap-1 transition-colors ${
          isLight ? 'bg-white/95 text-slate-800 border-slate-200 shadow-slate-200' : isComfort ? 'bg-[#292218]/95 text-[#fde68a] border-[#543d26]' : 'glass-panel-dark text-white border-emerald-800/50'
        }`}>
          {/* 1. Show All Branches */}
          <button
            onClick={handleExpandAll}
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              isLight ? 'hover:bg-rose-50 text-rose-700' : isComfort ? 'hover:bg-[#45321f] text-rose-300' : 'hover:bg-rose-950/80 text-rose-300'
            }`}
            title="تفتيح وإظهار كامل شجرة العائلة بحركة نباتية متدرجة"
          >
            <Flower2 size={16} className="text-rose-400 animate-pulse" />
            <span className="hidden sm:inline">تفتح كامل الشجرة</span>
          </button>

          {/* 2. Collapse to Trunk */}
          <button
            onClick={handleCollapseAll}
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              isLight ? 'hover:bg-slate-100 text-slate-600' : isComfort ? 'hover:bg-[#45321f] text-[#fef3c7]' : 'hover:bg-slate-800 text-slate-300'
            }`}
            title="طي الفروع إلى الجذع فقط (الحالة الافتراضية)"
          >
            <Leaf size={16} className="text-emerald-400" />
            <span className="hidden sm:inline">طي إلى الجذع</span>
          </button>

          <div className="h-px bg-slate-200/40 my-0.5"></div>

          {/* Camera Presets */}
          <button
            onClick={handleReadingView}
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              isLight ? 'hover:bg-amber-50 text-amber-700' : isComfort ? 'hover:bg-[#45321f] text-amber-300' : 'hover:bg-amber-950/80 text-amber-300'
            }`}
            title="زاوية علوية مائلة بزاوية 35 درجة لقراءة مريحة لجميع الأسماء بدون تداخل"
          >
            <Sparkles size={16} className="text-amber-400" />
            <span className="hidden sm:inline">زاوية القراءة</span>
          </button>

          <button
            onClick={handleCanopyTopView}
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              isLight ? 'hover:bg-slate-100 text-slate-700' : isComfort ? 'hover:bg-[#45321f] text-amber-200' : 'hover:bg-slate-800 text-slate-200'
            }`}
            title="رؤية رأسية عمودية من الأعلى لمدرجات الأجيال الدائرية"
          >
            <Compass size={16} />
            <span className="hidden sm:inline">منظر رأسي</span>
          </button>

          <button
            onClick={handleFullTreeView}
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              isLight ? 'hover:bg-emerald-50 text-emerald-700' : isComfort ? 'hover:bg-[#45321f] text-amber-300' : 'hover:bg-emerald-950/80 text-emerald-300'
            }`}
            title="منظر شامل لكامل الشجرة"
          >
            <TreePine size={16} />
            <span className="hidden sm:inline">الشجرة كاملة</span>
          </button>

          <button
            onClick={handleTrunkView}
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              isLight ? 'hover:bg-slate-100 text-slate-700' : isComfort ? 'hover:bg-[#45321f] text-amber-200' : 'hover:bg-slate-800 text-slate-200'
            }`}
            title="التركيز على جذع العائلة ورأس الشجرة"
          >
            <Maximize2 size={16} />
            <span className="hidden sm:inline">جذع العائلة</span>
          </button>

          <div className="h-px bg-slate-200/40 my-0.5"></div>

          {/* Turntable Auto-Rotate */}
          <button
            onClick={() => setIsAutoRotate(!isAutoRotate)}
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              isAutoRotate 
                ? 'bg-emerald-600 text-white shadow-md' 
                : isLight ? 'hover:bg-slate-100 text-slate-700' : isComfort ? 'hover:bg-[#45321f] text-amber-200' : 'hover:bg-slate-800 text-slate-200'
            }`}
            title="دوران سينمائي تلقائي للشجرة"
          >
            <RotateCw size={16} className={isAutoRotate ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{isAutoRotate ? 'إيقاف الدوران' : 'دوران سينمائي'}</span>
          </button>

          {/* Zoom In/Out */}
          <div className="flex items-center gap-1 pt-1 justify-center">
            <button
              onClick={() => handleZoom('in')}
              className={`p-1.5 rounded-lg transition-colors ${isLight ? 'hover:bg-slate-100 text-slate-600' : isComfort ? 'hover:bg-[#45321f] text-amber-200' : 'hover:bg-slate-800 text-slate-300'}`}
              title="تقريب الكاميرا"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => handleZoom('out')}
              className={`p-1.5 rounded-lg transition-colors ${isLight ? 'hover:bg-slate-100 text-slate-600' : isComfort ? 'hover:bg-[#45321f] text-amber-200' : 'hover:bg-slate-800 text-slate-300'}`}
              title="إبعاد الكاميرا"
            >
              <ZoomOut size={16} />
            </button>
          </div>

        </div>
      </div>

      {/* Nature Legend & Guide (Top Left) */}
      <div className={`absolute top-3 left-3 md:top-4 md:left-4 z-20 px-3 py-2.5 rounded-2xl border text-[11px] flex flex-col gap-1.5 shadow-xl backdrop-blur-md transition-colors ${
        isLight ? 'bg-white/95 border-slate-200 text-slate-800' : isComfort ? 'bg-[#292218]/95 border-[#543d26] text-[#fef3c7]' : 'glass-panel-dark border-emerald-800/40 text-slate-200'
      }`}>
        <div className={`flex items-center gap-2 font-black pb-1 border-b ${isLight ? 'text-emerald-700 border-slate-200' : isComfort ? 'text-amber-400 border-[#543d26]' : 'text-emerald-400 border-emerald-900/60'}`}>
          <Sparkles size={14} />
          <span>المدرجات الملكية المتدرجة (3D)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-300/30"></span>
          <span>المركز: رأس العائلة 👑</span>
        </div>
        <div className="flex items-center gap-2">
          <Flower2 size={13} className="text-rose-400" />
          <span>زهرة اقتران (زوج وزوجة ❤️)</span>
        </div>
        <div className="flex items-center gap-2">
          <Leaf size={13} className="text-emerald-400" />
          <span>ورقة شجر (أفراد العائلة 🍃)</span>
        </div>
        <div className="flex items-center gap-2">
          <MousePointerClick size={13} className="text-amber-400 animate-pulse" />
          <span className="font-bold">نقر مزدوج: فتح أو طي الفرع</span>
        </div>
        <div className={`text-[10px] pt-1 hidden sm:block ${isLight ? 'text-emerald-700 font-semibold' : isComfort ? 'text-amber-300' : 'text-emerald-400'}`}>
          💡 كل جيل في مدرج مستقل لمنع التداخل تماماً
        </div>
      </div>

      {/* Selected Node Mobile-Optimized Bottom Sheet */}
      {selectedNode && (
        <div className={`absolute bottom-3 left-3 right-3 md:left-auto md:right-4 md:bottom-4 md:w-96 max-w-[calc(100vw-24px)] z-30 rounded-3xl p-4 md:p-5 border shadow-2xl animate-in slide-in-from-bottom-4 duration-300 backdrop-blur-md transition-colors overflow-hidden ${
          isLight ? 'bg-white/95 border-emerald-200 text-slate-800' : isComfort ? 'bg-[#292218]/95 border-[#543d26] text-[#fef3c7]' : 'glass-panel border-emerald-300/60 text-slate-800'
        }`}>
          
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={`p-2.5 rounded-2xl shrink-0 mt-0.5 ${
                selectedNode.isRoot ? 'bg-amber-600 text-white' : 
                selectedNode.isMarried ? 'bg-rose-600 text-white' : 
                'bg-emerald-600 text-white'
              }`}>
                {selectedNode.isMarried ? <Heart size={20} /> : <User size={20} />}
              </div>
              <div className="flex-1 min-w-0 text-right">
                {selectedNode.isMarried && selectedNode.spouseName ? (
                  <div className="space-y-1">
                    <h3 className={`font-black text-sm md:text-base leading-snug break-words ${
                      isLight ? 'text-slate-900' : isComfort ? 'text-[#fef3c7]' : 'text-slate-900'
                    }`}>
                      {selectedNode.name}
                    </h3>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-lg border border-rose-200/70 text-xs font-bold break-words">
                        <Heart size={12} className="text-rose-500 fill-rose-500 shrink-0" />
                        <span className="break-words">{selectedNode.spouseName}</span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <h3 className={`font-black text-sm md:text-base leading-snug break-words ${
                    isLight ? 'text-slate-900' : isComfort ? 'text-[#fef3c7]' : 'text-slate-900'
                  }`}>
                    {selectedNode.name}
                  </h3>
                )}
                <p className={`text-xs font-medium mt-1 leading-tight flex items-center gap-1.5 flex-wrap ${
                  isLight ? 'text-slate-500' : isComfort ? 'text-amber-200/80' : 'text-slate-500'
                }`}>
                  <span>
                    {selectedNode.isRoot 
                      ? 'جذع الشجرة ورأس العائلة' 
                      : selectedNode.isMarried 
                      ? `الجيل ${selectedNode.level}: زهرة زواج` 
                      : `الجيل ${selectedNode.level}: فرد في العائلة`}
                  </span>
                  {selectedNode.title && <span className="text-emerald-600 font-bold">• {selectedNode.title}</span>}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
              aria-label="إغلاق"
            >
              <X size={18} />
            </button>
          </div>

          {/* Solo Branch Focus Button */}
          {!selectedNode.isRoot && selectedNode.hasChildren && (
            <button
              onClick={() => handleToggleIsolateBranch(selectedNode.id)}
              className={`w-full mb-2 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all border ${
                isolatedBranchId === selectedNode.id
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                  : 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
              }`}
            >
              <Eye size={14} />
              {isolatedBranchId === selectedNode.id ? 'إلغاء عزل هذا الفرع' : 'عزل والتركيز على هذا الفرع فقط 🎯'}
            </button>
          )}

          {/* Direct Blossom / Fold toggle */}
          {selectedNode.hasChildren && (
            <button
              onClick={() => handleToggleExpand(selectedNode.id, selectedNode.position)}
              className={`w-full mb-2.5 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
                expandedNodeIds.has(selectedNode.id)
                  ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  : 'bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700'
              }`}
            >
              {expandedNodeIds.has(selectedNode.id) ? (
                <><Leaf size={14}/> طي هذا الغصن</>
              ) : (
                <><Flower2 size={14}/> تفتيح الغصن وإظهار الذرية 🌸</>
              )}
            </button>
          )}

          {/* Links to other trees */}
          {selectedNode.links && selectedNode.links.length > 0 && (
            <div className="mb-2.5 space-y-1">
              <span className="text-[10px] font-bold text-purple-700 flex items-center gap-1">
                <LinkIcon size={11} /> مرتبط بشجرة عائلة أخرى:
              </span>
              {selectedNode.links.map((link: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => onNavigateLink(link.targetTreeId, link.targetPersonId)}
                  className="w-full bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 p-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors group"
                >
                  <span className="truncate">{link.targetName} ({link.targetTreeName})</span>
                  <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform text-purple-500" />
                </button>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/60 justify-end">
            {actions.isEditMode ? (
              <>
                <button
                  onClick={() => actions.onEdit(selectedNode.id, selectedNode.isSpouse ? 'spouse' : 'person', selectedNode.name, selectedNode.title)}
                  className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold flex items-center gap-1 min-h-[38px]"
                >
                  <Edit2 size={13} /> تعديل
                </button>
                <button
                  onClick={() => actions.onAddChild(selectedNode.id)}
                  className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1 min-h-[38px]"
                >
                  <UserPlus size={13} /> إضافة ابن
                </button>
                {!selectedNode.isSpouse && (
                  <button
                    onClick={() => actions.onAddSpouse(selectedNode.id)}
                    className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold flex items-center gap-1 min-h-[38px]"
                  >
                    <HeartHandshake size={13} /> إضافة زوجة
                  </button>
                )}
                <button
                  onClick={() => actions.onLink(selectedNode.id, selectedNode.name)}
                  className="px-3 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold flex items-center gap-1 min-h-[38px]"
                >
                  <LinkIcon size={13} /> ربط
                </button>
                {!selectedNode.isRoot && (
                  <button
                    onClick={() => actions.onDelete(selectedNode.id, selectedNode.name, selectedNode.isSpouse ? 'spouse' : 'person')}
                    className="px-3 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold flex items-center gap-1 min-h-[38px]"
                  >
                    <Trash2 size={13} /> حذف
                  </button>
                )}
              </>
            ) : (
              <div className="w-full text-[11px] text-slate-500 text-center py-1">
                فعل &quot;وضع التعديل&quot; لإضافة أبناء أو زوجات لهذا الفرع
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
