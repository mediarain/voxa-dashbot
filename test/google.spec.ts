"use strict";

import _ from "lodash";
import chai from "chai";
import simple from "simple-mock";
import nock from "nock";
import { VoxaApp, GoogleAssistantPlatform } from "voxa";

import { register } from "../src";
import * as views from "./views";
import * as launch from "./requests/default-welcome-intent.json";

const expect = chai.expect;
const DASHBOT_URL = "https://tracker.dashbot.io";
const dashbotConfig: any = {
  google: "some_api_key",
  // debug: true
};

describe("Voxa-Dashbot plugin", () => {
  let voxaApp: VoxaApp;
  let googleAction: GoogleAssistantPlatform;
  let nockScope: nock.Scope;

  beforeEach(() => {
    voxaApp = new VoxaApp({ views });
    register(voxaApp, dashbotConfig);
    googleAction = new GoogleAssistantPlatform(voxaApp);
  });

  afterEach(() => {
    simple.restore();
    nock.cleanAll();
  });

  it("should set the userStorage.dashbotUser.userId", async () => {
    console.log("=========================================================");
    nockScope = nock(DASHBOT_URL)
      .post("/track")
      .query(true)
      .reply(200, "MOCK DATA")
      .post("/track", (body) => {
        console.log(JSON.stringify(body.message, null, 2));
        console.log(
          "========================================================="
        );
        const storageJSON = _.get(body, "message.payload.google.userStorage");
        if (!storageJSON) {
          return false;
        }

        const storage = JSON.parse(storageJSON);
        return (storage.data.voxa.userId = storage.data.dashbotUser.userId);
      })
      .query(true)
      .reply(200, "MOCK DATA");

    const spy = simple.spy(() => ({
      say: "LaunchIntent.OpenResponse",
      flow: "yield",
      to: "entry",
    }));
    voxaApp.onState("input.welcome", spy);
    const reply = await googleAction.execute(launch);
    console.log(JSON.stringify(reply, null, 2));

    expect(spy.called).to.be.true;
    expect(nockScope.isDone()).to.be.true;
  });
});
