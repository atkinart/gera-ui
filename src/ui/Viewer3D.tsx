
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import useWorkspace from '@/store/workspace'
import { useEffect } from 'react'
import { bus } from '@/lib/bus'
import { getJob } from '@/lib/api'

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

  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [3,3,3], fov: 60 }}>
        <ambientLight />
        <directionalLight position={[5,5,5]} />
        <gridHelper args={[10, 10]} />
        <axesHelper args={[3]} />
        <ResultMesh />
        <OrbitControls />
      </Canvas>
    </div>
  )
}
