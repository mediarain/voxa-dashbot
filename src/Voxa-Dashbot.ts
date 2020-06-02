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
import {
  IVoxaEvent,
  IVoxaReply,
  VoxaApp,
  ITransition,
  GoogleAssistantEvent,
} from "voxa";
import rp from "request-promise";
import { Response } from "request";
import {
  IDashbotRevenueEvent,
  IDashbotReferralEvent,
  IDashbotShareEvent,
  IDashbotPageLaunchEvent,
  IDashbotCustomEvent,
} from "./events";

interface IOutgoingIntent {
  name?: string;
  input: IOutgoingInput[];
}

interface IOutgoingInput {
  name: string;
  value: string;
}

const defaultConfig = {
  ignoreUsers: [],
  timeout: 15000,
};

const dashbotIntegrations: any = {
  alexa: "alexa",
  botframework: "generic",
  dialogflow: "google", // DEPRECATED
  google: "google",
};

export interface IVoxaDashbotConfig {
  ignoreUsers: (string | RegExp)[];
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
  const pluginConfig: IVoxaDashbotConfig = _.merge({}, defaultConfig, config);

  const dashbotConfig = {
    debug: pluginConfig.debug,
    printErrors: pluginConfig.printErrors,
    redact: pluginConfig.redact,
    timeout: pluginConfig.timeout,
  };

  voxaApp.onRequestStarted(initDashbot);
  voxaApp.onRequestStarted(trackIncoming);
  voxaApp.onBeforeReplySent(async (voxaEvent, reply, transition) => {
    let input;

    if (voxaEvent.dashbot) {
      input = voxaEvent.dashbot.input;
    }

    await trackOutgoing(voxaEvent, reply, transition, input);
  });

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
    "Alexa.Presentation.APLT.UserEvent",
    "Messaging.MessageReceived",
  ];

  for (const requestType of alexaRequestTypes) {
    if (_.has(voxaApp, `on${requestType}`)) {
      voxaApp[`on${requestType}`](initDashbot);
      voxaApp[`on${requestType}`](trackIncoming);
      voxaApp[`on${requestType}`](trackOutgoing);
    }
  }

  function initDashbot(voxaEvent: IVoxaEvent) {
    if (!shouldTrack(voxaEvent)) {
      return;
    }

    const { platform } = voxaEvent;
    const apiKey = _.get(pluginConfig, platform.name) || pluginConfig.api_key;

    let outgoingIntent: any = {};
    voxaEvent.dashbot = {
      promises: [],
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
            conversationId: voxaEvent.session.sessionId,
          },
        };

        let p: Promise<Response | void> = Promise.resolve(
          rp.post({
            uri: "https://tracker.dashbot.io/track",
            qs: {
              platform: dashbotIntegrations[platform.name],
              v: "11.1.0-rest",
              type: "event",
              apiKey: apiKey,
            },
            json: true,
            body: requestBody,
            timeout: pluginConfig.timeout,
          })
        );

        if (pluginConfig.printErrors) {
          p = p.then(async (response: Response) => {
            if (response.statusCode === 400) {
              voxaEvent.log.error(response.body);
            }
            return response;
          });
        } else {
          p = p.catch((_err: any) => {
            // ignore
          });
        }

        voxaEvent.dashbot!.promises.push(p);
      },

      addInputs: function (outgoingInputs) {
        const input = _.get(outgoingInputs, "input");

        outgoingIntent.input = outgoingInputs;

        if (input) {
          outgoingIntent.input = input;
        }
      },

      get input() {
        return outgoingIntent.input;
      },
    };
  }

  function trackIncoming(voxaEvent: IVoxaEvent) {
    if (!shouldTrack(voxaEvent)) {
      return;
    }

    const { rawEvent, platform } = voxaEvent;
    const apiKey = _.get(pluginConfig, platform.name) || pluginConfig.api_key;

    const Dashbot = DashbotAnalytics(apiKey, dashbotConfig)[
      dashbotIntegrations[platform.name]
    ];

    voxaEvent.dashbot!.promises.push(
      Dashbot.logIncoming(augmentDashbotIncomingEvent(voxaEvent, rawEvent))
    );
  }

  async function trackOutgoing(
    voxaEvent: IVoxaEvent,
    reply: IVoxaReply,
    transition?: ITransition,
    input?: any
  ) {
    if (!shouldTrack(voxaEvent) || !voxaEvent.dashbot) {
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

      if (_.isPlainObject(input)) {
        input = [input];
      }

      const intent = says.join(",");
      reply = {
        ...reply,
        ...{
          intent: {
            name: intent,
            input,
          },
        },
      };
    }

    voxaEvent.dashbot!.promises.push(
      Dashbot.logOutgoing(
        augmentDashbotIncomingEvent(voxaEvent, rawEvent),
        augmentDashbotOutgoingEvent(voxaEvent, reply)
      )
    );

    return Promise.all(voxaEvent.dashbot.promises);
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

function augmentDashbotIncomingEvent(
  voxaEvent: IVoxaEvent,
  dashbotIncomingEvent: any
) {
  if (isGoogleAssistant(voxaEvent)) {
    const userStorage = _.get(
      dashbotIncomingEvent,
      "originalDetectIntentRequest.payload.user.userStorage"
    );
    dashbotIncomingEvent = _.merge({}, dashbotIncomingEvent, {
      originalDetectIntentRequest: {
        payload: {
          user: {
            userStorage: JSON.stringify({
              ...(userStorage ? JSON.parse(userStorage) : {}),
              dashbotUser: {
                userId: voxaEvent.user.userId,
              },
            }),
          },
        },
      },
    });
  }

  return dashbotIncomingEvent;
}

function augmentDashbotOutgoingEvent(voxaEvent: IVoxaEvent, reply: any) {
  if (isGoogleAssistant(voxaEvent)) {
    reply = _.merge({}, reply, {
      payload: {
        google: {
          userStorage: JSON.stringify({
            ...JSON.parse(voxaEvent.dialogflow.conv.user._serialize()),
            dashbotUser: {
              userId: voxaEvent.user.userId,
            },
          }),
        },
      },
    });
  }

  return reply;
}

function isGoogleAssistant(
  voxaEvent: IVoxaEvent
): voxaEvent is GoogleAssistantEvent {
  return voxaEvent.platform.name === "google";
}
