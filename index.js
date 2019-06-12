const Alexa = require('ask-sdk');
const AWS = require('aws-sdk');
const rp = require('request-promise');

AWS.config.loadFromPath('./awscreds.json');

const Polly = new AWS.Polly({
    signatureVersion: 'v4',
    region: 'ap-northeast-2'
});
const s3 = new AWS.S3();

function testFunc(air) {
  return new Promise(((resolve, reject) => {
    let pollyparams = {
        "LanguageCode": "ko-KR",
        'Text': `<speak>${air.dataTime.split(" ")[1]}의 미세먼지 농도는 ${air.pm10Value} 입니다!</speak>`,
        'TextType': "ssml",
        'OutputFormat': 'mp3',
        'VoiceId': 'Seoyeon'
    };

    Polly.synthesizeSpeech(pollyparams, (err, data) => {
        if (err) {
            console.log(err.message)
        } else if (data) {
            let s3params = {
                Body: data.AudioStream,
                Bucket: "bucket-name",
                Key: `filename.mpeg`,
                ACL: "public-read"
            };

            s3.upload(s3params, (err, data) => {
                if (err) {
                    console.log(err.message);
                    reject(err);
                } else {
                    console.log(data.Location);
                    resolve(data.Location);
                }
            });
        }
    });
  }));
}

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speakOutput = 'Welcome to hans';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  },
};

const DustHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'DustIntent';
  },
  async handle(handlerInput) {
    try {
      let air = await rp(`http://openapi.airkorea.or.kr/openapi/services/rest/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty?serviceKey=KEY&numOfRows=1&pageSize=1&pageNo=1&startPage=1&stationName=${encodeURIComponent('상대원동')}&dataTerm=DAILY&ver=1.3&_returnType=json`);
      air = JSON.parse(air);
      air = air.list[0];
      const response = await testFunc(air);
      const speakOutput = `<audio src="${response}"/>`;
      return handlerInput.responseBuilder
        .speak(speakOutput)
        .getResponse();
    } catch (e) {
      console.log(e);
      return handlerInput.responseBuilder
        .speak("error")
        .getResponse();
    }
  },
};

const HelpHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speakOutput = 'You can say hello to me!';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  },
};

const CancelAndStopHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speakOutput = 'Goodbye!';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);
    console.log(error.trace);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    DustHandler,
    HelpHandler,
    CancelAndStopHandler,
    SessionEndedRequestHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
