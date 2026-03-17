# AGENTS.md — gera-ui

## Контекст
Node.js проект на npm (CommonJS). Скрипты определены в `package.json`.

## Структура
```
./
├── index.js
├── package.json
├── package-lock.json
└── node_modules/    # присутствует в репозитории; не править руками
```

## Команды
```bash
npm ci
npm run lint
npm test
```

## Правила
- Не редактируй файлы в `node_modules/`.
- Если нужна новая команда (например, `dev`/`build`) — добавляй её через `scripts` в `package.json`.
- Для управления кодом и процессом используем только Git/GitHub; SourceCraft в этом проекте не используется.
