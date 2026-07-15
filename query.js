const mongoose = require('mongoose');
require('dotenv').config({path: './server/.env'});

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Driver = require('./server/models/Driver');
    const Ride = require('./server/models/Ride');
    
    const d = await Driver.findOne().sort({createdAt: -1}).lean();
    const r = await Ride.findOne().sort({createdAt: -1}).lean();
    
    console.log('---DRIVER---');
    console.log(JSON.stringify(d, null, 2));
    console.log('---RIDE---');
    console.log(JSON.stringify(r, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
