
const express = require('express');
const translate = require('node-google-translate-skidz');
const app = express();
const port = 3000;


app.use(express.static('public'));
/*
app.get('/', (req, res) => {
  res.json("Hola mundo");
});
*/
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

