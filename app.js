const express = require('express');
const cors = require('cors');

const pipelinesRouter = require('./routes/pipelines');

const app = express();

app.use(cors());
app.use('/pipelines', pipelinesRouter);

module.exports = app;