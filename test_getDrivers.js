const mongoose = require('mongoose');
const { getDrivers } = require('./server/controllers/adminController');

mongoose.connect('mongodb://localhost:27017/raftar', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const req = {
      query: {
        page: '1',
        limit: '10',
        status: 'pending'
      }
    };
    const res = {
      json: (data) => {
        console.log('Response:', JSON.stringify(data, null, 2));
        process.exit(0);
      },
      status: (code) => ({
        json: (data) => {
          console.log(`Status ${code} Error:`, data);
          process.exit(1);
        }
      })
    };
    
    await getDrivers(req, res);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
