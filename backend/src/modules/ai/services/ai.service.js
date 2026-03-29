import { GoogleGenerativeAI } from '@google/generative-ai';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const aiCache = new NodeCache({ stdTTL: 1800 });
const newsCache = new NodeCache({ stdTTL: 900 });

const NEWS_QUERY_BY_SYMBOL = {
	'BTC/USDT': 'Bitcoin OR BTC cryptocurrency',
	'ETH/USDT': 'Ethereum OR ETH cryptocurrency',
	'SOL/USDT': 'Solana OR SOL cryptocurrency',
	'BNB/USDT': 'BNB OR Binance Coin cryptocurrency'
};

const model = genAI.getGenerativeModel({
	model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
	systemInstruction: `
You are a concise crypto market analyst validating a quantitative Binance Futures signal for spot execution.
You will receive:
- A summary of the active quant engine logic
- The latest quant signal and indicator snapshot
- Recent Binance Futures candles
- Recent coin-specific crypto news headlines from a free live news feed

Rules:
- Return BUY, SELL, or NO_TRADE
- State if you agree or disagree with the quant signal
- Use the quant logic and the headlines together
- Mention when the strategy is long-only and therefore should stay flat instead of forcing a SELL
- Keep reasoning under 6 short lines
- If the setup is mixed or weak, prefer NO_TRADE
`
});

const decodeEntities = (value = '') =>
	value
		.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");

const extractTag = (source, tag) => {
	const match = source.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
	return decodeEntities(match?.[1]?.trim() ?? '');
};

const normalizeHeadline = (item) => ({
	title: extractTag(item, 'title'),
	link: extractTag(item, 'link'),
	publishedAt: extractTag(item, 'pubDate'),
	source: extractTag(item, 'source') || 'Google News'
});

const fetchCoinHeadlines = async (symbol) => {
	const cacheKey = `news_${symbol}`;
	const cachedHeadlines = newsCache.get(cacheKey);
	if (cachedHeadlines) return cachedHeadlines;

	const query = NEWS_QUERY_BY_SYMBOL[symbol] ?? `${symbol.replace('/USDT', '')} cryptocurrency`;
	const feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;

	try {
		const response = await fetch(feedUrl, {
			headers: { 'User-Agent': 'Mozilla/5.0 YuktiTradebot/1.0' },
			signal: AbortSignal.timeout(5000)
		});

		if (!response.ok) {
			throw new Error(`news feed failed with ${response.status}`);
		}

		const xml = await response.text();
		const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)]
			.slice(0, 3)
			.map((match) => normalizeHeadline(match[1]))
			.filter((headline) => headline.title);

		newsCache.set(cacheKey, items);
		return items;
	} catch (error) {
		console.error('AI NEWS FETCH ERROR:', error.message);
		return [];
	}
};

const extractSignal = (text) => {
	const upperText = text.toUpperCase();
	if (upperText.includes('NO_TRADE') || upperText.includes('NO TRADE')) return 'NO_TRADE';
	if (upperText.includes('SELL')) return 'SELL';
	if (upperText.includes('BUY')) return 'BUY';
	return 'NO_TRADE';
};

const buildPrompt = (symbol, interval, quantSignal, indicators, candles, headlines) => {
	const recentCandles = candles.slice(-20);
	const newsBlock = headlines.length
		? headlines
				.map(
					(headline, index) =>
						`${index + 1}. ${headline.title} | ${headline.source} | ${headline.publishedAt}`
					)
				.join('\n')
		: 'No recent headlines were available from the live news feed.';

	return `
Analyze this crypto market setup:

SYMBOL: ${symbol}
TIMEFRAME: ${interval}
SIGNAL SOURCE: Binance Futures candles
EXECUTION LAYER: Spot

ACTIVE QUANT ENGINE LOGIC:
- Warmup requires 150 candles
- Primary mode here uses EMA 9, EMA 11, and EMA 45
- Regime requires ADX strength plus trend slope relative to ATR median
- Entry is long-only: BUY when price is above EMA45, EMA9 is above EMA11, upward momentum is strong, or a breakout above the previous high occurs
- No dedicated short entry exists in this engine, so bearish conditions should often resolve to NO_TRADE rather than forced SELL
- Risk uses ATR-based stop loss and 3x to 4x ATR take profit with a 9-candle time stop

QUANT SIGNAL:
- Signal: ${quantSignal.signal}
- Confidence Score: ${quantSignal.score}
- Regime: ${quantSignal.regime}
- Context Phi: ${quantSignal.context?.phi}
- Stop Loss: ${quantSignal.risk?.stopLoss}
- Take Profit: ${quantSignal.risk?.takeProfit}

INDICATORS:
- EMA 9: ${indicators.ema9}
- EMA 11: ${indicators.ema11}
- EMA 45: ${indicators.ema45}
- ADX 14: ${indicators.adx}
- ADR/ATR 14: ${indicators.adr ?? indicators.atr14}

RECENT CANDLES:
${recentCandles
	.map(
		(candle, index) =>
			`Candle ${index + 1}: O:${candle.open} H:${candle.high} L:${candle.low} C:${candle.close} V:${candle.volume} TBV:${candle.takerBuyBaseVolume} F:${candle.fundingRate}`
	)
	.join('\n')}

RECENT COIN NEWS:
${newsBlock}

Return:
1. Independent signal: BUY, SELL, or NO_TRADE
2. Agreement status with the quant engine
3. Brief reasoning that references both price structure and the news context
`;
};

export const getAIValidation = async (symbol, interval, quantSignal, indicators, candles) => {
	const cacheKey = `ai_${symbol}_${interval}_${quantSignal.signal}_${quantSignal.score}_${quantSignal.timestamp}`;

	try {
		const cachedResponse = aiCache.get(cacheKey);
		if (cachedResponse) {
			return { success: true, data: cachedResponse, source: 'cache' };
		}

		const headlines = await fetchCoinHeadlines(symbol);
		const prompt = buildPrompt(symbol, interval, quantSignal, indicators, candles, headlines);
		const result = await model.generateContent(prompt);
		const responseText = result.response.text();
		const aiSignal = extractSignal(responseText);

		const aiResponse = {
			aiSignal,
			reasoning: responseText,
			agreesWithQuant: aiSignal === quantSignal.signal,
			headlines,
			timestamp: Date.now()
		};

		aiCache.set(cacheKey, aiResponse);
		return { success: true, data: aiResponse, source: 'api' };
	} catch (err) {
		console.error('AI SERVICE ERROR:', err.message);
		return { success: false, error: 'ai validation unavailable' };
	}
};
