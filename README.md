Voxa Dashbot
===========

[![Build Status](https://travis-ci.org/mediarain/voxa-dashbot.svg?branch=master)](https://travis-ci.org/mediarain/voxa-dashbot)
[![Coverage Status](https://coveralls.io/repos/github/mediarain/voxa-dashbot/badge.svg?branch=master)](https://coveralls.io/github/mediarain/voxa-dashbot?branch=master)

A [Dashbot](https://www.npmjs.com/package/dashbot) plugin for [voxa](https://mediarain.github.io/voxa/)

Installation
-------------

Just install from [npm](https://www.npmjs.com/package/voxa-dashbot)

```bash
npm install --save voxa-dashbot
```

Usage
------

```javascript

const Voxa = require('voxa');
const voxaDashbot = require('voxa-dashbot');

const skill = new Voxa(voxaOptions);

const dashbotConfig = {
  api_key: '<dashbot api_key>',
  ignoreUsers: [], // a list of users to ignore
  suppressSending: false, // A flag to supress sending hits. 
};

voxaDashbot(skill, dashbotConfig);
```
