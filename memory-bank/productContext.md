# Product Context

Основу продукта составляют несколько ключевых сущностей. **Турнир (Tournament)** является центральным событием, которое может быть как "семейным" (для постоянных команд), так и "командным" (для временных объединений игроков). В рамках турнира проводятся **Карты (Map)** — отдельные игровые сессии, по результатам которых начисляется статистика.

Участники системы — это **Игроки (Player)**, которые могут объединяться в **Семьи (Family)**, представляющие собой постоянные команды с историей и рейтингом. Для командных турниров игроки могут формировать временные команды. Система также включает сущность **Новостей (News)** для информирования сообщества и **Шаблоны (Templates)** для стандартизации создания турниров и карт.

Бизнес-процессы включают автоматическую активацию турниров и карт по расписанию, инкрементальное обновление статистики для избежания ресурсоемких пересчетов и гибкое управление участниками. Важно отметить, что бизнес-логика находится в процессе постоянного улучшения, и текущие решения могут быть пересмотрены. 