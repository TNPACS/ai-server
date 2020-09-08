const express = require('express');
const grpc = require('grpc');

const { PipelinesClient } = require('../utils/grpc');

const router = express.Router();

router.get('/', function(req, res) {
    const pipelinesListRequest = {
        "header": {
          "api_version": {
            "major": 10,
            "minor": 10,
            "patch": 10,
            "label": "AI-Server"
          },
          "user_agent": "AI-Server"
        }
    };
    const pipelinesStreamResponse = PipelinesClient.list(pipelinesListRequest);
    const pipelines = [];

    pipelinesStreamResponse.on('data', function(data) {
        pipelines.push(data);
    });

    pipelinesStreamResponse.on('status', function(status) {
        if (status.code === grpc.status.OK) {
            res.json(pipelines.map(pipeline => pipeline.details));
        } else {
            res.sendStatus(500);
        }
    });
});

module.exports = router;