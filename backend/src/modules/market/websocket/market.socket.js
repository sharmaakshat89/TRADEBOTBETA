import { WebSocketServer } from 'ws';
import { fetchMarketData } from '../services/market.service.js';

export const setupMarketWS = (server) => {
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws) => {
        console.log('Real time Stream Active');

        ws.subscribedSymbol = 'BTC/USDT';
        ws.subscribedInterval = '1h';

        ws.on('message', (message) => {
            try {
                const payload = JSON.parse(message.toString());
                if (payload.type === 'SUBSCRIBE' && payload.symbol) {
                    ws.subscribedSymbol = payload.symbol.toUpperCase();
                    ws.subscribedInterval = payload.interval || '1h';
                    console.log(ws.subscribedSymbol, ws.subscribedInterval);
                }
            } catch (err) {
                console.error('Wrong subscription request');
            }
        });

        const heartbeat = setInterval(() => {
            if (ws.readyState === 1) ws.ping();
        }, 30000);

        ws.on('close', () => {
            clearInterval(heartbeat);
            console.log('Client disconnected');
        });
    });

    const broadcastTargetedUpdates = async () => {
        const activeSubscriptions = new Set();

        wss.clients.forEach((client) => {
            if (client.readyState === 1) {
                activeSubscriptions.add(`${client.subscribedSymbol}|${client.subscribedInterval}`);
            }
        });

        for (const sub of activeSubscriptions) {
            const [symbol, interval] = sub.split('|');

            try {
                const result = await fetchMarketData(symbol, interval);

                if (result.success) {
                    const payload = JSON.stringify({
                        type: 'CANDLE_DATA',
                        symbol,
                        data: result.data
                    });

                    wss.clients.forEach((client) => {
                        if (
                            client.readyState === 1 &&
                            client.subscribedSymbol === symbol &&
                            client.subscribedInterval === interval
                        ) {
                            client.send(payload);
                        }
                    });
                }
            } catch (err) {
                console.error('BROADCAST ERROR:', err.message);
            }
        }
    };

    setInterval(() => {
        broadcastTargetedUpdates();
    }, 60000);

    return wss;
};
