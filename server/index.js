const express = require('express');
const app = express();

app.use(express.json());

app.use('/auth', require('./routes/auth'));
app.use('/sync', require('./routes/sync'));

app.listen(3000, () => {
  console.log('Server running on 3000');
});
