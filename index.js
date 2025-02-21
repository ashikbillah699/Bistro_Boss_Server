const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

// middleware
app.use(express.static('public'));
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

    // collections
    const userCollection = client.db('bistroDB').collection('users');
    const menuCollection = client.db('bistroDB').collection('menu');
    const reviewCollection = client.db('bistroDB').collection('reviews');
    const cartCollection = client.db('bistroDB').collection('carts');
    const paymentCollection = client.db('bistroDB').collection('payment');

    // middleware jwt
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access!!' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECURE, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access!!' })
        }
        req.decoded = decoded;
        next()
      })
    }

    // verify Admin middleware
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { userEmail: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbbiden access!!' })
      }
      next()
    }

    // jwt releted api
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECURE, { expiresIn: '1h' });
      res.send({ token });
    })

    // get user for admin
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbbiden access!!' })
      }
      const query = { userEmail: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin'
      }
      res.send({ admin });
    })

    // get all menu
    app.get('/menu', async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    })

    // get menu specific item
    app.get('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollection.findOne(query);
      res.send(result)
    })

    // get All reviews
    app.get('/reviews', async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    })

    // get All Users data
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    // get All carts data
    app.get('/carts', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result)
    })

    // insert a cart
    app.post('/cart', async (req, res) => {
      const reciveData = req.body;
      const result = await cartCollection.insertOne(reciveData);
      res.send(result);
    })

    // add menu items
    app.post('/menu', verifyToken, verifyAdmin, async (req, res) => {
      const menuData = req.body;
      const result = await menuCollection.insertOne(menuData);
      res.send(result);
    })

    // post user data
    app.post('/user', async (req, res) => {
      const userData = req.body;
      const query = { userEmail: userData.userEmail }
      const existingEmail = await userCollection.findOne(query);
      if (existingEmail) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(userData);
      res.send(result)
    })

    // delete menu item
    app.delete('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollection.deleteOne(query);
      res.send(result);
    })

    // delete a cart
    app.delete('/cart/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    })

    // delete a user
    app.delete('/user/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })

    // update a user
    app.patch('/user/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result)
    });

    // update a spacific menu
    app.patch('/menu/:id', async (req, res) => {
      const id = req.params.id;
      const item = req.body;
      const filter = {_id: new ObjectId(id)}
      const updateDoc = {
        $set: {
          name: item.name,
          recipe: item.recipe,
          image: item.image,
          category: item.category,
          price: item.price,
        }
      }
      const result = await menuCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    // payment history save
    app.post('/payment', async(req, res)=>{
      const history = req.body;
      const result = await paymentCollection.insertOne(history);
      res.send(result);
    })

    // delete  my all order
    app.delete('/cart', async (req, res) => {
      const result = await cartCollection.deleteMany();
      res.send(result);
    })
    

    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Bistro boos server');
})

app.listen(port, () => {
  console.log(`Bistro boss running in port ${port}`)
})