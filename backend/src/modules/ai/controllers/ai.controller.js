import { getAIValidation } from "../services/ai.service.js";
import { fetchMarketData } from "../../market/services/market.service.js";
import { validateSymbolAndInterval } from "../../market/market.constants.js";
import { buildLadderIndicators, getSignal } from "../../trading/services/quant.service.js";

const AI_OUTPUTSIZE = 240;

export const getAIAnalysis = async (req, res) => {
    try {
        const { symbol, interval } = req.body;
        const { symbol: cleanSymbol, interval: cleanInterval } = validateSymbolAndInterval(
            symbol,
            interval
        );

        const marketData = await fetchMarketData(cleanSymbol, cleanInterval, AI_OUTPUTSIZE);

        if (!marketData.success) {
            return res.status(503).json({
                success: false,
                message: 'Market data unavailable for AI analysis'
            });
        }

        const indicators = buildLadderIndicators(marketData.data);
        const quantSignal = getSignal(marketData.data, indicators, marketData.data.length - 1, {
            positionKey: `${cleanSymbol}_${cleanInterval}`
        });

        if (!quantSignal.success) {
            return res.status(422).json({
                success: false,
                message: 'INSUFF DATA FOR ANALYSIS'
            });
        }

        const aiResult = await getAIValidation(
            cleanSymbol,
            cleanInterval,
            quantSignal,
            {
                ...quantSignal.indicators,
                ema9: quantSignal.indicators?.fast ?? null,
                ema11: quantSignal.indicators?.medium ?? null,
                ema45: quantSignal.indicators?.trend ?? null,
                adr: quantSignal.indicators?.atr14 ?? null
            },
            marketData.data
        );

        if (!aiResult.success) {
            return res.status(503).json({
                success: false,
                message: aiResult.error
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                quantSignal: {
                    signal: quantSignal.signal,
                    score: quantSignal.score,
                    risk: quantSignal.risk,
                    indicators: {
                        ...quantSignal.indicators,
                        ema9: quantSignal.indicators?.fast ?? null,
                        ema11: quantSignal.indicators?.medium ?? null,
                        ema45: quantSignal.indicators?.trend ?? null,
                        adr: quantSignal.indicators?.atr14 ?? null
                    }
                },
                aiValidation: {
                    aiSignal: aiResult.data.aiSignal,
                    reasoning: aiResult.data.reasoning,
                    agreesWithQuant: aiResult.data.agreesWithQuant,
                    source: aiResult.source,
                    headlines: aiResult.data.headlines ?? []
                }
            }
        });
    } catch (err) {
        console.error(`AI Controller err:${err.message}`);
        return res.status(err.statusCode || 500).json({
            success: false,
            error: err.message || 'INTERNAL SERVER ERROR',
            allowedSymbols: err.allowedSymbols,
            allowedIntervals: err.allowedIntervals
        });
    }
};
