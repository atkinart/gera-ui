
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import useWorkspace from '@/store/workspace'
import { useEffect } from 'react'
import { bus } from '@/lib/bus'
import { getJob, getModelMesh } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'

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

  function TriMesh() {
    const data = meshQuery.data
    if (!data || !data.nodes?.length || !data.elements?.length) return null
    const positions = new Float32Array(data.nodes.flat())
    // elements уже как тройки индексов (0-based)
    const indices = new Uint32Array(data.elements.flat())
    return (
      <mesh>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={positions} itemSize={3} />
          <bufferAttribute attach="index" array={indices} itemSize={1} />
        </bufferGeometry>
        <meshNormalMaterial side={2} />
      </mesh>
    )
  }

  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [6,6,6], fov: 60 }}>
        <ambientLight />
        <directionalLight position={[5,5,5]} />
        <gridHelper args={[10, 10]} />
        <axesHelper args={[3]} />
        {/* Приоритет: меш модели (узлы/элементы), затем результирующий box */}
        <TriMesh />
        <ResultMesh />
        <OrbitControls />
      </Canvas>
    </div>
  )
}
