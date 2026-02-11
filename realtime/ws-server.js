const http = require('http');
const { WebSocketServer } = require('ws');

const port = Number(process.env.REALTIME_WS_PORT || 8090);
const wsPath = process.env.REALTIME_WS_PATH || '/ws';
const publishPath = process.env.REALTIME_WS_PUBLISH_PATH || '/publish';
const secret = process.env.REALTIME_WS_SECRET || '';

const sockets = new Set();

function sendJson(ws, payload) {
    if (ws.readyState !== ws.OPEN) return;
    ws.send(JSON.stringify(payload));
}

function broadcast(payload) {
    const text = JSON.stringify(payload);
    for (const ws of sockets) {
        if (ws.readyState !== ws.OPEN) continue;
        ws.send(text);
    }
}

function unauthorized(res) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, message: 'Unauthorized' }));
}

function notFound(res) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, message: 'Not Found' }));
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', (chunk) => {
            raw += chunk;
            if (raw.length > 1024 * 1024) {
                reject(new Error('Body too large'));
                req.destroy();
            }
        });
        req.on('end', () => resolve(raw));
        req.on('error', reject);
    });
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname;

    if (req.method === 'GET' && path === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, clients: sockets.size }));
        return;
    }

    if (req.method === 'POST' && path === publishPath) {
        if (secret) {
            const header = String(req.headers.authorization || '');
            const expected = `Bearer ${secret}`;
            if (header !== expected) {
                unauthorized(res);
                return;
            }
        }

        try {
            const raw = await readBody(req);
            const payload = raw ? JSON.parse(raw) : null;
            if (!payload || typeof payload !== 'object') {
                res.writeHead(422, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, message: 'Invalid JSON body' }));
                return;
            }

            broadcast(payload);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, broadcasted: sockets.size }));
            return;
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, message: error.message || 'Server error' }));
            return;
        }
    }

    notFound(res);
});

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws, req) => {
    sockets.add(ws);

    sendJson(ws, {
        event: 'connected',
        data: {
            wsPath,
            serverTime: new Date().toISOString(),
        },
    });

    ws.on('close', () => sockets.delete(ws));
    ws.on('error', () => sockets.delete(ws));
});

server.on('upgrade', (req, socket, head) => {
    try {
        const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        if (url.pathname !== wsPath) {
            socket.destroy();
            return;
        }

        wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, req);
        });
    } catch (_error) {
        socket.destroy();
    }
});

server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[realtime] WebSocket server listening on :${port} (ws: ${wsPath}, publish: ${publishPath})`);
});

