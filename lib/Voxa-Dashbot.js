'use strict';

const _ = require('lodash');
const DashbotAnalytics = require('dashbot');
const lambdaLog = require('lambda-log');

const defaultConfig = {
  ignoreUsers: [],
};

module.exports = register;

function register(skill, config) {
  const pluginConfig = _.merge({}, defaultConfig, config);

  const dashbotConfig = {
    debug: pluginConfig.debug,
    printErrors: true,
  };

  const Dashbot = DashbotAnalytics(pluginConfig.api_key, dashbotConfig).alexa;

  skill.onBeforeReplySent(track);
  skill.onSessionEnded((request, reply, transition) => {
    track(request, reply, transition, true);
  });

  function track(request, reply, transition, isSessionEndedRequest) {
    if (_.includes(pluginConfig.ignoreUsers, request.user.userId)) return Promise.resolve(null);
    if (pluginConfig.suppressSending) return Promise.resolve(null);
    if (isSessionEndedRequest && request.request.type !== 'SessionEndedRequest') return Promise.resolve(null);

    lambdaLog.info('Sending to dashbot');

    const newRequestObject = _.pick(request, ['version', 'session', 'context', 'request']);

    // PROCESSING INCOMING RESPONSE
    return Dashbot.logIncoming(newRequestObject)
      .then(response => response.text())
      .then((response) => {
        lambdaLog.info('logIncoming response', { response });

        // PROCESSING OUTGOING RESPONSE
        return Dashbot.logOutgoing(newRequestObject, reply.toJSON());
      })
      .then(response => response.text())
      .then((response) => {
        lambdaLog.info('logOutgoing response', { response });
        return response;
      })
      .catch((err) => {
        lambdaLog.error(err);
      });
  }
}
