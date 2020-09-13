const grpc = require("grpc");
const fs = require("fs-extra");
const path = require("path");
const { PayloadsClient, header } = require("./common");

function getFileListing(payloadId) {
  return new Promise(function (resolve, reject) {
    const request = {
      header,
      payload_id: {
        value: payloadId,
      },
    };

    const fileListingStreamResponse = PayloadsClient.details(request);
    const fileListing = [];

    fileListingStreamResponse.on("data", function (data) {
      fileListing.push(data);
    });

    fileListingStreamResponse.on("status", function (status) {
      if (status.code === grpc.status.OK) {
        resolve(fileListing);
      } else {
        reject();
      }
    });
  });
}

function downloadFile(payloadId, name) {
  return new Promise(async function (resolve, reject) {
    const request = {
      header,
      payload_id: {
        value: payloadId,
      },
      name: name.slice(1), // remove leading slash
    };

    const downloadStream = PayloadsClient.download(request);

    fs.mkdirpSync(`output/${payloadId}`);
    const fileName = path.basename(name);
    const fd = await fs.open(`output/${payloadId}/${fileName}`, "w");

    downloadStream.on("data", async function (data) {
      const buffer = data.data;
      await fs.write(fd, buffer, 0, buffer.length, null);
    });

    downloadStream.on("status", async function (status) {
      if (status.code === grpc.status.OK) {
        await fs.close(fd);
        resolve(fileName);
      } else {
        reject();
      }
    });
  });
}

async function downloadOutputs(payloadId) {
  const files = await getFileListing(payloadId);
  const outputFileNames = files
    .filter((file) => file.file.name.includes("/segmentation"))
    .map((file) => file.file.name);
  let downloadPromises = [];
  for (const fileName of outputFileNames) {
    downloadPromises.push(downloadFile(payloadId, fileName));
  }
  return Promise.all(downloadPromises);
}

module.exports = { downloadOutputs };
