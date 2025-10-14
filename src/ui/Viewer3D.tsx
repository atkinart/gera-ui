
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import useWorkspace from '@/store/workspace'
import { useEffect, useMemo } from 'react'
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

  function NodeSpheres() {
    const data = meshQuery.data
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

  function CylinderBetween({ a, b, radius = 0.05 }: { a: THREE.Vector3; b: THREE.Vector3; radius?: number }) {
    const { mid, quat, len } = useMemo(() => {
      const dir = new THREE.Vector3().subVectors(b, a)
      const len = dir.length()
      const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5)
      const quat = new THREE.Quaternion()
      // align cylinder default Y-axis to dir
      const yAxis = new THREE.Vector3(0, 1, 0)
      if (len > 0) quat.setFromUnitVectors(yAxis, dir.clone().normalize())
      return { mid, quat, len }
    }, [a, b])
    return (
      <mesh position={mid} quaternion={quat}>
        <cylinderGeometry args={[radius, radius, len, 12]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
    )
  }

  function ElementCylinders() {
    const data = meshQuery.data
    if (!data || !data.nodes?.length || !data.elements?.length) return null
    const nodes = data.nodes.map((n) => new THREE.Vector3(n[0], n[1], n[2]))
    // Нормализуем элементы: поддерживаем пары [i,j] и тройки [i,j,k] (конвертируем в рёбра)
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

  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [6,6,6], fov: 60 }}>
        <ambientLight />
        <directionalLight position={[5,5,5]} />
        <gridHelper args={[10, 10]} />
        <axesHelper args={[3]} />
        {/* Узлы как шары и элементы как цилиндры */}
        <ElementCylinders />
        <NodeSpheres />
        <ResultMesh />
        <OrbitControls />
      </Canvas>
    </div>
  )
}
