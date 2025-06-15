# Инфраструктура и развертывание

## 1. Инфраструктура

### 1.1 Серверные ресурсы

| Ресурс               | Характеристики                                    |
| -------------------- | ------------------------------------------------- |
| **VPS (REG.RU)**     | Ubuntu 24.04 LTS, 2 vCPU / 2 GB RAM / 40 GB SSD   |
| **Публичный IP**     | 89.111.171.173                                    |
| **Домен**            | majesticmatchcenter.ru                            |
| **DNS**              | A → IP, CAA LetsEncrypt                           |
| **SSL**              | Let's Encrypt с автопродлением                     |

### 1.2 Docker Compose Stack

```
┌─────────────────────────────────────────────────────────┐
│                      Docker Host                        │
│                                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────┐ │
│  │  Nginx  │  │  App    │  │ MongoDB │  │ Redis       │ │
│  │ (proxy) │  │ (Next)  │  │ (data)  │  │ (cache/pub) │ │
│  └────┬────┘  └────┬────┘  └────┬────┘  └──────┬──────┘ │
│       │            │            │              │        │
│  ┌────┴────┐  ┌────┴────┐  ┌────┴────┐  ┌──────┴──────┐ │
│  │ Certbot │  │Scheduler│  │ Backups │  │ Monitoring  │ │
│  │  (SSL)  │  │(BullMQ) │  │ (dumps) │  │(Loki/Grafana)│ │
│  └─────────┘  └─────────┘  └─────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 1.3 Docker Compose конфигурация

```yaml
# docker-compose.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./configs/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./configs/sites:/etc/nginx/sites-enabled:ro
      - certbot-data:/etc/letsencrypt
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - web

  app:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/majesticmatchcenter
      - REDIS_URL=redis://redis:6379
      # Для большей безопасности пароль и ключи должны
      # передаваться через Docker Secrets в продакшене
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      - S3_ACCESS_KEY=${S3_ACCESS_KEY}
      - S3_SECRET_KEY=${S3_SECRET_KEY}
    depends_on:
      - mongodb
      - redis
    restart: unless-stopped
    networks:
      - web
      - data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/healthz"]

  mongodb:
    image: mongo:7
    volumes:
      - mongodb-data:/data/db
      - ./scripts/mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    command: mongod --wiredTigerCacheSizeGB 1
    restart: unless-stopped
    networks:
      - data
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    restart: unless-stopped
    networks:
      - data
    healthcheck:
      test: ["CMD", "redis-cli", "-p", "6379", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  scheduler:
    build:
      context: .
      dockerfile: Dockerfile.scheduler
    # Этот сервис запускается для регистрации повторяющихся задач в BullMQ
    # и должен завершиться после выполнения. Перезапуск только в случае сбоя.
    restart: on-failure
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/majesticmatchcenter
      - REDIS_URL=redis://redis:6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    depends_on:
      - mongodb
      - redis
    networks:
      - data

  certbot:
    image: certbot/certbot
    volumes:
      - certbot-data:/etc/letsencrypt
      - ./logs/certbot:/var/log/letsencrypt
    depends_on:
      - nginx
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
    networks:
      - web

  # ... другие сервисы, такие как backup, uptime-kuma, loki, grafana ...

volumes:
  mongodb-data:
  redis-data:
  certbot-data:

networks:
  web:
  data:
``` 