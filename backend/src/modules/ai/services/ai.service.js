import { GoogleGenerativeAI } from '@google/generative-ai';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const aiCache = new NodeCache({ stdTTL: 3600 });

const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    systemInstruction: `
You are a concise crypto market analyst validating a quantitative Binance Futures signal for spot execution.
You will receive:
- A quant signal (BUY, SELL, NO_TRADE)
- Regime, score, context, and indicator snapshot
- Recent Binance Futures candles with volume context

Rules:
- Return BUY, SELL, or NO_TRADE
- State if you agree or disagree with the quant signal
- Keep reasoning under 5 lines
- Mention funding or trend risk when relevant
- If the setup is mixed or weak, prefer NO_TRADE
`
});

const extractSignal = (text) => {
    const upperText = text.toUpperCase();
    if (upperText.includes('NO_TRADE') || upperText.includes('NO TRADE')) return 'NO_TRADE';
    if (upperText.includes('BUY')) return 'BUY';
    if (upperText.includes('SELL')) return 'SELL';
    return 'NO_TRADE';
};

export const getAIValidation = async (symbol, interval, quantSignal, indicators, candles) => {
    const cacheKey = `ai_${symbol}_${interval}_${quantSignal.signal}_${quantSignal.score}`;

    try {
        const cachedResponse = aiCache.get(cacheKey);
        if (cachedResponse) {
            return { success: true, data: cachedResponse, source: 'cache' };
        }

        const recentCandles = candles.slice(-20);
        const prompt = `
Analyze this crypto market setup:

SYMBOL: ${symbol}
TIMEFRAME: ${interval}
SIGNAL SOURCE: Binance Futures candles
EXECUTION LAYER: Spot

QUANT SIGNAL: ${quantSignal.signal}
QUANT SCORE: ${quantSignal.score}
REGIME: ${quantSignal.regime}
CONTEXT PHI: ${quantSignal.context?.phi}
STOP LOSS: ${quantSignal.risk?.stopLoss}
TAKE PROFIT: ${quantSignal.risk?.takeProfit}

INDICATORS:
- EMA50: ${indicators.ema50}
- RSI14: ${indicators.rsi}
- ADX14: ${indicators.adx}
- ATR14: ${indicators.atr14}
- ATR50: ${indicators.atr50}
- Structure: ${indicators.structure}
- Funding Rate: ${indicators.fundingRate}

RECENT CANDLES:
${recentCandles
    .map(
        (candle, index) =>
            `Candle ${index + 1}: O:${candle.open} H:${candle.high} L:${candle.low} C:${candle.close} V:${candle.volume} TBV:${candle.takerBuyBaseVolume} F:${candle.fundingRate}`
    )
    .join('\n')}

Give your independent signal, agreement status, and concise reasoning.
`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const aiSignal = extractSignal(responseText);
        const aiResponse = {
            aiSignal,
            reasoning: responseText,
            agreesWithQuant: aiSignal === quantSignal.signal,
            timestamp: Date.now()
        };

        aiCache.set(cacheKey, aiResponse);
        return { success: true, data: aiResponse, source: 'api' };
    } catch (err) {
        console.error('AI SERVICE ERROR:', err.message);
        return { success: false, error: 'ai validation unavailable' };
    }
};
