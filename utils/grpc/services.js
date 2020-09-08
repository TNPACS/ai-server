const protoLoader = require('@grpc/proto-loader');
const grpc = require('grpc');
 
const options = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [__dirname + '/proto/']
};
const packageDefinition = protoLoader.loadSync('clara.proto', options);
const packageObject = grpc.loadPackageDefinition(packageDefinition);

module.exports = {
    ClaraService: packageObject.nvidia.clara.platform.Clara,
    JobsService: packageObject.nvidia.clara.platform.Jobs,
    ModelsService: packageObject.nvidia.clara.platform.Models,
    PayloadsService: packageObject.nvidia.clara.platform.Payloads,
    PipelinesService: packageObject.nvidia.clara.platform.Pipelines
};