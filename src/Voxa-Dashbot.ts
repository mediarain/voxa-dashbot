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

import DashbotAnalytics from "dashbot";
import _ from "lodash";
import { IVoxaEvent, IVoxaReply, VoxaApp, ITransition } from "voxa";
import rp from "request-promise";
import {
  IDashbotRevenueEvent,
  IDashbotReferralEvent,
  IDashbotShareEvent,
  IDashbotPageLaunchEvent,
  IDashbotCustomEvent
} from "./events";

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

export function register(voxaApp: VoxaApp, config: IVoxaDashbotConfig) {
  const pluginConfig = _.merge({}, defaultConfig, config);

  const dashbotConfig = {
    debug: pluginConfig.debug,
    printErrors: pluginConfig.printErrors,
    redact: pluginConfig.redact,
    timeout: pluginConfig.timeout
  };

  voxaApp.onRequestStarted(initDashbot);
  voxaApp.onRequestStarted(trackIncoming);
  voxaApp.onBeforeReplySent(trackOutgoing);

  const alexaRequestTypes = [
    "AudioPlayer.PlaybackStarted",
    "AudioPlayer.PlaybackFinished",
    "AudioPlayer.PlaybackNearlyFinished",
    "AudioPlayer.PlaybackStopped",
    "AudioPlayer.PlaybackFailed",
    "System.ExceptionEncountered",
    "PlaybackController.NextCommandIssued",
    "PlaybackController.PauseCommandIssued",
    "PlaybackController.PlayCommandIssued",
    "PlaybackController.PreviousCommandIssued",
    "AlexaSkillEvent.ProactiveSubscriptionChanged",
    "AlexaSkillEvent.SkillAccountLinked",
    "AlexaSkillEvent.SkillEnabled",
    "AlexaSkillEvent.SkillDisabled",
    "AlexaSkillEvent.SkillPermissionAccepted",
    "AlexaSkillEvent.SkillPermissionChanged",
    "AlexaHouseholdListEvent.ItemsCreated",
    "AlexaHouseholdListEvent.ItemsUpdated",
    "AlexaHouseholdListEvent.ItemsDeleted",
    "Connections.Response",
    "Display.ElementSelected",
    "CanFulfillIntentRequest",
    "GameEngine.InputHandlerEvent",
    "Alexa.Presentation.APL.UserEvent",
    "Messaging.MessageReceived"
  ];

  for (const requestType of alexaRequestTypes) {
    if (_.has(voxaApp, `on${requestType}`)) {
      voxaApp[`on${requestType}`](initDashbot);
      voxaApp[`on${requestType}`](trackIncoming);
      voxaApp[`on${requestType}`](trackOutgoing);
    }
  }

  async function initDashbot(voxaEvent: IVoxaEvent) {
    if (!shouldTrack(voxaEvent)) {
      return;
    }

    const { platform } = voxaEvent;
    const apiKey = _.get(pluginConfig, platform.name) || pluginConfig.api_key;

    voxaEvent.dashbot = {
      trackEvent: async function (
        dashbotEvent:
          | IDashbotRevenueEvent
          | IDashbotReferralEvent
          | IDashbotShareEvent
          | IDashbotPageLaunchEvent
          | IDashbotCustomEvent
      ) {
        const requestBody = {
          ...dashbotEvent,
          ...{
            userId: voxaEvent.user.userId,
            conversationId: voxaEvent.session.sessionId
          }
        };

        await rp.post({
          uri: "https://tracker.dashbot.io/track",
          qs: {
            platform: dashbotIntegrations[platform.name],
            v: "11.1.0-rest",
            type: "event",
            apiKey: apiKey
          },
          json: true,
          body: requestBody
        });
      }
    };
  }

  async function trackIncoming(voxaEvent: IVoxaEvent) {
    if (!shouldTrack(voxaEvent)) {
      return;
    }

    const { rawEvent, platform } = voxaEvent;
    const apiKey = _.get(pluginConfig, platform.name) || pluginConfig.api_key;

    const Dashbot = DashbotAnalytics(apiKey, dashbotConfig)[
      dashbotIntegrations[platform.name]
    ];

    await Dashbot.logIncoming(rawEvent);
  }

  async function trackOutgoing(
    voxaEvent: IVoxaEvent,
    reply: IVoxaReply,
    transition?: ITransition
  ) {
    if (!shouldTrack(voxaEvent)) {
      return;
    }

    const { rawEvent, platform } = voxaEvent;
    const apiKey = _.get(pluginConfig, platform.name) || pluginConfig.api_key;

    const Dashbot = DashbotAnalytics(apiKey, dashbotConfig)[
      dashbotIntegrations[platform.name]
    ];

    if (transition && transition.say) {
      let says = transition.say;
      if (!_.isArray(transition.say)) {
        says = [transition.say];
      }

      const intent = says.join(",");
      reply = {
        ...reply,
        ...{
          intent: {
            name: intent
          }
        }
      };
    }

    await Dashbot.logOutgoing(rawEvent, reply);
  }

  function shouldTrack(voxaEvent: IVoxaEvent): boolean {
    for (const ignoreRule of pluginConfig.ignoreUsers) {
      if (voxaEvent.user.userId.match(ignoreRule)) {
        return false;
      }
    }

    if (pluginConfig.suppressSending) {
      return false;
    }

    return true;
  }
}
