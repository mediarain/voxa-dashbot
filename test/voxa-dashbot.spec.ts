"use strict";

import _ from "lodash";
import chai from "chai";
import simple from "simple-mock";
import nock from "nock";
import { VoxaApp, AlexaPlatform, VoxaEvent } from "voxa";

import { register } from "../src";
import * as views from "./views";

const expect = chai.expect;
const DASHBOT_URL = "https://tracker.dashbot.io";
const dashbotConfig: any = {
  api_key: "some_api_key",
  // debug: true,
  printErrors: false,
};

describe("Voxa-Dashbot plugin", () => {
  let voxaApp: VoxaApp;
  let alexaSkill: AlexaPlatform;
  let nockScope: nock.Scope;

  beforeEach(() => {
    voxaApp = new VoxaApp({ views });
    alexaSkill = new AlexaPlatform(voxaApp);

    nockScope = nock(DASHBOT_URL)
      .persist()
      .post("/track")
      .query(true)
      .reply(200, "MOCK DATA");
  });

  afterEach(() => {
    simple.restore();
    nock.cleanAll();
  });

  it("should be setting the outgoing intent", async () => {
    nock.cleanAll();
    nockScope = nock(DASHBOT_URL)
      // logIncoming
      .post("/track")
      .query(true)
      .reply(200, "MOCK DATA")

      // logOutgoing
      .post("/track", (body) => {
        return body.response.intent.name === "LaunchIntent.OpenResponse";
      })
      .query(true)
      .reply(200, "MOCK DATA");

    const spy = simple.spy(() => ({
      say: "LaunchIntent.OpenResponse",
      flow: "yield",
      to: "entry",
    }));

    voxaApp.onIntent("LaunchIntent", spy);

    const event = {
      request: {
        type: "LaunchRequest",
        locale: "en-us",
      },
      session: {
        new: true,
        sessionId: "some",
        application: {
          applicationId: "appId",
        },
        user: {
          userId: "user-id",
        },
      },
    };

    register(voxaApp, dashbotConfig);
    const reply = await alexaSkill.execute(event as any);

    expect(spy.called).to.be.true;
    expect(reply.sessionAttributes.state).to.equal("entry");
    expect(reply.speech).to.include("Hello! How are you?");
    expect(nockScope.isDone()).to.be.true;
  });

  it("should be setting the outgoing intent with input", async () => {
    const customProps = {
      input: [
        {
          name: "demo a",
          value: "another a"
        },
        {
          name: "demo b",
          value: "another b"
        }
      ]
    };

    nock.cleanAll();
    nockScope = nock(DASHBOT_URL)
      // logIncoming
      .post("/track")
      .query(true)
      .reply(200, "MOCK DATA")

      // logOutgoing
      .post("/track", body => {
        return (
          JSON.stringify(body.response.intent.input) ===
          JSON.stringify(customProps.input)
        );
      })
      .query(true)
      .reply(200, "MOCK DATA")
      .log(console.log);

    const spy = simple.spy(request => {
      request.dashbot.addInputs(customProps);
      return { say: "LaunchIntent.OpenResponse", flow: "yield", to: "entry" };
    });

    voxaApp.onIntent("LaunchIntent", spy);

    const event = {
      request: {
        type: "LaunchRequest",
        locale: "en-us"
      },
      session: {
        new: true,
        sessionId: "some",
        application: {
          applicationId: "appId"
        },
        user: {
          userId: "user-id"
        }
      }
    };

    try {
      nockScope.done();
    } catch (e) {
      console.log("error -> " + e); // pass exception object to error handler
    }

    register(voxaApp, dashbotConfig);
    const reply = await alexaSkill.execute(event as any);

    expect(spy.called).to.be.true;
    expect(reply.sessionAttributes.state).to.equal("entry");
    expect(reply.speech).to.include("Hello! How are you?");
    expect(nockScope.isDone()).to.be.true;
  });

  it("should be setting the outgoing intent with simple input", async () => {
    const customProps = {
      name: "demo name",
      value: "another value"
    };

    nock.cleanAll();
    nockScope = nock(DASHBOT_URL)
      // logIncoming
      .post("/track")
      .query(true)
      .reply(200, "MOCK DATA")

      // logOutgoing
      .post("/track", body => {
        return (
          JSON.stringify(body.response.intent.input) ===
          JSON.stringify([customProps])
        );
      })
      .query(true)
      .reply(200, "MOCK DATA")
      .log(console.log);

    const spy = simple.spy(request => {
      request.dashbot.addInputs(customProps);
      return { say: "LaunchIntent.OpenResponse", flow: "yield", to: "entry" };
    });

    voxaApp.onIntent("LaunchIntent", spy);

    const event = {
      request: {
        type: "LaunchRequest",
        locale: "en-us"
      },
      session: {
        new: true,
        sessionId: "some",
        application: {
          applicationId: "appId"
        },
        user: {
          userId: "user-id"
        }
      }
    };

    try {
      nockScope.done();
    } catch (e) {
      console.log("error -> " + e); // pass exception object to error handler
    }

    register(voxaApp, dashbotConfig);
    const reply = await alexaSkill.execute(event as any);

    expect(spy.called).to.be.true;
    expect(reply.sessionAttributes.state).to.equal("entry");
    expect(reply.speech).to.include("Hello! How are you?");
    expect(nockScope.isDone()).to.be.true;
  });

  it("should register DashbotAnalytics on LaunchRequest", async () => {
    const spy = simple.spy(() => ({
      say: "LaunchIntent.OpenResponse",
      flow: "yield",
      to: "entry",
    }));

    voxaApp.onIntent("LaunchIntent", spy);

    const event = {
      request: {
        type: "LaunchRequest",
        locale: "en-us",
      },
      session: {
        new: true,
        sessionId: "some",
        application: {
          applicationId: "appId",
        },
        user: {
          userId: "user-id",
        },
      },
    };

    register(voxaApp, dashbotConfig);
    const reply = await alexaSkill.execute(event as any);

    expect(spy.called).to.be.true;
    expect(reply.sessionAttributes.state).to.equal("entry");
    expect(reply.speech).to.include("Hello! How are you?");
    expect(nockScope.isDone()).to.be.true;
  });

  it("should register DashbotAnalytics on IntentRequest", async () => {
    const spy = simple.spy(() => ({
      flow: "yield",
      say: "Question.Ask",
      to: "entry",
    }));
    voxaApp.onIntent("SomeIntent", spy);

    const event = {
      request: {
        type: "IntentRequest",
        intent: {
          name: "SomeIntent",
        },
      },
      session: {
        new: false,
        application: {
          applicationId: "appId",
        },
        user: {
          userId: "user-id",
        },
      },
    };

    register(voxaApp, dashbotConfig);
    const reply = await alexaSkill.execute(event as any);
    expect(spy.called).to.be.true;
    expect(reply.sessionAttributes.state).to.equal("entry");
    expect(reply.speech).to.include("What time is it?");
    expect(nockScope.isDone()).to.be.true;
  });

  it("should register DashbotAnalytics on SessionEndedRequest", async () => {
    const spy = simple.spy((_, reply) => {
      return reply;
    });

    voxaApp.onSessionEnded(spy);

    const event = {
      request: {
        type: "SessionEndedRequest",
      },
      session: {
        new: false,
        application: {
          applicationId: "appId",
        },
        user: {
          userId: "user-id",
        },
      },
    };

    register(voxaApp, dashbotConfig);
    const reply = await alexaSkill.execute(event as any);
    expect(spy.called).to.be.true;
    expect(reply.version).to.equal("1.0");
    expect(nockScope.isDone()).to.be.true;
  });

  it("should register DashbotAnalytics on unexpected error", async () => {
    const intentSpy = simple.spy(() => {
      throw new Error("random error");
    });
    voxaApp.onIntent("ErrorIntent", intentSpy);

    const spy = simple.spy((_voxaEvent, _error, voxaReply) => {
      return voxaReply;
    });
    voxaApp.onError(spy);

    const event = {
      request: {
        type: "IntentRequest",
        intent: {
          name: "ErrorIntent",
        },
      },
      session: {
        new: false,
        application: {
          applicationId: "appId",
        },
        user: {
          userId: "user-id",
        },
      },
    };

    register(voxaApp, dashbotConfig);
    await alexaSkill.execute(event as any);
    expect(spy.called).to.be.true;
    expect(nockScope.isDone()).to.be.true;
  });

  it("should not record analytics if the user is ignored", async () => {
    const spy = simple.spy(() => ({
      say: "LaunchIntent.OpenResponse",
      flow: "yield",
      to: "entry",
    }));

    voxaApp.onIntent("LaunchIntent", spy);

    const event = {
      request: {
        type: "LaunchRequest",
      },
      session: {
        new: true,
        application: {
          applicationId: "appId",
        },
        user: {
          userId: "user-id",
        },
      },
    };

    const ignoreUsersConfig = _.cloneDeep(dashbotConfig);
    ignoreUsersConfig.ignoreUsers = ["user-id"];

    register(voxaApp, ignoreUsersConfig);
    const reply = await alexaSkill.execute(event as any);
    expect(reply.version).to.equal("1.0");
    expect(nockScope.isDone()).to.be.false;
  });

  it("should support regexex for ignored user ids", async () => {
    const spy = simple.spy(() => ({
      say: "LaunchIntent.OpenResponse",
      flow: "yield",
      to: "entry",
    }));

    voxaApp.onIntent("LaunchIntent", spy);

    const event = {
      request: {
        type: "LaunchRequest",
      },
      session: {
        new: true,
        application: {
          applicationId: "appId",
        },
        user: {
          userId: "user-id-with-something-random-appended",
        },
      },
    };

    const ignoreUsersConfig = _.cloneDeep(dashbotConfig);
    ignoreUsersConfig.ignoreUsers = [/^user-id.*$/];

    register(voxaApp, ignoreUsersConfig);
    const reply = await alexaSkill.execute(event as any);
    expect(reply.version).to.equal("1.0");
    expect(nockScope.isDone()).to.be.false;
  });

  it("should not record analytics if suppressSending === true", async () => {
    const spy = simple.spy(() => ({
      say: "LaunchIntent.OpenResponse",
      flow: "yield",
      to: "entry",
    }));

    voxaApp.onIntent("LaunchIntent", spy);

    const event = {
      request: {
        type: "LaunchRequest",
      },
      session: {
        new: true,
        application: {
          applicationId: "appId",
        },
        user: {
          userId: "user-id",
        },
      },
    };

    const suppressSendingConfig = _.cloneDeep(dashbotConfig);
    suppressSendingConfig.suppressSending = true;

    register(voxaApp, suppressSendingConfig);
    const reply = await alexaSkill.execute(event as any);
    expect(reply.version).to.equal("1.0");
  });

  it("should not record analytics due to Dashbot Error", async () => {
    const spy = simple.spy((_voxaEvent, reply) => reply);
    voxaApp.onSessionEnded(spy);

    const event = {
      request: {
        type: "SessionEndedRequest",
      },
      session: {
        new: false,
        application: {
          applicationId: "appId",
        },
        user: {
          userId: "user-id",
        },
      },
    };

    register(voxaApp, dashbotConfig);
    const reply = await alexaSkill.execute(event as any);
    expect(reply.version).to.equal("1.0");
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
    "GameEngine.InputHandlerEvent",
    "Alexa.Presentation.APL.UserEvent",
    "Alexa.Presentation.APLT.UserEvent",
    "Messaging.MessageReceived",
  ];

  describe("Custom Alexa Intents", () => {
    for (const requestType of alexaRequestTypes) {
      it(`should record alexa ${requestType}`, async () => {
        const spy = simple.spy((_request, reply) => reply || {});

        voxaApp[`on${requestType}`](spy);
        voxaApp.onIntent(requestType, spy);

        const event = {
          request: {
            type: requestType,
            locale: "en-us",
          },
          session: {
            new: true,
            sessionId: "some",
            application: {
              applicationId: "appId",
            },
            user: {
              userId: "user-id",
            },
          },
        };

        register(voxaApp, dashbotConfig);
        await alexaSkill.execute(event as any);

        expect(spy.called).to.be.true;
        expect(nockScope.isDone()).to.be.true;
      });
    }
  });

  it("should not crash the skill on an unexpected reply from dashbot", async () => {
    nock.cleanAll();
    nockScope = nock(DASHBOT_URL)
      .post("/track")
      .query(true)
      .replyWithError("Some API ERROR")
      .persist();

    const spy = simple.spy(() => ({
      say: "LaunchIntent.OpenResponse",
      flow: "yield",
      to: "entry",
    }));

    voxaApp.onIntent("LaunchIntent", spy);

    const event = {
      request: {
        type: "LaunchRequest",
        locale: "en-us",
      },
      session: {
        new: true,
        sessionId: "some",
        application: {
          applicationId: "appId",
        },
        user: {
          userId: "user-id",
        },
      },
    };

    register(voxaApp, dashbotConfig);
    const reply = await alexaSkill.execute(event as any);

    expect(spy.called).to.be.true;
    expect(reply.sessionAttributes.state).to.equal("entry");
    expect(reply.speech).to.include("Hello! How are you?");
    expect(nockScope.isDone()).to.be.true;
  });

  it("should support sending a custom event", async () => {
    nock.cleanAll();
    nockScope = nock(DASHBOT_URL)
      .post("/track")
      .query(true)
      .reply(200, "MOCK DATA")

      .post("/track", {
        type: "customEvent",
        name: "CUSTOM EVENT",
        userId: "user-id",
        conversationId: "some",
      })
      .query(true)
      .reply(200, "MOCK DATA")

      .post("/track")
      .query(true)
      .reply(200, "MOCK DATA");

    const spy = simple.spy(async (request) => {
      await request.dashbot.trackEvent({
        type: "customEvent",
        name: "CUSTOM EVENT",
      });
      return {
        say: "LaunchIntent.OpenResponse",
        flow: "yield",
        to: "entry",
      };
    });

    voxaApp.onIntent("LaunchIntent", spy);

    const event = {
      request: {
        type: "LaunchRequest",
        locale: "en-us",
      },
      session: {
        new: true,
        sessionId: "some",
        application: {
          applicationId: "appId",
        },
        user: {
          userId: "user-id",
        },
      },
    };

    register(voxaApp, dashbotConfig);
    const reply = await alexaSkill.execute(event as any);
    expect(spy.called).to.be.true;
    expect(reply.sessionAttributes.state).to.equal("entry");
    expect(reply.speech).to.include("Hello! How are you?");
    expect(nockScope.isDone()).to.be.true;
  });
});
