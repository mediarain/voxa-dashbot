"use strict";

const _ = require("lodash");
const chai = require("chai");
const simple = require("simple-mock");
const nock = require("nock");
const { VoxaApp, AlexaPlatform } = require("voxa");

const { register } = require("../lib/Voxa-Dashbot");
const views = require("./views");
const version = require("../package").dependencies.dashbot.replace("^", "");

const expect = chai.expect;
const DASHBOT_URL = "https://tracker.dashbot.io";
const dashbotConfig = {
  api_key: "some_api_key"
};

describe("Voxa-Dashbot plugin", () => {
  let voxaApp;
  let alexaSkill;
  let nockScope;
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

  it("should register DashbotAnalytics on LaunchRequest", async () => {
    const spy = simple.spy(() => ({
      say: "LaunchIntent.OpenResponse",
      flow: "yield",
      to: "entry"
    }));

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

    register(voxaApp, dashbotConfig);
    const reply = await alexaSkill.execute(event);

    expect(spy.called).to.be.true;
    expect(reply.sessionAttributes.state).to.equal("entry");
    expect(reply.speech).to.include("Hello! How are you?");
    expect(nockScope.isDone()).to.be.true;
  });

  it("should register DashbotAnalytics on IntentRequest", async () => {
    const spy = simple.spy(() => ({
      flow: "yield",
      say: "Question.Ask",
      to: "entry"
    }));
    voxaApp.onIntent("SomeIntent", spy);

    const event = {
      request: {
        type: "IntentRequest",
        intent: {
          name: "SomeIntent"
        }
      },
      session: {
        new: false,
        application: {
          applicationId: "appId"
        },
        user: {
          userId: "user-id"
        }
      }
    };

    register(voxaApp, dashbotConfig);
    const reply = await alexaSkill.execute(event);
    expect(spy.called).to.be.true;
    expect(reply.sessionAttributes.state).to.equal("entry");
    expect(reply.speech).to.include("What time is it?");
    expect(nockScope.isDone()).to.be.true;
  });

  it("should register DashbotAnalytics on SessionEndedRequest", async () => {
    const spy = simple.spy((voxaEvent, reply) => {
      return reply;
    });

    voxaApp.onSessionEnded(spy);

    const event = {
      request: {
        type: "SessionEndedRequest"
      },
      session: {
        new: false,
        application: {
          applicationId: "appId"
        },
        user: {
          userId: "user-id"
        }
      }
    };

    register(voxaApp, dashbotConfig);
    const reply = await alexaSkill.execute(event);
    expect(spy.called).to.be.true;
    expect(reply.version).to.equal("1.0");
    expect(nockScope.isDone()).to.be.true;
  });

  it("should register DashbotAnalytics on unexpected error", async () => {
    const intentSpy = simple.spy(() => {
      throw new Error("random error");
    });
    voxaApp.onIntent("ErrorIntent", intentSpy);

    const spy = simple.spy((voxaEvent, error, voxaReply) => {
      return voxaReply;
    });
    voxaApp.onError(spy);

    const event = {
      request: {
        type: "IntentRequest",
        intent: {
          name: "ErrorIntent"
        }
      },
      session: {
        new: false,
        application: {
          applicationId: "appId"
        },
        user: {
          userId: "user-id"
        }
      }
    };

    register(voxaApp, dashbotConfig);
    const reply = await alexaSkill.execute(event);
    expect(spy.called).to.be.true;
    expect(nockScope.isDone()).to.be.true;
  });

  it("should not record analytics if the user is ignored", () => {
    const spy = simple.spy((voxaEvent, reply) => {
      return reply;
    });
    voxaApp.onSessionEnded(spy);

    const event = {
      request: {
        type: "SessionEndedRequest"
      },
      session: {
        new: false,
        application: {
          applicationId: "appId"
        },
        user: {
          userId: "user-id"
        }
      }
    };

    const ignoreUsersConfig = _.cloneDeep(dashbotConfig);
    ignoreUsersConfig.ignoreUsers = ["user-id"];

    register(voxaApp, ignoreUsersConfig);
    return alexaSkill.execute(event).then(reply => {
      expect(reply.version).to.equal("1.0");
    });
  });

  it("should not record analytics if suppressSending === true", () => {
    const spy = simple.spy((voxaEvent, reply) => reply);
    voxaApp.onSessionEnded(spy);

    const event = {
      request: {
        type: "SessionEndedRequest"
      },
      session: {
        new: false,
        application: {
          applicationId: "appId"
        },
        user: {
          userId: "user-id"
        }
      }
    };

    const suppressSendingConfig = _.cloneDeep(dashbotConfig);
    suppressSendingConfig.suppressSending = true;

    register(voxaApp, suppressSendingConfig);
    return alexaSkill.execute(event).then(reply => {
      expect(reply.version).to.equal("1.0");
    });
  });

  it("should not record analytics due to Dashbot Error", () => {
    const spy = simple.spy((voxaEvent, reply) => reply);
    voxaApp.onSessionEnded(spy);

    const event = {
      request: {
        type: "SessionEndedRequest"
      },
      session: {
        new: false,
        application: {
          applicationId: "appId"
        },
        user: {
          userId: "user-id"
        }
      }
    };

    register(voxaApp, dashbotConfig);
    return alexaSkill.execute(event).then(reply => {
      expect(reply.version).to.equal("1.0");
    });
  });
});
