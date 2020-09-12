const mongoose = require("mongoose");
const Job = require("./models/job");

const mongoUri = process.env.MONGO_URI;

module.exports = {
  init: function () {
    return new Promise(function (resolve, reject) {
      mongoose.connect(
        mongoUri,
        {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          useFindAndModify: false,
        },
        function (err) {
          if (err) reject(err);
          console.log("Connected to database");
          resolve();
        }
      );
    });
  },
  Job,
};
