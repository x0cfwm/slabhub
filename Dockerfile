# Используем Node.js 20 LTS
FROM node:20-slim

# Устанавливаем pnpm глобально
RUN npm install -g pnpm@9.15.0

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы зависимостей
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages ./packages

# Устанавливаем зависимости
RUN pnpm install --frozen-lockfile

# Копируем Prisma схему и генерируем клиент
COPY prisma ./prisma
RUN npx prisma generate

# Копируем исходники API
COPY apps/api ./apps/api

# Собираем API
RUN pnpm --filter @slabhub/api run build

# Открываем порт
EXPOSE 3001

# Запускаем приложение
CMD ["pnpm", "--filter", "@slabhub/api", "run", "start:prod"]
