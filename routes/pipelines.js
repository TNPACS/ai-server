const express = require('express');

const { getPipelines } = require('../utils/grpc/pipelines');

const router = express.Router();

router.get('/', async function(req, res) {
    const pipelines = await getPipelines();
    res.json(pipelines);
});

module.exports = router;