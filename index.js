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
  },
  log: [
    {
      description: {
        type: String,
        required: true
      },
      duration: {
        type: Number,
        required: true
      },
      date: {
        type: Date,
        required: true
      }
    }
  ]
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

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const user = await User.findById(req.params._id)

    if (!user) {
      return res.json({ error: 'User not found' })
    }

    let logs = user.log

    // Filter by "from"
    if (req.query.from) {
      const fromDate = new Date(req.query.from)

      logs = logs.filter(exercise => {
        return exercise.date >= fromDate
      })
    }

    // Filter by "to"
    if (req.query.to) {
      const toDate = new Date(req.query.to)

      // Include the entire "to" day
      toDate.setHours(23, 59, 59, 999)

      logs = logs.filter(exercise => {
        return exercise.date <= toDate
      })
    }

    // Apply limit
    if (req.query.limit) {
      const limit = Number(req.query.limit)

      logs = logs.slice(0, limit)
    }

    res.json({
      _id: user._id,
      username: user.username,
      count: logs.length,
      log: logs.map(exercise => ({
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString()
      }))
    })

  } catch (err) {
    res.status(500).json({
      error: err.message
    })
  }
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

app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const user = await User.findById(req.params._id)

    if (!user) {
      return res.json({ error: 'User not found' })
    }

    const description = req.body.description
    const duration = Number(req.body.duration)

    const date = req.body.date
      ? new Date(req.body.date)
      : new Date()

    const exercise = {
      description: description,
      duration: duration,
      date: date
    }

    user.log.push(exercise)

    await user.save()

    res.json({
      _id: user._id,
      username: user.username,
      date: exercise.date.toDateString(),
      duration: exercise.duration,
      description: exercise.description
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