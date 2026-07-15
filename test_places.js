const fetch = require('node-fetch');

async function testPlaces() {
  try {
    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': 'AIzaSyCgHvsDKNJGJp5K58UCXX61kWgz8jsajAI'
      },
      body: JSON.stringify({
        input: 'karachi'
      })
    });
    
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

testPlaces();
