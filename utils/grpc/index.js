const { ClaraService, JobsService, ModelsService, PayloadsService, PipelinesService } = require('./services');
const grpc = require('grpc');

const connectionString = process.env.GRPC_CONNECTION_STRING;

const ClaraClient = new ClaraService(connectionString, grpc.credentials.createInsecure());
const JobsClient = new JobsService(connectionString, grpc.credentials.createInsecure());
const ModelsClient = new ModelsService(connectionString, grpc.credentials.createInsecure());
const PayloadsClient = new PayloadsService(connectionString, grpc.credentials.createInsecure());
const PipelinesClient = new PipelinesService(connectionString, grpc.credentials.createInsecure());

module.exports = {
    ClaraClient,
    JobsClient,
    ModelsClient,
    PayloadsClient,
    PipelinesClient
};