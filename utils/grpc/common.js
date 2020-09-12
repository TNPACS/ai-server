const {
  ClaraService,
  JobsService,
  ModelsService,
  PayloadsService,
  PipelinesService,
} = require("./services");
const grpc = require("grpc");

const connectionString = process.env.GRPC_CONNECTION_STRING;
const credentials = connectionString.startsWith("localhost")
  ? grpc.credentials.createInsecure()
  : grpc.credentials.createSsl();

const ClaraClient = new ClaraService(
  connectionString,
  credentials
);
const JobsClient = new JobsService(
  connectionString,
  credentials
);
const ModelsClient = new ModelsService(
  connectionString,
  credentials
);
const PayloadsClient = new PayloadsService(
  connectionString,
  credentials
);
const PipelinesClient = new PipelinesService(
  connectionString,
  credentials
);

module.exports = {
  ClaraClient,
  JobsClient,
  ModelsClient,
  PayloadsClient,
  PipelinesClient,
  header: {
    api_version: {
      major: 10,
      minor: 10,
      patch: 10,
      label: "AI-Server",
    },
    user_agent: "AI-Server",
  },
};
