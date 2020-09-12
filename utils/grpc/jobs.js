const grpc = require("grpc");
const fs = require("fs-extra");
const klaw = require("klaw");
const path = require("path");
const { JobsClient, PayloadsClient, header } = require("./common");

function uploadAndStartJob(seriesInstanceUid, pipelineId) {
  return new Promise(function (resolve, reject) {
    const jobName = `${seriesInstanceUid}-${pipelineId}`;
    const jobCreateRequest = {
      header,
      pipeline_id: {
        value: pipelineId,
      },
      name: jobName,
    };

    const inputDirectory = `input/${jobName}`;

    JobsClient.create(jobCreateRequest, async function (err, result) {
      if (err) reject(err);

      if (result.header.code < 0) {
        reject();
      }

      const jobId = result.job_id;
      const payloadId = result.payload_id;

      console.log('Result = ');
      console.log(result);

      await uploadInput(inputDirectory, payloadId);
      const startJobResult = await startJob(jobId);
      resolve(startJobResult);
    });
  });
}

function uploadInput(inputDirectory, payloadId) {
  return new Promise(async function (resolve, reject) {
    const requestStream = PayloadsClient.upload(function (err) {
      if (err) {
        console.error(err);
        reject(err);
      }
    });

    requestStream.on("status", function (status) {
      console.log("Finished uploading input. Status:");
      console.log(status);
    });

    // create 64 KB buffer
    const buffer = Buffer.alloc(64 * 1024);

    // read input files into buffer and create upload request
    for await (const file of klaw(inputDirectory)) {
      if (file.stats.isDirectory()) continue;

      const fileName = path.basename(file.path);
      const fileSize = file.stats.size;
      const fd = await fs.open(file.path, "r");
      console.log(`=== Uploading file ${fileName} - file size ${fileSize} ===`);

      let pos = 0;
      while (pos < fileSize) {
        const { bytesRead, data } = await fs.read(
          fd,
          buffer,
          0,
          buffer.length,
          null
        );
        pos += bytesRead;

        const request = {
          header,
          payload_id: payloadId,
          details: {
            size: fileSize,
            name: fileName,
          },
          data: buffer.slice(0, bytesRead),
        };

        await new Promise(function (resolve, reject) {
          requestStream.write(request, 0, function () {
            console.log(`Uploaded chunk: ${bytesRead}`);
            resolve();
          });
        });
      }

      console.log(`Finished uploading file ${fileName}`);
    }

    requestStream.end();
    console.log("================================");
    resolve();
  });
}

function startJob(jobId) {
  console.log(`Starting job ${jobId.value}`);
  return new Promise(function (resolve, reject) {
    const startRequest = {
      header,
      job_id: jobId,
    };
    JobsClient.start(startRequest, function (err, result) {
      if (err) {
        console.error(err);
        reject(err);
      }
      console.log(`Started job ${jobId.value}. Result:`);
      console.log(result);
      resolve(result);
    });
  });
}

module.exports = {
  uploadAndStartJob,
};
