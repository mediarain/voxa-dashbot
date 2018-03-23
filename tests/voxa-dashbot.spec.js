'use strict';

const _ = require('lodash');
const chai = require('chai');
const simple = require('simple-mock');
const nock = require('nock');
const Voxa = require('voxa');

const voxaDashbot = require('../lib/Voxa-Dashbot');
const views = require('./views');
const version = require('../package').dependencies.dashbot.replace('^', '');

console.log('DASHBOT VERSION', version);

const expect = chai.expect;
const DASHBOT_URL = 'https://tracker.dashbot.io';
const dashbotConfig = {
  api_key: 'some_api_key',
};

let voxaStateMachine;

describe('Voxa-Dashbot plugin', () => {
  beforeEach(() => {
    voxaStateMachine = new Voxa({ views });

    nock(DASHBOT_URL)
      .post(`/track?apiKey=${dashbotConfig.api_key}&type=incoming&platform=alexa&v=${version}-npm`)
      .reply(200, 'MOCK DATA')
      .post(`/track?apiKey=${dashbotConfig.api_key}&type=outgoing&platform=alexa&v=${version}-npm`)
      .reply(200, 'MOCK DATA');
  });

  afterEach(() => {
    simple.restore();
    nock.cleanAll();
  });

  it('should register DashbotAnalytics on LaunchRequest', () => {
    const spy = simple.spy(() => ({ reply: 'LaunchIntent.OpenResponse', to: 'entry' }));
    voxaStateMachine.onIntent('LaunchIntent', spy);

    const event = {
      request: {
        type: 'LaunchRequest',
      },
      session: {
        new: true,
        sessionId: 'some',
        application: {
          applicationId: 'appId',
        },
        user: {
          userId: 'user-id',
        },
      },
    };

    voxaDashbot(voxaStateMachine, dashbotConfig);
    return voxaStateMachine.execute(event)
      .then((reply) => {
        expect(spy.called).to.be.true;
        expect(reply.session.new).to.equal(true);
        expect(reply.session.attributes.state).to.equal('entry');
        expect(reply.msg.statements).to.have.lengthOf(1);
        expect(reply.msg.statements[0]).to.equal('Hello! How are you?');
      });
  });

  it('should register DashbotAnalytics on IntentRequest', () => {
    const spy = simple.spy(() => ({ reply: 'Question.Ask', to: 'entry' }));
    voxaStateMachine.onIntent('SomeIntent', spy);

    const event = {
      request: {
        type: 'IntentRequest',
        intent: {
          name: 'SomeIntent',
        },
      },
      session: {
        new: false,
        application: {
          applicationId: 'appId',
        },
        user: {
          userId: 'user-id',
        },
      },
    };

    voxaDashbot(voxaStateMachine, dashbotConfig);
    return voxaStateMachine.execute(event)
      .then((reply) => {
        expect(spy.called).to.be.true;
        expect(reply.session.new).to.equal(false);
        expect(reply.session.attributes.state).to.equal('entry');
        expect(reply.msg.statements).to.have.lengthOf(1);
        expect(reply.msg.statements[0]).to.equal('What time is it?');
      });
  });

  it('should register DashbotAnalytics on SessionEndedRequest', () => {
    const spy = simple.spy(() => ({ reply: 'ExitIntent.GeneralExit' }));
    voxaStateMachine.onSessionEnded(spy);

    const event = {
      request: {
        type: 'SessionEndedRequest',
      },
      session: {
        new: false,
        application: {
          applicationId: 'appId',
        },
        user: {
          userId: 'user-id',
        },
      },
    };

    voxaDashbot(voxaStateMachine, dashbotConfig);
    return voxaStateMachine.execute(event)
      .then((reply) => {
        expect(spy.called).to.be.true;
        expect(reply.version).to.equal('1.0');
      });
  });

  it('should register DashbotAnalytics on unexpected error', () => {
    const intentSpy = simple.spy(() => {
      throw new Error('random error');
    });
    voxaStateMachine.onIntent('ErrorIntent', intentSpy);

    const spy = simple.spy(() => ({ reply: 'BadInput.RepeatLastAskReprompt', to: 'invalid-state' }));
    voxaStateMachine.onError(spy);

    const event = {
      request: {
        type: 'IntentRequest',
        intent: {
          name: 'ErrorIntent',
        },
      },
      session: {
        new: false,
        application: {
          applicationId: 'appId',
        },
        user: {
          userId: 'user-id',
        },
      },
    };

    voxaDashbot(voxaStateMachine, dashbotConfig);
    return voxaStateMachine.execute(event)
      .then((reply) => {
        expect(spy.called).to.be.true;
        expect(reply.reply).to.equal('BadInput.RepeatLastAskReprompt');
        expect(reply.to).to.equal('invalid-state');
        expect(reply.error.toString()).to.equal('Error: random error');
      });
  });

  it('should not record analytics if the user is ignored', () => {
    const spy = simple.spy(() => ({ reply: 'ExitIntent.GeneralExit' }));
    voxaStateMachine.onSessionEnded(spy);

    const event = {
      request: {
        type: 'SessionEndedRequest',
      },
      session: {
        new: false,
        application: {
          applicationId: 'appId',
        },
        user: {
          userId: 'user-id',
        },
      },
    };

    const ignoreUsersConfig = _.cloneDeep(dashbotConfig);
    ignoreUsersConfig.ignoreUsers = ['user-id'];

    voxaDashbot(voxaStateMachine, ignoreUsersConfig);
    return voxaStateMachine.execute(event)
      .then((reply) => {
        expect(reply.version).to.equal('1.0');
      });
  });

  it('should not record analytics if suppressSending === true', () => {
    const spy = simple.spy(() => ({ reply: 'ExitIntent.GeneralExit' }));
    voxaStateMachine.onSessionEnded(spy);

    const event = {
      request: {
        type: 'SessionEndedRequest',
      },
      session: {
        new: false,
        application: {
          applicationId: 'appId',
        },
        user: {
          userId: 'user-id',
        },
      },
    };

    const suppressSendingConfig = _.cloneDeep(dashbotConfig);
    suppressSendingConfig.suppressSending = true;

    voxaDashbot(voxaStateMachine, suppressSendingConfig);
    return voxaStateMachine.execute(event)
      .then((reply) => {
        expect(reply.version).to.equal('1.0');
      });
  });

  it('should record sessions terminated due to errors as an error', () => {
    const event = {
      request: {
        type: 'SessionEndedRequest',
        reason: 'ERROR',
        error: {
          message: 'my message'
        }
      },
      session: {
        new: false,
        application: {
          applicationId: 'appId',
        },
        user: {
          userId: 'user-id',
        },
      },
    };

    voxaDashbot(voxaStateMachine, dashbotConfig);
    return voxaStateMachine.execute(event)
      .then((reply) => {
        expect(reply.msg.statements[0]).to.equal('An unrecoverable error occurred.');
      });
  });
});

describe('Voxa-Dashbot plugin error', () => {
  beforeEach(() => {
    voxaStateMachine = new Voxa({ views });

    nock(DASHBOT_URL)
      .post(`/track?apiKey=${dashbotConfig.api_key}&type=incoming&platform=alexa&v=${version}-npm`)
      .reply(400, { bodyUsed: true });
  });

  afterEach(() => {
    simple.restore();
    nock.cleanAll();
  });

  it('should not record analytics due to Dashbot Error', () => {
    const spy = simple.spy(() => ({ reply: 'ExitIntent.GeneralExit' }));
    voxaStateMachine.onSessionEnded(spy);

    const event = {
      request: {
        type: 'SessionEndedRequest',
      },
      session: {
        new: false,
        application: {
          applicationId: 'appId',
        },
        user: {
          userId: 'user-id',
        },
      },
    };

    voxaDashbot(voxaStateMachine, dashbotConfig);
    return voxaStateMachine.execute(event)
      .then((reply) => {
        expect(reply.version).to.equal('1.0');
      });
  });
});
