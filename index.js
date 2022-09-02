import express from 'express';
import cors from 'cors';
import joi from  'joi';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI)
let db;

mongoClient.connect().then(() => {
    db = mongoClient.db("batepapo_uol");
});

app.post("/participants", async (req,res) => {
    const {name} = req.body;
    const userSchema = joi.object({
        name: joi.string().required()
    });
    const validation = userSchema.validate(name, {abortEarly: true});
   
    if(validation.error){
        console.log(validation.error.details);
        res.status(422).send(validation.error.message);
        return;
    }

    try{
        await db.collection("participants").insertOne({name, lastStatus: Date.now()});
        res.sendStatus(201);

    } catch(error){
        res.sendStatus(422);
    }
    
});



app.listen(5000, () => console.log('listening on port 5000'));