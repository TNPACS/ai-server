const grpc = require("grpc");
const { PipelinesClient, header } = require("./common");

function getPipelines() {
  return new Promise(function (resolve, reject) {
    const request = { header };

    const pipelinesStreamResponse = PipelinesClient.list(request);
    const pipelines = [];

    pipelinesStreamResponse.on("data", function (data) {
      pipelines.push(data);
    });

    pipelinesStreamResponse.on("status", function (status) {
      if (status.code === grpc.status.OK) {
        resolve(pipelines.map((pipeline) => pipeline.details));
      } else {
        reject();
      }
    });
  });
}

module.exports = { getPipelines };
