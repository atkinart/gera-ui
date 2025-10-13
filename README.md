Geo Construction App
====================

Docker‑образ (GHCR)
- Образ публикуется в GitHub Container Registry (GHCR): `ghcr.io/atkinart/gera-ui`
- При пушах в `main`/`master` публикуются теги: `latest` и полный SHA коммита
- При пушах тега (например, `v1.2.3`) публикуются теги: `v1.2.3` и `latest`

Как скачать и запустить
- Скачать последний образ: `docker pull ghcr.io/atkinart/gera-ui:latest`
- Запустить: `docker run --rm -p 8080:80 ghcr.io/atkinart/gera-ui:latest`
- Открыть в браузере: http://localhost:8080

Использование конкретной версии
- Скачать тег: `docker pull ghcr.io/atkinart/gera-ui:v1.2.3`
- Запустить: `docker run --rm -p 8080:80 ghcr.io/atkinart/gera-ui:v1.2.3`

Аутентификация
- Если репозиторий/пакет приватный, сначала выполните вход:
  - `echo $GITHUB_TOKEN | docker login ghcr.io -u <ВАШ_ЛОГИН_GH> --password-stdin`
  - Токен должен иметь право `read:packages`
  - Либо сделайте пакет GHCR публичным в настройках репозитория

CI
- Воркфлоу GitHub Actions (`.github/workflows/ci.yml`) запускает lint, тесты и сборку Docker‑образов
- Образы собираются из `Dockerfile` и отдаются Nginx на порту 80

Локальное тестирование
- Рекомендуемый способ (dev, с моками):
  1) Требования: Node.js 18+, npm
  2) Установка: `npm ci`
  3) Запуск dev‑сервера: `npm run dev`
  4) Открыть: http://localhost:5173
  5) Примечание: в режиме разработки автоматически включается MSW (моки API), внешний бэкенд не требуется

- Тесты и линтер:
  - Запуск тестов: `npm test`
  - Режим наблюдения: `npm run test:watch`
  - Линтер: `npm run lint`

- Проверка прод‑сборки локально (Docker):
  1) Сборка образа: `docker build -t gera-ui:local .`
  2) Запуск: `docker run --rm -p 8080:80 gera-ui:local`
  3) Открыть: http://localhost:8080
  4) Важно: в прод‑сборке моки отключены. Для работы `/api` нужен реальный бэкенд или прокси в Nginx. 
     - Пример: раскомментируйте секцию `location /api/` в `nginx.conf`, укажите адрес вашего бэкенда (`proxy_pass http://<host>:<port>;`), затем пересоберите образ.
