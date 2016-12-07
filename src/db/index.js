const mongoose = require('mongoose');

const db = mongoose.connection;
db.on('error', console.error);
db.once('open', () => {
    console.log('Connected to mongod server');
});

mongoose.connect('mongodb://localhost/birthday_paper');
