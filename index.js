const express = require('express')
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')
const dns = require('dns');

dns.setServers(['8.8.8.8']);

const app = express()

app.use(cors())

app.use(express.static('public'))

// Allows us to read data submitted through forms
app.use(express.urlencoded({ extended: true }))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})


// ==========================
// MongoDB connection
// ==========================

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB')
  })
  .catch(err => {
    console.log('MongoDB connection error:', err)
  })


// ==========================
// User schema
// ==========================

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  }
})

const User = mongoose.model('User', userSchema)


// ==========================
// GET all users
// ==========================

app.get('/api/users', async (req, res) => {
  try {

    const users = await User.find()

    res.json(users)

  } catch (err) {

    res.status(500).json({
      error: err.message
    })

  }
})

app.get('/api/whoami', (req, res) => {
  res.json({
    ipaddress: req.ip,
    language: req.headers['accept-language'],
    software: req.headers['user-agent']
  })
})


// ==========================
// CREATE a user
// ==========================

app.post('/api/users', async (req, res) => {
  try {

    const username = req.body.username

    const user = new User({
      username: username
    })

    const savedUser = await user.save()

    res.json({
      username: savedUser.username,
      _id: savedUser._id
    })

  } catch (err) {

    res.status(500).json({
      error: err.message
    })

  }
})


// ==========================
// Start server
// ==========================

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log(
    'Your app is listening on port ' +
    listener.address().port
  )
})