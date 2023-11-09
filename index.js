const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const cors = require('cors');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
const logger = async(req, res, next) => {
    console.log('called' ,req.host, req.originalUrl);
    next()
}

const verifyToken = async(req, res, next) => {
    const token = req.cookies?.token;
    console.log('value of token in middleware',token);
    if(!token) {
        return res.status(401).send({message: 'Not Authorized'});
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET,(err, decoded) => {
        // error
        if(err){
            console.log(err);
            return res.status(401).send({message: 'unauthorized'})
        }


        // if token is valid then it would be decoded
        console.log('value in the token', decoded);
        req.user = decoded;
         next()
    })
   
}




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.g9rirok.mongodb.net/?retryWrites=true&w=majority`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();



        // const foodCollection = client.db('dinaDB').collection('foodItems');
        const foodCollections = client.db('dinaDB').collection('foodItem');
        const userCollections = client.db('dinaDB').collection('user');
        const addedFoodCollections = client.db('dinaDB').collection('addedFood');
        const purchaseCollections = client.db('dinaDB').collection('purchaseFoods');


        // auth (jwt) related api
        app.post('/jwt', logger,  async(req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
            console.log(user);
            res
            .cookie('token' , token , {
                httpOnly: true,
                secure: false
            })
            .send({success: true})
        })
        // auth (jwt) related api

        // purchase api
        app.get('/purchaseFood' , verifyToken,  async(req, res) => {
            console.log(req.query.email);
            // console.log('tok tok token', req.cookies.token);
            console.log('user in the valid token' , req.user);
            if(req.query.email !== req.user.email){
                return res.status(403).send({message: 'Forbidden'})
            }
            let query = {}
            if(req.query?.email){
                query= {email: req.query.email}
            }
            const result = await purchaseCollections.find(query).toArray();
            res.send(result)
        })


        app.post('/purchaseFood' , async(req, res) => {
            const purchaseFood = req.body;
            console.log(purchaseFood);
            const result = await purchaseCollections.insertOne(purchaseFood);
            res.send(result)

        })

        app.delete('/purchaseFood/:id', async(req,res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await purchaseCollections.deleteOne(query);
            res.send(result)
        })
        // purchase api

        // add food api

        app.get('/addFood', async (req, res) => {
            const cursor = addedFoodCollections.find();
            const result = await cursor.toArray();
            res.send(result)
        })

        app.post('/addFood', async (req, res) => {
            const newFood = req.body;
            console.log(newFood);
            const result = await addedFoodCollections.insertOne(newFood);
            res.send(result)
        })


        // add food api

        // experiment on single page food
        app.get('/foodItems/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await foodCollections.findOne(query);
            res.send(result);
        })
        // experiment on single page food


        app.get('/foodItems', async (req, res) => {
            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);
            console.log('pagination query', page, size);
            const result = await foodCollections.find()
                .skip(page * size)
                .limit(size)
                .toArray()

            res.send(result)

        })
        // for pagination

        app.get('/foodItemsCount', async (req, res) => {
            const count = await foodCollections.estimatedDocumentCount();
            res.send({ count })
        })
        // for pagination

        // user related api

        app.post('/user', async (req, res) => {
            const user = req.body;
            console.log(user);

            const result = await userCollections.insertOne(user)
            res.send(result)

        })

        app.get('/user', async (req, res) => {
            const cursor = userCollections.find();
            const user = await cursor.toArray();
            res.send(user)
        })

        // user related api

        // delete api
        app.delete('/addFood/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await addedFoodCollections.deleteOne(query);
            res.send(result)
        })
        // delete api

        // update api
        app.get('/addFood/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await addedFoodCollections.findOne(query);
            res.send(result)
        })



        app.put('/addFood/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true }
            const updatedFood = req.body
            const food = {
                $set: {
                    name: updatedFood.name,
                    category: updatedFood.category,
                    image: updatedFood.image,
                    origin: updatedFood.origin,
                    price: updatedFood.price,
                    madeBy: updatedFood.madeBy,
                    description: updatedFood.description

                }
            }
            const result = await addedFoodCollections.updateOne(filter, food, options);
            res.send(result)
        })
        // update api


        // purchase api
        app.get('/foodItems/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };

            const options = {
                projection: { price: 1, foodName: 1, foodImage: 1, foodCategory: 1 , shortDescrip : 0},
            };
            const result = await foodCollections.findOne(query, options);
            res.send(result);



        })
        // purchase api











   











        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('DINA restaurant server is running ')
})

app.listen(port, () => {
    console.log(`Dina is running on port ${port}`);
})