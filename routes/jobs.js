const express = require("express");
const grpc = require("grpc");
const fs = require("fs-extra");

const { uploadAndStartJob } = require("../utils/grpc/jobs");
const { Job } = require("../db");

const router = express.Router();

const multer = require("multer");
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const jobId = req.params.id;
    const job = await Job.findById(jobId);
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

  const uploaded = {};
  for (const id of sopInstanceUids) {
    uploaded[id] = false;
  }

  const newJob = new Job({
    studyInstanceUid,
    seriesInstanceUid,
    sopInstanceUids: uploaded,
    pipelineId,
  });

  await newJob.save();
  fs.mkdirpSync(`input/${seriesInstanceUid}_${pipelineId}`);
  res.json(newJob);
});

router.get("/:id", async function (req, res) {
  const { id } = req.params;
  const job = await Job.findById(id);
  res.json(job);
});

router.post("/:id", upload.any(), async function (req, res) {
  const jobId = req.params.id;
  const job = await Job.findByIdAndUpdate(
    jobId,
    {
      [`sopInstanceUids.${req.files[0].fieldname}`]: true,
    },
    { new: true }
  );
  res.json(job);
});

router.get("/:id/start", async function (req, res) {
  const jobId = req.params.id;
  const job = await Job.findById(jobId);
  const result = await uploadAndStartJob(job.seriesInstanceUid, job.pipelineId);
  res.json(result);
});

module.exports = router;
