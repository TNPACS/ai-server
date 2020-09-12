const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const pipelinesRouter = require("./routes/pipelines");
const jobsRouter = require("./routes/jobs");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

app.use("/pipelines", pipelinesRouter);
app.use("/jobs", jobsRouter);

module.exports = app;
