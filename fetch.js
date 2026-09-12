const https = require('https');
https.get('https://game.mtwala.com/games/dino/index.html', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(data.substring(0, 500));
  });
});
