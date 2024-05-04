const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookiesParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middle ware
app.use(cors({
  origin:['http://localhost:5173'],
  credentials:true
}))
app.use(express.json())
app.use(cookiesParser())





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rtakb7z.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// my middle wire 
const logger = async(req,res,next)=>{
  console.log('called',req.host,req.originalUrl)
  next()
}

const verifyToken = async(req,res,next)=>{
  const token = req.cookies?.token;
  // console.log('value of token',token)
  if(!token){
    return res.status(401).send({message:"forbidden"})
  }

  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded) =>{
    if(err){
      return res.status(401).send({message:"unauthorized"})
    }
    // console.log('value in the token ',decoded)
    req.user = decoded
    next()
  })
 
  
}




async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const servicesCollection = client.db('carDoctor').collection('services');
    const bookingCollection = client.db('carDoctor').collection('booking')

    // api related
    app.post('/jwt',async(req,res)=>{
      const user = req.body
      
      const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn:'1h'})
      res
      .cookie('token',token,{
        httpOnly:true,
        secure:false,
        
      })
      .send({success : true})
    })
    
    // services related 
    app.get('/services',async(req,res)=>{
        const result = await servicesCollection.find().toArray()
        res.send(result)
    })

    app.get('/checkout/:id',async(req,res)=>{
        const id = req.params.id
        const query = {_id: new ObjectId(id)}

        const options = {
            projection:{ title:1,price:1,service_id:1,img:1}
        }
        const result = await servicesCollection.findOne(query,options)
        res.send(result)
    })

    // booking 
    app.get('/booking',verifyToken, async(req,res)=>{
      console.log(req.query.email)
      console.log('user in the valid  token ',req.user)
      if(req.query.email !== req.user.email){
        return res.status(403).send({message:"forbidden"})
      }
      let query = {};
      if(req.query?.email){
        query = { email:req.query.email}
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result)
    })
    app.post('/booking',async(req,res)=>{
        const booking = req.body
        const result = await bookingCollection.insertOne(booking)
        res.send(result)
        
    })

    app.patch('/booking/:id',async(req,res)=>{
        const filter = {_id: new ObjectId(req.params.id)}
        console.log(req.body.status)
        const updateDoc = {
          $set :{
            status:req.body.status
          }
        }
        const result = await bookingCollection.updateOne(filter,updateDoc)
        res.send(result)
    })

    app.delete('/booking/:id',async(req,res) =>{
        const result = await bookingCollection.deleteOne({_id: new ObjectId(req.params.id)})
        res.send(result)
    })





    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);












app.get('/',(req,res)=>{
    res.send('Server is running')
})

app.listen(port, ()=>{
    console.log(`Server is running on port ${port}`)
})
