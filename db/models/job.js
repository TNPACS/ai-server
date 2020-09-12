const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
  studyInstanceUid: String,
  seriesInstanceUid: String,
  sopInstanceUids: mongoose.SchemaTypes.Map,
  pipelineId: String,
});

module.exports = mongoose.model("Job", jobSchema);
