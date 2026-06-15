# Deploy Guidelines — BRACKET

## Safe Deploy Window
Deploy AMAN antara jam **00:15 – 22:45 UTC**.

HINDARI deploy di window berikut:
- **22:45 – 23:05 UTC** — autoCloseBetting cron (23:00 UTC)
- **00:00 – 00:15 UTC** — autoSettle + scheduledDailyMarket cron (00:01 UTC)

## Checklist Sebelum Deploy
- [ ] Tidak ada market dalam proses settlement
- [ ] Deploy backend dulu, tunggu Railway healthy, baru frontend
- [ ] Monitor Railway logs 5 menit setelah deploy

## Emergency
Kalau terpaksa deploy di window cron:
1. Pause contract via admin panel
2. Deploy
3. Unpause contract
