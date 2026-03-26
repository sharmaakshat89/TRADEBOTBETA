

import { getSignal as getQuantSignal, buildLadderIndicators } from "../../trading/services/quant.service.js";

import { fetchMarketData } from "../../market/services/market.service.js";
import { validateSymbolAndInterval } from "../../market/market.constants.js";

export const getSignal = async(req,res)=>{

    try{
        const {symbol,interval}=req.query //taking from query params,because the GET req wont have a req.body
        //something like req.query= {symbol: 'EUR/USD', interval: '1h' }

/*Frontend → Backend    (data BHEJNA — query params, body)
Backend  → Frontend   (data BHEJNA — response) */

        const { symbol: cleanSymbol, interval: cleanInterval } = validateSymbolAndInterval(symbol, interval)

        const marketData = await fetchMarketData(cleanSymbol,cleanInterval)
            //fetching candles from api

        if(!marketData.success){
            return res.status(503).json({ //service unavailable
                    success:false,
                    message:'MARKET DATA UNAVAILABLE'
            })
        }
        
        const candles = marketData.data;
        const indicators = buildLadderIndicators(candles);
        const signal = getQuantSignal(candles, indicators, candles.length - 1);

        if(!signal.success){
            return res.status(422).json({
                success:false,
                message:signal.error // 422 means unprocessable, either insuff data or couldn't be processed
            })
        }
        return res.status(200).json({
            success:true,
            data:{
                ...signal,
                symbol: cleanSymbol,
                interval: cleanInterval,
                currentPrice: marketData.data.at(-1)?.close ?? null,
                candles: marketData.data
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
