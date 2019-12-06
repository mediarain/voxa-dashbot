/*
 * Copyright (c) 2018 Rain Agency <contact@rain.agency>
 * Author: Rain Agency <contact@rain.agency>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import _ from "lodash";
import { IVoxaEvent, IVoxaReply, VoxaApp } from "voxa";
import DashbotAnalytics from "dashbot";

const defaultConfig = {
  ignoreUsers: []
};

const dashbotIntegrations: any = {
  alexa: "alexa",
  botframework: "generic",
  dialogflow: "google", // DEPRECATED
  google: "google"
};

export interface IVoxaDashbotConfig {
  alexa?: string;
  api_key?: string;
  botframework?: string;
  debug?: boolean;
  dialogflow?: string;
  printErrors?: boolean;
  redact?: boolean;
  suppressSending?: boolean;
  timeout?: number;
}

export function register(skill: VoxaApp, config: IVoxaDashbotConfig) {
  const pluginConfig = _.merge({}, defaultConfig, config);

  const dashbotConfig = {
    debug: pluginConfig.debug,
    printErrors: pluginConfig.printErrors,
    redact: pluginConfig.redact,
    timeout: pluginConfig.timeout
  };

  skill.onRequestStarted(trackIncoming);
  skill.onBeforeReplySent(trackOutgoing);

  async function trackIncoming(voxaEvent: IVoxaEvent) {
    for (const ignoreRule of pluginConfig.ignoreUsers) {
      if (voxaEvent.user.userId.match(ignoreRule)) {
        return;
      }
    }

    if (pluginConfig.suppressSending) {
      return;
    }
    const { rawEvent, platform } = voxaEvent;
    const apiKey = _.get(pluginConfig, platform.name) || pluginConfig.api_key;

    const Dashbot = DashbotAnalytics(apiKey, dashbotConfig)[
      dashbotIntegrations[platform.name]
    ];
    // PROCESSING INCOMING RESPONSE
    return Dashbot.logIncoming(rawEvent);
  }

  function trackOutgoing(voxaEvent: IVoxaEvent, reply: IVoxaReply) {
    if (_.includes(pluginConfig.ignoreUsers, voxaEvent.user.userId)) {
      return Promise.resolve(null);
    }
    if (pluginConfig.suppressSending) {
      return Promise.resolve(null);
    }
    const { rawEvent, platform } = voxaEvent;
    const apiKey = _.get(pluginConfig, platform.name) || pluginConfig.api_key;

    const Dashbot = DashbotAnalytics(apiKey, dashbotConfig)[
      dashbotIntegrations[platform.name]
    ];
    // PROCESSING INCOMING RESPONSE
    return Dashbot.logOutgoing(rawEvent, reply);
  }
}
