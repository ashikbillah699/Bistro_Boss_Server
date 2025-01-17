const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.j8csd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    const menuCollection = client.db('bistroDB').collection('menu');
    const reviewCollection = client.db('bistroDB').collection('reviews');
    const cartCollection = client.db('bistroDB').collection('carts');

    // get all menu
    app.get('/menu',async(req, res)=>{
        const result = await menuCollection.find().toArray();
        res.send(result);
    })

    // get All reviews
    app.get('/reviews',async(req, res)=>{
        const result = await reviewCollection.find().toArray();
        res.send(result);
    })

    // get All carts data
    app.get('/carts', async(req, res)=>{
      const email = req.query.email;
      const query = {email: email};
      const result = await cartCollection.find(query).toArray();
      res.send(result)
    })

    // insert a cart
    app.post('/cart', async(req, res)=>{
      const reciveData = req.body;
      const result = await cartCollection.insertOne(reciveData)
      res.send(result)
    })

    // delete a cart
    app.delete('/cart/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    })
   
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res)=>{
    res.send('Bistro boos server');
})

app.listen(port, ()=>{
    console.log(`Bistro boss running in port ${port}`)
})