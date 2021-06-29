const processFile = require("../middleware/upload");
const _ = require("lodash");
const { format } = require("util");
const { Storage } = require("@google-cloud/storage");
const { PubSub } = require(`@google-cloud/pubsub`);
const Buffer = require('safe-buffer').Buffer;
const SA = { keyFilename: process.env.AUTH_SERVICEACCOUNT || 'service-account-creds.json' }
const storage = new Storage(SA);
const bucket = storage.bucket("test-dataflow-files");
const parseString = require('xml2js').parseString;
const DEFAULT_TOPIC='projects/test-dataflow-317517/topics/dlp-activities';

const FILE_FORMAT = {
  TCX: {
    type: 'XML',
    topic: process.env.XML_TOPIC
  },
  XML: {
    type: 'XML',
    topic: process.env.XML_TOPIC
  },
  JSON: {
    type: 'JSON',
    topic: process.env.JSON_TOPIC
  },
  CSV: {
    type: 'CSV',
    topic: process.env.CSV_TOPIC
  }
}

function sendToPubsub(topicName, data) {
  const pubsub = new PubSub(SA);
  const dataBuffer = Buffer.from(JSON.stringify(data));
  pubsub.topic(topicName).publish(dataBuffer);
}

function getExtension(fileName) {
  return FILE_FORMAT[_.last(fileName.split('.')).toUpperCase()]
}

const dataMap = {
  XML: (clientId, text) => new Promise((resolve, reject) => {
    records = [];
    parseString(text, (err, result) => {
      if (err) {
        reject(err)
      }
      origin = result.TrainingCenterDatabase.Author[0].Name[0];
      const activities = result.TrainingCenterDatabase.Activities[0].Activity;
      const data = activities.map((e, i) => {
        return {
          "activityName": e.$.Sport,
          "startTime": e.Lap[0].$.StartTime.replace('Z',''),
          "calories": e.Lap[0].Calories[0],
          "distance": e.Lap[0].DistanceMeters[0],
          "duration": e.Lap[0].TotalTimeSeconds[0],
          "intensity": e.Lap[0].Intensity[0],
          "CustomerID": clientId,
          origin,
        }
      })
      resolve(data)
    });
  }),
  JSON: async (text) => {

  },
  CSV: async (text) => {

  },
}

const upload = async (req, res) => {
  try {
    await processFile(req, res);
    
    const extension = getExtension(req.file.originalname);
    const records = await dataMap[extension.type](req.body.customerId, req.file.buffer.toString());

    sendToPubsub(process.env.ACTIVITIES_TOPIC || DEFAULT_TOPIC, records);

    if (!req.file) {
      return res.status(400).send({ message: "Please upload a file!" });
    }
    return res.status(200).send({
      message: "Sended to Pub/Sub",
    });
  } catch (err) {
    console.log(err);

    if (err.code == "LIMIT_FILE_SIZE") {
      return res.status(500).send({
        message: "File size cannot be larger than 2MB!",
      });
    }

    res.status(500).send({
      message: `Could not upload the file: ${req.file.originalname}. ${err}`,
    });
  }
};

module.exports = {
  upload,
};
