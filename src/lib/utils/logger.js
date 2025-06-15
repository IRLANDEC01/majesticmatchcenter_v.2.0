import winston from 'winston';

const { combine, timestamp, json, errors } = winston.format;

const logger = winston.createLogger({
  // Уровень логирования. В 'development' можно поставить 'debug' для более подробных логов.
  level: process.env.LOG_LEVEL || 'info',
  
  // Формат логов.
  format: combine(
    // Добавляем обработку стектрейсов ошибок
    errors({ stack: true }), 
    // Добавляем временную метку
    timestamp(),
    // Выводим в формате JSON
    json()
  ),

  // Место назначения логов.
  transports: [
    // В большинстве случаев достаточно выводить в консоль (stdout),
    // так как в Docker'е этот поток будет перехвачен и отправлен в Loki
    // или другую систему сбора логов.
    new winston.transports.Console(),
  ],
});

// Для разработки можно добавить более читаемый формат вывода в консоль,
// если вывод в JSON неудобен.
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

export default logger; 