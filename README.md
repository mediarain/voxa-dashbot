Voxa Dashbot for Alexa Skills and Google Actions
================================================

[![Build Status](https://travis-ci.org/mediarain/voxa-dashbot.svg?branch=master)](https://travis-ci.org/mediarain/voxa-dashbot)
[![Coverage Status](https://coveralls.io/repos/github/mediarain/voxa-dashbot/badge.svg?branch=master)](https://coveralls.io/github/mediarain/voxa-dashbot?branch=master)

A [Dashbot](https://www.npmjs.com/package/dashbot) plugin for building Alexa Skills and Google Actions with [voxa](http://voxa.ai/)

Installation
-------------

Just install from [npm](https://www.npmjs.com/package/voxa-dashbot)

```bash
npm install --save voxa-dashbot
```

Usage
------

```javascript

const { VoxaApp } = require('voxa');
const voxaDashbot = require('voxa-dashbot').register;

const voxaApp = new VoxaApp(voxaOptions);

const dashbotConfig = {
  alexa: '<dashbot api_key>', // to track Alexa requests
  botframework: '<dashbot api_key>', // to track botframework requests
  debug: true, // to print dashbot package logs
  dialogflow: '<dashbot api_key>', // to track dialogflow requests
  ignoreUsers: [], // a list of users to ignore
  printErrors: true, // used by dashbot package to print any errors
  redact: true, // removes personally identifiable information using redact-pii
  timeout: 5000, // timeouts dashbot requests after given milliseconds
  suppressSending: false, // A flag to supress sending hits.
};

voxaDashbot(voxaApp, dashbotConfig);
```
