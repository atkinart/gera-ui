
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
  const [showEdges, setShowEdges] = useState(true)
  const [showNodes, setShowNodes] = useState(true)
  const fitRef = useRef<null | (() => void)>(null)
  const controlsApiRef = useRef<{
    zoomIn: () => void
    zoomOut: () => void
  } | null>(null)
  // Глобальные параметры стиля для всех моделей
  const edgeColor = '#9ca3af'
  // Toggle maximize: скрыть панели моделей и параметров / восстановить
  const { isProjectsOpen, isConfigOpen, isViewerOpen, setProjectsOpen, setConfigOpen, setViewerOpen } = useWorkspace()
  const [savedPanels, setSavedPanels] = useState<null | { p: boolean; c: boolean; v: boolean }>(null)
  const toggleMaximize = () => {
    if (savedPanels == null) {
      setSavedPanels({ p: isProjectsOpen, c: isConfigOpen, v: isViewerOpen })
      setProjectsOpen(false)
      setConfigOpen(false)
      setViewerOpen(true)
      // подстроить вид
      setTimeout(()=>fitRef.current?.(), 0)
    } else {
      setProjectsOpen(savedPanels.p)
      setConfigOpen(savedPanels.c)
      setViewerOpen(savedPanels.v)
      setSavedPanels(null)
    }
  }

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

  function Scene({ flags, bindFit, bindControls }: { flags: { showEdges: boolean; showNodes: boolean }; bindFit: (fn: () => void) => void; bindControls: (api: { zoomIn:()=>void; zoomOut:()=>void }) => void }) {
    const data = meshQuery.data
    const controlsRef = useRef<any>(null)
    const camera = useThree((s) => s.camera as THREE.PerspectiveCamera)

    function NodeSpheres() {
      if (!data || !data.nodes?.length) return null
      const radius = 0.025
      return (
        <group>
          {data.nodes.map((n, idx) => (
            <mesh key={idx} position={[n[0], n[1], n[2]]}>
              <sphereGeometry args={[radius, 16, 16]} />
              <meshStandardMaterial color="#374151" />
            </mesh>
          ))}
        </group>
      )
    }

    function CylinderBetween({ a, b, radius = 0.015, color = edgeColor }: { a: THREE.Vector3; b: THREE.Vector3; radius?: number; color?: string }) {
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

    // Убрали режим «грани» по требованию

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

    // Bind control API for toolbar buttons
    useEffect(() => {
      bindControls({
        // «+» приближает, «-» отдаляет
        zoomIn: () => { controlsRef.current?.dollyOut?.(0.9); controlsRef.current?.update?.() },
        zoomOut: () => { controlsRef.current?.dollyIn?.(0.9); controlsRef.current?.update?.() },
      })
    }, [])

    return (
      <>
        {flags.showEdges && <ElementCylinders />}
        {flags.showNodes && <NodeSpheres />}
        <OrbitControls ref={controlsRef} enablePan enableZoom enableRotate enableDamping dampingFactor={0.08} />
      </>
    )
  }

  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [6,6,6], fov: 60 }}>
        <ambientLight />
        <directionalLight position={[5,5,5]} />
        <gridHelper args={[10, 10]} />
        <axesHelper args={[3]} />
        {/* Сцена: режимы отображения и узлы */}
        <Scene
          flags={{ showEdges, showNodes }}
          bindFit={(fn)=>{ fitRef.current = fn }}
          bindControls={(api)=>{ controlsApiRef.current = api }}
        />
        <ResultMesh />
      </Canvas>
      {/* Overlay controls (responsive) */}
      <div className="absolute md:top-2 md:right-2 top-auto right-auto left-1/2 -translate-x-1/2 bottom-2 bg-white/90 backdrop-blur rounded border shadow px-2 py-1 text-xs flex md:flex-row flex-col items-stretch md:items-center gap-1 flex-wrap max-w-[92%] overflow-x-auto">
        <span className="text-slate-600 hidden md:inline">Вид:</span>
        <button onClick={()=>setShowEdges(v=>!v)} className={`px-2 py-1 rounded border md:w-auto w-full ${showEdges?'bg-slate-200':'hover:bg-slate-50'}`} title="Показывать рёбра">Рёбра</button>
        <button onClick={()=>setShowNodes(v=>!v)} className={`px-2 py-1 rounded border md:w-auto w-full ${showNodes?'bg-slate-200':'hover:bg-slate-50'}`} title="Показывать узлы">Узлы</button>
        <div className="hidden md:block w-px h-4 bg-slate-300 mx-1" />
        <div className="flex md:flex-row flex-row md:w-auto w-full gap-1">
          <button onClick={()=>controlsApiRef.current?.zoomIn()} className="px-2 py-1 rounded border hover:bg-slate-50" title="Приблизить">＋</button>
          <button onClick={()=>controlsApiRef.current?.zoomOut()} className="px-2 py-1 rounded border hover:bg-slate-50" title="Отдалить">－</button>
          <button onClick={()=>fitRef.current?.()} className="px-2 py-1 rounded border hover:bg-slate-50" title="Вписать модель в кадр">Вписать</button>
        </div>
        <div className="hidden md:block w-px h-4 bg-slate-300 mx-1" />
        <button onClick={toggleMaximize} className="px-2 py-1 rounded border hover:bg-slate-50 md:w-auto w-full" title="На весь экран / восстановить">{savedPanels ? 'Восстановить' : 'На весь экран'}</button>
      </div>
    </div>
  )
}
