# Используем официальный образ Node.js
FROM node:22-alpine

# Устанавливаем рабочую директорию в контейнере
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Настраиваем npm для стабильной установки
RUN npm config set fetch-timeout 600000 && \
    npm config set fetch-retry-mintimeout 10000 && \
    npm config set fetch-retry-maxtimeout 60000

# Устанавливаем зависимости
RUN npm install --verbose

# Копируем остальной код приложения
COPY . .

# Next.js запускается на порту 3000
EXPOSE 3000

# Команда для запуска приложения в режиме разработки
CMD ["npm", "run", "dev"] 