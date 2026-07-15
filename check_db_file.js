const mongoose = require('mongoose');
const fs = require('fs');

mongoose.connect('mongodb://localhost:27017/raftar', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    let out = "Collections: " + collections.map(c => c.name).join(', ') + "\n";
    
    // Check drivers collection
    const driversCol = db.collection('drivers');
    const driversCount = await driversCol.countDocuments();
    const allDriversRaw = await driversCol.find({}).toArray();
    out += "drivers collection count: " + driversCount + "\n";
    out += "Drivers (raw): " + JSON.stringify(allDriversRaw.map(d => ({ _id: d._id, status: d.status, userId: d.userId }))) + "\n";

    // Try finding Driver models
    const Driver = require('./server/models/Driver');
    const modelDrivers = await Driver.find({});
    out += "Mongoose Driver.find count: " + modelDrivers.length + "\n";
    out += "Model Collection Name: " + Driver.collection.name + "\n";

    fs.writeFileSync('db_report.txt', out);
    process.exit(0);
  })
  .catch(err => {
    fs.writeFileSync('db_report.txt', 'Error: ' + err.message);
    process.exit(1);
  });
