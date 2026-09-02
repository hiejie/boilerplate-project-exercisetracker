
const express = require('express')
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')
const dns = require('dns')

dns.setServers(['8.8.8.8'])

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
        default: Date.now
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


// ==========================
// Who Am I
// ==========================

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
// ADD an exercise
// ==========================

app.post('/api/users/:_id/exercises', async (req, res) => {
  try {

    // Check if the ID is valid
    if (!mongoose.Types.ObjectId.isValid(req.params._id)) {
      return res.json({
        error: 'User not found'
      })
    }

    const user = await User.findById(req.params._id)

    if (!user) {
      return res.json({
        error: 'User not found'
      })
    }

    // Create exercise
    const exercise = {
      description: req.body.description,
      duration: Number(req.body.duration),
      date: req.body.date
        ? new Date(req.body.date)
        : new Date()
    }

    // Add exercise to user's log
    user.log.push(exercise)

    // Save user
    await user.save()

    // Get the saved exercise
    const savedExercise = user.log[user.log.length - 1]

    // Return the required FCC response
    res.json({
      _id: user._id,
      username: user.username,
      date: savedExercise.date.toDateString(),
      duration: savedExercise.duration,
      description: savedExercise.description
    })

  } catch (err) {
    res.status(500).json({
      error: err.message
    })
  }
})


// ==========================
// GET user's exercise log
// ==========================

app.get('/api/users/:_id/logs', async (req, res) => {
  try {

    // Check if the ID is valid
    if (!mongoose.Types.ObjectId.isValid(req.params._id)) {
      return res.json({
        error: 'User not found'
      })
    }

    const user = await User.findById(req.params._id)

    if (!user) {
      return res.json({
        error: 'User not found'
      })
    }

    // Start with the user's complete log
    let logs = user.log


    // ==========================
    // Filter by "from"
    // ==========================

    if (req.query.from) {
      const fromDate = new Date(req.query.from)

      logs = logs.filter(exercise => {
        return exercise.date >= fromDate
      })
    }


    // ==========================
    // Filter by "to"
    // ==========================

    if (req.query.to) {
      const toDate = new Date(req.query.to)

      // Include the entire "to" date
      toDate.setDate(toDate.getDate() + 1)

      logs = logs.filter(exercise => {
        return exercise.date < toDate
      })
    }


    // ==========================
    // Apply limit
    // ==========================

    if (req.query.limit) {
      const limit = Number(req.query.limit)

      logs = logs.slice(0, limit)
    }


    // ==========================
    // Return response
    // ==========================

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
// Start server
// ==========================

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log(
    'Your app is listening on port ' +
    listener.address().port
  )
})

