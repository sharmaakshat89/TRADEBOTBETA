import { getAIValidation } from "../services/ai.service.js";
import { fetchMarketData } from "../../market/services/market.service.js";
import { validateSymbolAndInterval } from "../../market/market.constants.js";
import { getUnifiedSignal } from "../../trading/services/quant.service.js";

export const getAIAnalysis = async (req, res) => {
    try {
        const { symbol, interval } = req.body;
        const { symbol: cleanSymbol, interval: cleanInterval } = validateSymbolAndInterval(
            symbol,
            interval
        );

        const marketData = await fetchMarketData(cleanSymbol, cleanInterval);

        if (!marketData.success) {
            return res.status(503).json({
                success: false,
                message: 'Market data unavailable for AI analysis'
            });
        }

        const quantSignal = getUnifiedSignal(cleanSymbol, cleanInterval, marketData.data);

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
            quantSignal.indicators,
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
                    indicators: quantSignal.indicators
                },
                aiValidation: {
                    aiSignal: aiResult.data.aiSignal,
                    reasoning: aiResult.data.reasoning,
                    agreesWithQuant: aiResult.data.agreesWithQuant,
                    source: aiResult.source
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
