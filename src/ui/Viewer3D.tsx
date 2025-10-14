
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import useWorkspace from '@/store/workspace'
import { useEffect, useMemo, useRef, useState } from 'react'
import { bus } from '@/lib/bus'
import { getJob, getModelMesh } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import * as THREE from 'three'

function ResultMesh() {
  const mesh = useWorkspace(s => s.mesh)
  if (!mesh) return null
  if (mesh.type === 'box') {
    return (
      <mesh>
        <boxGeometry args={mesh.args} />
        <meshNormalMaterial />
      </mesh>
    )
  }
  return null
}

export default function Viewer3D() {
  const setMesh = useWorkspace(s => s.setMesh)
  const lastJobId = useWorkspace(s => s.lastJobId)
  const selectedId = useWorkspace(s => s.selectedProjectId)
  const [mode, setMode] = useState<'edges' | 'faces'>('edges')
  const [showNodes, setShowNodes] = useState(true)
  const fitRef = useRef<null | (() => void)>(null)
  const edgeColor = selectedId === 'p2' ? '#9ca3af' : '#111827'

  useEffect(() => {
    const onDone = async () => {
      if (!lastJobId) return
      const data = await getJob(lastJobId)
      if (data.status === 'done' && data.mesh) {
        setMesh(data.mesh)
      }
    }
    bus.on('compute:done', onDone)
    return () => { bus.off('compute:done', onDone as any) }
  }, [lastJobId, setMesh])

  // Загружаем меш модели (узлы/элементы) для выбранной модели
  const meshQuery = useQuery({
    queryKey: ['model-mesh', selectedId],
    queryFn: () => getModelMesh(selectedId!),
    enabled: !!selectedId,
  })

  function Scene({ mode, showNodes, bindFit }: { mode: 'edges'|'faces'; showNodes: boolean; bindFit: (fn: () => void) => void }) {
    const data = meshQuery.data
    const controlsRef = useRef<any>(null)
    const camera = useThree((s) => s.camera as THREE.PerspectiveCamera)

    function NodeSpheres() {
      if (!data || !data.nodes?.length) return null
      const radius = 0.1
      return (
        <group>
          {data.nodes.map((n, idx) => (
            <mesh key={idx} position={[n[0], n[1], n[2]]}>
              <sphereGeometry args={[radius, 16, 16]} />
              <meshStandardMaterial color="#206cf1" />
            </mesh>
          ))}
        </group>
      )
    }

    function CylinderBetween({ a, b, radius = 0.03, color = edgeColor }: { a: THREE.Vector3; b: THREE.Vector3; radius?: number; color?: string }) {
      const { mid, quat, len } = useMemo(() => {
        const dir = new THREE.Vector3().subVectors(b, a)
        const len = dir.length()
        const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5)
        const quat = new THREE.Quaternion()
        const yAxis = new THREE.Vector3(0, 1, 0)
        if (len > 0) quat.setFromUnitVectors(yAxis, dir.clone().normalize())
        return { mid, quat, len }
      }, [a, b])
      return (
        <mesh position={mid} quaternion={quat}>
          <cylinderGeometry args={[radius, radius, len, 12]} />
          <meshStandardMaterial color={color} />
        </mesh>
      )
    }

    function ElementCylinders() {
      if (!data || !data.nodes?.length || !data.elements?.length) return null
      const nodes = data.nodes.map((n) => new THREE.Vector3(n[0], n[1], n[2]))
      const edgeSet = new Set<string>()
      const edges: [number, number][] = []
      const addEdge = (i: number, j: number) => {
        const a = Math.min(i, j), b = Math.max(i, j)
        const key = `${a}-${b}`
        if (!edgeSet.has(key)) { edgeSet.add(key); edges.push([a, b]) }
      }
      for (const el of data.elements) {
        if (el.length === 2) addEdge(el[0], el[1])
        else if (el.length >= 3) {
          for (let k = 0; k < el.length; k++) {
            const i = el[k]
            const j = el[(k + 1) % el.length]
            addEdge(i, j)
          }
        }
      }
      return (
        <group>
          {edges.map(([i, j], idx) => (
            <CylinderBetween key={idx} a={nodes[i]} b={nodes[j]} />
          ))}
        </group>
      )
    }

    function FaceMesh() {
      if (!data || !data.nodes?.length || !data.elements?.length) return null
      const positions = new Float32Array(data.nodes.flat())
      const indices = new Uint32Array(data.elements.flat())
      return (
        <mesh>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" array={positions} itemSize={3} />
            <bufferAttribute attach="index" array={indices} itemSize={1} />
          </bufferGeometry>
          <meshStandardMaterial color={selectedId === 'p2' ? '#9ca3af' : '#7dd3fc'} metalness={0.1} roughness={0.8} side={2} />
        </mesh>
      )
    }

    // Fit impl
    const doFit = () => {
      if (!data || !data.nodes?.length) return
      const box = new THREE.Box3()
      for (const n of data.nodes) box.expandByPoint(new THREE.Vector3(n[0], n[1], n[2]))
      const size = new THREE.Vector3()
      const center = new THREE.Vector3()
      box.getSize(size)
      box.getCenter(center)
      const maxDim = Math.max(size.x, size.y, size.z)
      const fov = (camera as THREE.PerspectiveCamera).fov ?? 60
      const fovRad = (fov * Math.PI) / 180
      const dist = (maxDim / 2) / Math.tan(fovRad / 2)
      const dir = new THREE.Vector3(1, 1, 1).normalize()
      camera.position.copy(center.clone().add(dir.multiplyScalar(dist * 1.5)))
      ;(controlsRef.current as any)?.target?.copy(center)
      ;(controlsRef.current as any)?.update?.()
    }
    useEffect(() => { bindFit(doFit) }, [data])

    return (
      <>
        {mode === 'faces' ? <FaceMesh /> : <ElementCylinders />}
        {showNodes && <NodeSpheres />}
        <OrbitControls ref={controlsRef} enablePan enableZoom enableRotate />
      </>
    )
  }

  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [6,6,6], fov: 60 }}>
        <ambientLight />
        <directionalLight position={[5,5,5]} />
        <gridHelper args={[10, 10]} />
        <axesHelper args={[3]} />
        {/* Сцена: режимы отображения и узлы */}
        <Scene mode={mode} showNodes={showNodes} bindFit={(fn)=>{ fitRef.current = fn }} />
        <ResultMesh />
      </Canvas>
      {/* Overlay controls */}
      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur rounded border shadow px-2 py-1 text-xs flex items-center gap-1">
        <span className="text-slate-600">Вид:</span>
        <button onClick={()=>setMode('edges')} className={`px-2 py-0.5 rounded border ${mode==='edges'?'bg-slate-200':'hover:bg-slate-50'}`} title="Отображать элементы как рёбра">Рёбра</button>
        <button onClick={()=>setMode('faces')} className={`px-2 py-0.5 rounded border ${mode==='faces'?'bg-slate-200':'hover:bg-slate-50'}`} title="Отображать элементы как грани">Грани</button>
        <div className="w-px h-4 bg-slate-300 mx-1" />
        <button onClick={()=>setShowNodes(v=>!v)} className={`px-2 py-0.5 rounded border ${showNodes?'bg-slate-200':'hover:bg-slate-50'}`} title="Показывать узлы (сферы)">Узлы</button>
        <div className="w-px h-4 bg-slate-300 mx-1" />
        <button onClick={()=>fitRef.current?.()} className="px-2 py-0.5 rounded border hover:bg-slate-50" title="Вписать модель в кадр">Вписать</button>
      </div>
    </div>
  )
}
