const mongoose = require('mongoose');
const Driver = require('./server/models/Driver');
const User = require('./server/models/User');

mongoose.connect('mongodb://localhost:27017/raftar', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const drivers = await Driver.find({ status: 'pending' });
    console.log(`Found ${drivers.length} pending drivers.`);
    if (drivers.length > 0) {
      console.log('Driver user:', drivers[0].userId);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
