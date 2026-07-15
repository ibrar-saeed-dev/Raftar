const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/raftar', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log("Collections:", collections.map(c => c.name));
    
    // Check drivers collection
    const driversCol = db.collection('drivers');
    const driversCount = await driversCol.countDocuments();
    const allDrivers = await driversCol.find({}).toArray();
    console.log("drivers collection count:", driversCount);
    console.log("Drivers:", allDrivers.map(d => ({ _id: d._id, status: d.status, userId: d.userId })));

    // Try finding Driver models
    const Driver = require('./server/models/Driver');
    const modelDrivers = await Driver.find({});
    console.log("Mongoose Driver.find count:", modelDrivers.length);
    
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
