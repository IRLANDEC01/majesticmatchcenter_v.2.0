import { QueueEvents } from 'bullmq'
import { getBackgroundRedisClient } from '../src/lib/redis-clients'

const connection = getBackgroundRedisClient()
const queueEvents = new QueueEvents('search-sync', { connection })

queueEvents.on('completed', ({ jobId }) =>
  console.log(`[search-sync] ✅ completed: ${jobId}`),
)

queueEvents.on('failed', ({ jobId, failedReason }) =>
  console.error(`[search-sync] ❌ failed: ${jobId}`, failedReason),
)

queueEvents.on('stalled', ({ jobId }) =>
  console.warn(`[search-sync] ⚠️ stalled: ${jobId}`),
)

queueEvents.waitUntilReady().then(() =>
  console.log('[QueueEvents] 🚀 Listening for queue events on "search-sync"...')
)

// Graceful shutdown
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, async () => {
    console.log('[QueueEvents] Shutdown signal received. Closing connections...')
    await queueEvents.close()
    await connection.quit()
    console.log('[QueueEvents] Connections closed. Exiting.')
    process.exit(0)
  })
} 