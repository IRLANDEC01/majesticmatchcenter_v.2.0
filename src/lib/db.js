import mongoose from 'mongoose';

/**
 * Глобальная переменная для хранения кешированного подключения.
 * В среде разработки мы хотим избежать повторных подключений при каждом
 * изменении кода, которое вызывает горячую перезагрузку.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Функция для подключения к базе данных MongoDB.
 * Реализует паттерн "синглтон" для управления подключением.
 * @returns {Promise<mongoose>} Промис, который разрешается объектом mongoose.
 */
async function connectToDatabase() {
  if (cached.conn) {
    console.log("=> using cached database connection");
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Отключаем буферизацию команд
    };

    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
      throw new Error(
        'Please define the MONGODB_URI environment variable inside .env.local'
      );
    }

    console.log("=> using new database connection");
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase; 