"use strict";

/**
 * Views for tests
 *
 * Copyright (c) 2016 Rain Agency.
 * Licensed under the MIT license.
 */

const views = (function views() {
  return {
    en: {
      translation: {
        LaunchIntent: {
          OpenResponse: "Hello! How are you?"
        },
        Question: {
          Ask: "What time is it?"
        },
        ExitIntent: {
          GeneralExit: "Ok. Goodbye."
        },
        BadInput: {
          RepeatLastAskReprompt: "I'm sorry. I didn't understand."
        }
      }
    }
  };
})();

module.exports = views;
