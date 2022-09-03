import express from 'express';
import cors from 'cors';
import joi from  'joi';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const userSchema = joi.object({
    name: joi.string().required()
});

const mongoClient = new MongoClient(process.env.MONGO_URI)
let db;

mongoClient.connect().then(() => {
    db = mongoClient.db("batepapo_uol");
});

app.post("/participants", async (req,res) => {
    const {name} = req.body;
    
    const validation = userSchema.validate({name}, {abortEarly: false});
        
   
    if(validation.error){
        res.status(422).send(validation.error.message);
        return;
    }

    try{
        const sameParticipant = await db.collection("participants").findOne({name: name});

        if(sameParticipant){
            return res.sendStatus(409);
        }

        await db.collection("participants").insertOne({name, lastStatus: Date.now()});
        return res.sendStatus(201);

    } catch(error){
        return res.sendStatus(500);
    }
    
});

app.get("/participants", async (req, res) => {
    try{
        const partcipantes = await db.collection("participants").find().toArray();
        return res.send(partcipantes);
    }catch(error){
        return res.sendStatus(500);    }
})


app.listen(5000, () => console.log('listening on port 5000'));