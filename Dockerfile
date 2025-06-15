# Используем официальный образ Node.js
FROM node:20-alpine

# Устанавливаем рабочую директорию в контейнере
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем остальной код приложения
COPY . .

# Next.js запускается на порту 3000
EXPOSE 3000

# Команда для запуска приложения в режиме разработки
CMD ["npm", "run", "dev"] 