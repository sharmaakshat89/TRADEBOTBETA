

import { getSignal as getQuantSignal, buildLadderIndicators } from "../../trading/services/quant.service.js";

import { fetchMarketData } from "../../market/services/market.service.js";
import { validateSymbolAndInterval } from "../../market/market.constants.js";
import { buildExecutionSignal } from "../services/execution.service.js";

const SIGNAL_OUTPUTSIZE = 240;

export const getSignal = async(req,res)=>{

    try{
        const {symbol,interval}=req.query //taking from query params,because the GET req wont have a req.body
        //something like req.query= {symbol: 'EUR/USD', interval: '1h' }

/*Frontend → Backend    (data BHEJNA — query params, body)
Backend  → Frontend   (data BHEJNA — response) */

        const { symbol: cleanSymbol, interval: cleanInterval } = validateSymbolAndInterval(symbol, interval)

        const marketData = await fetchMarketData(cleanSymbol,cleanInterval,SIGNAL_OUTPUTSIZE)
            //fetching candles from api

        if(!marketData.success){
            return res.status(503).json({ //service unavailable
                    success:false,
                    message:'MARKET DATA UNAVAILABLE'
            })
        }
        
        const candles = marketData.data;
        const indicators = buildLadderIndicators(candles);
        const quantSignal = getQuantSignal(candles, indicators, candles.length - 1);

        if(!quantSignal.success){
            return res.status(422).json({
                success:false,
                message: quantSignal.error || `Insufficient processed data for ${cleanSymbol} ${cleanInterval}. Need at least 150 fully warmed candles.`
            })
        }
        const signal = buildExecutionSignal(
            quantSignal,
            candles,
            indicators,
            `${cleanSymbol}_${cleanInterval}`
        );
        return res.status(200).json({
            success:true,
            data:{
                ...signal,
                symbol: cleanSymbol,
                interval: cleanInterval,
                currentPrice: marketData.data.at(-1)?.close ?? null,
                candles: marketData.data,
                indicatorSeries: {
                    ema9: indicators?.modes?.EMA?.fast ?? [],
                    ema11: indicators?.modes?.EMA?.medium ?? [],
                    ema45: indicators?.modes?.EMA?.trend ?? []
                }
            }
        })

    }
    catch(err){
        console.error(`SIGNAL CONTROLLER ERR: ${err.message}`)
        return res.status(err.statusCode || 500).json({
            success: false,
            error: err.message || 'Internal Server Error',
            allowedSymbols: err.allowedSymbols,
            allowedIntervals: err.allowedIntervals
        })
    }



}
