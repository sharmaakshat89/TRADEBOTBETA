import mongoose, { connect } from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const connectDB= async()=>{
    try{
        mongoose.set('bufferCommands', false)
        // fail fast when DB is unavailable instead of buffering queries forever

        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000
        })
        // cap initial DB handshake wait so startup errors surface quickly
        console.log('connected to database')
    }
    catch(err){
        console.log(`error:${err}`)
    }
}

export default connectDB
