
import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <section className="container-lg py-16 grid md:grid-cols-2 gap-10 items-center">
      <div>
        <h1 className="text-3xl font-semibold mb-4">Информационная система для геометрических расчётов в строительстве</h1>
        <p className="text-slate-600 mb-6">
          Современное веб-приложение для реализации авторского алгоритма. Управляйте проектами, настраивайте параметры,
          визуализируйте 3D-модель и экспортируйте результаты.
        </p>
        <div className="flex gap-3">
          <Link to="/register" className="brand-btn">Зарегистрироваться</Link>
          <Link to="/login" className="px-4 py-2 rounded-md border border-slate-300">Войти</Link>
        </div>
      </div>
      <div className="card p-6">
        <ul className="space-y-3 text-slate-700">
          <li>• Управление проектами</li>
          <li>• Конфигурирование параметров расчёта</li>
          <li>• Интерактивная 3D-визуализация</li>
          <li>• Готовность к интеграции с бэкендом</li>
        </ul>
      </div>
    </section>
  )
}
