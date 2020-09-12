require('dotenv').config();
const protoLoader = require('@grpc/proto-loader');
const grpc = require('grpc');
const fs = require('fs-extra');
const klaw = require('klaw');
const path = require('path');
const { header} = require('./utils/grpc');

// const connectionString = "localhost:30013";
// const credentials = grpc.credentials.createInsecure();

const connectionString = "grpc.clara.huytc.dev";
const credentials = grpc.credentials.createSsl();
 
const options = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [__dirname + '/utils/grpc/proto/']
};
const packageDefinition = protoLoader.loadSync('clara.proto', options);
const packageObject = grpc.loadPackageDefinition(packageDefinition);

const JobsService = packageObject.nvidia.clara.platform.Jobs;
const PayloadsService = packageObject.nvidia.clara.platform.Payloads;
const JobsClient = new JobsService(connectionString, credentials);
const PayloadsClient = new PayloadsService(connectionString, credentials);

// create job and upload input
const jobCreateRequest = {
  header,
  pipeline_id: {
    value: "27b3c569fff141608c62ee25f9787674"
  },
  name: "test"
};

JobsClient.create(jobCreateRequest, async function(err, result) {
  if (err) console.log(err);
  console.log(result);

  if (result.header.code < 0) {
    // TODO: handle errors
  }

  const jobId = result.job_id;
  const payloadId = result.payload_id;

  await uploadInput(payloadId);
  await startJob(jobId);
});

function uploadInput(payloadId) {
  return new Promise(async function (resolve, reject) {
    const requestStream = PayloadsClient.upload(function(err) {
      if (err) {
        console.error(err);
        reject(err);
      }
    });

    requestStream.on('status', function(status) {
      console.log('Finished uploading input. Status:');
      console.log(status);
    });
  
    // create 64 KB buffer
    const buffer = Buffer.alloc(64 * 1024);
  
    // read input files into buffer and create upload request
    for await (const file of klaw('test_input')) {
      if (file.stats.isDirectory()) continue;

      const fileName = path.basename(file.path);
      const fileSize = file.stats.size;
      const fd = await fs.open(file.path, 'r');
      console.log(`=== Uploading file ${fileName} - file size ${fileSize} ===`);
  
      let pos = 0;
      while (pos < fileSize) {
        const { bytesRead, data } = await fs.read(fd, buffer, 0, buffer.length, null);
        pos += bytesRead;

        const request = {
          header,
          payload_id: payloadId,
          details: {
            size: fileSize,
            name: fileName
          },
          data: buffer.slice(0, bytesRead)
        };
        
        await new Promise(function(resolve, reject) {
          requestStream.write(request, 0, function() {
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
  return new Promise(function(resolve, reject) {
    const startRequest = {
      header,
      job_id: jobId
    };
    JobsClient.start(startRequest, function(err, result) {
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