const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000", 
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(express.json());
app.use(cors({
  origin: "http://localhost:3000" 
}));

// Connect to MongoDB Atlas
const mongoUri = 'mongodb+srv://hazy:thisislife17@cluster0.g12s1mf.mongodb.net/locationn';
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB Atlas');
})
.catch(err => {
  console.error('Error connecting to MongoDB Atlas', err);
});

const locationSchema = new mongoose.Schema({
  lat: Number,
  lng: Number,
}, { timestamps: true });

const Location = mongoose.model('Location', locationSchema);

app.post('/update-location', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const location = new Location({ lat, lng });
    await location.save();
    console.log('Location saved:', location);

    // Emit the new location to all connected clients
    io.emit('locationUpdate', { lat, lng });

    res.status(200).send('Location updated');
  } catch (error) {
    console.error('Error saving location:', error);
    res.status(500).send('Error updating location');
  }
});

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('location', async (data) => {
    try {
      const { lat, lng } = data;
      const location = new Location({ lat, lng });
      await location.save();
      console.log('Location saved via socket:', location);

      io.emit('locationUpdate', { lat, lng });
    } catch (error) {
      console.error('Error saving location via socket:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});
app.get('/get-location', async (req, res) => {
  try {
    // Fetch the latest location from MongoDB
    const latestLocation = await Location.findOne().sort({ createdAt: -1 });

    // If no location found, return an empty response
    if (!latestLocation) {
      return res.status(404).send('Location not found');
    }

    // Otherwise, return the latest location
    res.json({ lat: latestLocation.lat, lng: latestLocation.lng });
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).send('Error fetching location');
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
