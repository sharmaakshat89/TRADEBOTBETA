import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import connectDB from './config/db.config.js'
import authRoutes from './routes/auth.routes.js'
import { errorHandler, notFound } from './modules/auth/middleware/error.middleware.js'
import { setupMarketWS } from './modules/market/websocket/market.socket.js'
import signalRoutes from './modules/signal/routes/signal.routes.js'
import aiRoutes from './modules/ai/routes/ai.routes.js'
import backtestRoutes from './modules/backtesting/routes/backtest.routes.js'

dotenv.config()

const app = express()

app.use(helmet())
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))
app.use(morgan('dev'))
app.use(express.json())

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/backtest', backtestRoutes)
app.use('/api/v1/signal', signalRoutes)
app.use('/api/v1/ai', aiRoutes)

app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'WE ARE UP AND RUNNING :)',
        timestamp: new Date().toISOString()
    })
})

app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 5000

const startServer = async () => {
    try {
        await connectDB()

        const server = app.listen(PORT, () => {
            console.log(`Server running on port: ${PORT}`)
            console.log(`Environment: ${process.env.NODE_ENV}`)
        })

        setupMarketWS(server)
        return server
    } catch (error) {
        console.error(`startup failed: ${error.message}`)
        process.exit(1)
    }
}

const server = await startServer()

export default server
