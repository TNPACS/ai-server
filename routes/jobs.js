const express = require("express");
const fs = require("fs-extra");
const path = require("path");
const cron = require("node-cron");

const { uploadAndStartJob, getJobStatus } = require("../utils/grpc/jobs");
const { Job } = require("../db");
const { JobState, JobStatus } = require("../utils/constants");

const router = express.Router();

const multer = require("multer");
const { downloadOutputs } = require("../utils/grpc/payloads");
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
    pipelineId,
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

  if (job.status === "in_progress" || job.status === "completed")
    return res.status(200).send("Job already started");

  const { result, jobId, payloadId } = await uploadAndStartJob(
    id,
    job.seriesInstanceUid,
    job.pipelineId
  );
  job.jobId = jobId.value;
  job.payloadId = payloadId.value;
  job.status = "in_progress";
  await job.save();

  // check every 30 seconds
  let task;
  task = cron.schedule("*/30 * * * * *", async function () {
    console.log(`Checking job status: ${jobId.value}`);
    const { state, status } = await getJobStatus(jobId.value);
    if (state === JobState.JOB_STATE_STOPPED) {
      if (status === JobStatus.JOB_STATUS_HEALTHY) {
        job.status = "completed";
        console.log(`Job ${jobId.value} completed`);
        task.stop();

        console.log(`Downloading outputs for job ${jobId.value}`);
        job.outputs = await downloadOutputs(payloadId.value);
        console.log(`Downloaded outputs for job ${jobId.value}`);
        await job.save();
      } else {
        job.status = "failed";
        console.log(`Job ${jobId.value} failed`);

        await job.save();
        task.stop();
      }
    }
  });

  res.json(job);
});

router.get("/:id/outputs/:filename", async function (req, res) {
  const { id, filename } = req.params;
  const job = await Job.findById(id);
  const { payloadId } = job;
  res.sendFile(path.join(__dirname, `../output/${payloadId}/${filename}`));
});

module.exports = router;
