import express from 'express';
import cors from 'cors';
import joi from  'joi';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const userSchema = joi.object({
    name: joi.string().required()
});

const messagesSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid('message', 'private_message').required()
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
        await db.collection("messages").insertOne({from: name, 
                                                 to: 'Todos', 
                                                 text: 'entra na sala...', 
                                                 type: 'status', 
                                                 time: dayjs().format('HH:mm:ss')})
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

app.post("/messages", async (req, res) => {
    const {to, text, type} = req.body;
    const {user} = req.headers;

    const validation = messagesSchema.validate({to, text, type},{abortEarly: false});

    if(validation.error){
        return res.sendStatus(422);
    }

    try {
        const fromUser = await db.collection("participants").findOne({name: user});

        if(!fromUser){
            return res.sendStatus(422);
        }

        await db.collection("messages").insertOne({from: user, 
                                                   to, 
                                                   text,
                                                   type,
                                                   time: dayjs().format('HH:mm:ss')});
        return res.sendStatus(201);
        
    } catch (error) {
        return res.sendStatus(500);
    }
});

app.get("/messages", async (req, res) => {
    const limit = parseInt(req.query.limit);
    const { user } = req.headers;

    try {
        const messages = await db.collection("messages").find().toArray();
        const userMessages = messages.filter((message) => {
            const { to, type, from } = message;
            const toUser = to === user || to === "Todos" || from === user;
            const isPublic = type === "message"

            return toUser || isPublic;
        });

        if (limit) {
            res.send(userMessages.slice(-limit));
        }

        res.send(userMessages);

    } catch (error) {
        res.sendStatus(500);
    }
});

app.post("/status", async (req, res) => {
    const {user} = req.headers;

    try{
        const hasUser = await db.collection("participants").findOne({name: user});

        if(!hasUser){
            return res.sendStatus(404);
        }

        await db.collection("participants").updateOne({name: user},{$set: {lastStatus: Date.now()}})

        res.sendStatus(200);

    }catch(error){
        return res.sendStatus(500);
    }
});

app.delete("/messages/:id", async (req, res) => {
    const {user} = req.headers;
    const {id} = req.params;
    
    try{
        const message = await db.collection("messages").findOne({_id: new ObjectId(id)});

        if(!message){
            return res.sendStatus(404);
        }

        if(message.from !== user){
            return res.sendStatus(401);
        }

        await db.collection("messages").deleteOne({_id: new ObjectId(id)});
        return res.sendStatus(200);
    }catch(error){
        return res.sendStatus(500);
    }
})

setInterval(async() => {
    const seconds = Date.now() - 10000;

    try{
    const inativePartcipants = await db.collection("participants").find({lastStatus: {$lte: seconds}}).toArray();
    
    if(inativePartcipants.length > 0){
        const inativeMessage = inativePartcipants.map( inativo => {
            return {
                from: inativo.name,
                to: "Todos",
                Text: "sai da sala...",
                type: "status",
                time: dayjs().format("HH:mm:ss")
            };
        });

        await db.collection("messages").insertMany(inativeMessage);
        await db.collection("participants").deleteMany({lastStatus: {$lte: seconds}});
    }
   }catch(error){
        return res.sendStatus(500);
    }
},15000);

app.listen(5000, () => console.log('listening on port 5000'));