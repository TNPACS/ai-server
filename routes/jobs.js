const express = require("express");
const fs = require("fs-extra");
const cron = require("node-cron");

const { uploadAndStartJob, getJobStatus } = require("../utils/grpc/jobs");
const { Job } = require("../db");
const { JobState, JobStatus } = require("../utils/constants");

const router = express.Router();

const multer = require("multer");
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const { id } = req.params;
    const job = await Job.findById(id);
    const { seriesInstanceUid, pipelineId } = job;
    cb(null, `input/${seriesInstanceUid}-${pipelineId}`);
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + ".dcm");
  },
});
const upload = multer({ storage });

router.get("/", async function (req, res) {
  const jobs = await Job.find();
  res.json(jobs);
});

router.post("/", upload.none(), async function (req, res) {
  const {
    studyInstanceUid,
    seriesInstanceUid,
    sopInstanceUids,
    pipelineId,
  } = req.body;

  const existingJob = await Job.findOne({
    seriesInstanceUid,
    pipelineId
  });

  if (!!existingJob) return res.json(existingJob);

  const newJob = new Job({
    studyInstanceUid,
    seriesInstanceUid,
    sopInstanceUids: sopInstanceUids.map(
      (id) => new Object({ sopInstanceUid: id, uploaded: false })
    ),
    pipelineId,
  });

  await newJob.save();
  fs.mkdirpSync(`input/${seriesInstanceUid}-${pipelineId}`);
  res.json(newJob);
});

router.get("/:id", async function (req, res) {
  const { id } = req.params;
  const job = await Job.findById(id);
  res.json(job);
});

router.post("/:id", upload.any(), async function (req, res) {
  const { id } = req.params;
  const job = await Job.findOneAndUpdate(
    {
      _id: id,
      "sopInstanceUids.sopInstanceUid": req.files[0].fieldname,
    },
    {
      $set: { "sopInstanceUids.$.uploaded": true },
    },
    { new: true }
  );
  await job.save();
  res.json(job);
});

router.get("/:id/start", async function (req, res) {
  const { id } = req.params;
  const job = await Job.findById(id);
  const { result, jobId, payloadId } = await uploadAndStartJob(
    job.seriesInstanceUid,
    job.pipelineId
  );
  job.jobId = jobId.value;
  job.payloadId = payloadId.value;
  job.status = "in_progress";
  await job.save();

  // check 30 seconds
  let task;
  task = cron.schedule("*/30 * * * * *", async function () {
    console.log(`Checking job status: ${jobId.value}`);
    const { state, status } = await getJobStatus(jobId.value);
    if (state === JobState.JOB_STATE_STOPPED) {
      if (status === JobStatus.JOB_STATUS_HEALTHY) {
        job.status = "completed";
        console.log(`Job ${jobId.value} completed`);
      } else {
        job.status = "failed";
        console.log(`Job ${jobId.value} failed`);
      }
      await job.save();
      task.stop();
    }
  });

  res.json(job);
});

module.exports = router;
