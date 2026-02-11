# Realtime Stock (Self-host WebSocket)

เป้าหมาย: หลายเครื่องเห็นสต๊อกเปลี่ยน “ทันที” โดยไม่ต้อง polling

## ภาพรวม

- รัน WebSocket server (Node) ไว้ที่เครื่องเดียวกับ backend
- Backend (Laravel) จะ POST แจ้ง event ไปที่ WebSocket server เมื่อมีการ stock in/out หรือ sync สำเร็จ
- Client (Electron) เปิด WebSocket แล้วพอได้รับ `stock.changed` ก็ refresh หน้าจอทันที

## 1) รัน WebSocket server

ติดตั้งและรันที่ root ของโปรเจกต์:

```bash
npm install
npm run realtime-server
```

ตั้งค่า (optional):

- `REALTIME_WS_PORT` (default `8090`)
- `REALTIME_WS_SECRET` (แนะนำให้ตั้ง) ใช้เป็น Bearer token ตอน publish

ตรวจสอบสุขภาพ:

- `GET http://127.0.0.1:8090/health`

## 2) ตั้งค่า backend ให้ publish event

เพิ่มใน `backend/.env`:

```env
REALTIME_WS_PUBLISH_URL=http://127.0.0.1:8090/publish
REALTIME_WS_SECRET=change-me
REALTIME_WS_TIMEOUT_SECONDS=1
```

Backend จะ publish อัตโนมัติจาก:

- `backend/app/Http/Controllers/SyncController.php`
- `backend/app/Http/Controllers/StockController.php`

Event format:

```json
{
  "event": "stock.changed",
  "data": {
    "product_ids": [1, 2, 3],
    "at": "2026-02-10T00:00:00Z",
    "meta": { "source": "sync" }
  }
}
```

## 3) ให้ client connect

Electron UI จะ connect ไปที่:

- `ws://<backend-host>:8090/ws`

โดย derivation จาก `backendUrl` ใน `config.json`

Override ได้:

- `config.json`: `realtimeWsUrl` หรือ `realtimeWsPort`
- env: `REALTIME_WS_URL`

