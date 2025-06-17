module.exports = {
  mongodbMemoryServerOptions: {
    binary: {
      version: '7.0.5', // Используем ту же версию, что и в production
    },
    instance: {
      dbName: 'test', // Базовое имя для тестовых БД
    },
    // Каждая база данных будет иметь имя test_<workerId>_<случайное_число>
  },
}; 