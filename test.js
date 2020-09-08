const protoLoader = require('@grpc/proto-loader');
const grpc = require('grpc');

const connectionString = "localhost:30013";
 
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
const JobsClient = new JobsService(connectionString, grpc.credentials.createInsecure());

const jobCreateRequest = {
  "header": {
    "api_version": {
      "major": 10,
      "minor": 10,
      "patch": 10,
      "label": "AI-Server"
    },
    "user_agent": "AI-Server"
  },
  "pipeline_id": {
    "value": "27b3c569fff141608c62ee25f9787674"
  },
  "name": "test",
  "input_payloads": [
    {
      "value": "/home/hpclab/.clara/pipelines/clara_ai_livertumor_pipeline/input/dcm/"
    }
  ]
};

const jobCreateResponse = JobsClient.create(jobCreateRequest, () => {});

console.log(jobCreateResponse);