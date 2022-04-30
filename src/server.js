const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.urlencoded({
    extended: true
}))

if (fs.existsSync(path.join(__dirname, '..', 'routes', 'api.js'))) {
    const router = require('../routes/api');
    app.use('/api', router);
}

module.exports = () => app.listen(4000, () => {
    console.log("Server listening at port 4000");
});