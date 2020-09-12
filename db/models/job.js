const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
  studyInstanceUid: String,
  seriesInstanceUid: String,
  sopInstanceUids: [mongoose.SchemaTypes.Map],
  pipelineId: String,
  jobId: String,
  payloadId: String,
  status: {
    type: String,
    enum: ["pending", "in_progress", "completed", "failed"],
    default: "pending",
  },
});

module.exports = mongoose.model("Job", jobSchema);
