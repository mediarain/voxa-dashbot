'use strict';

const _ = require('lodash');
const DashbotAnalytics = require('dashbot');
const debug = require('debug')('voxa:dashbot');

const defaultConfig = {
  ignoreUsers: [],
};

module.exports = register;

function register(skill, config) {
  const pluginConfig = _.merge({}, defaultConfig, config);
  const dashbotConfig = {
    debug: pluginConfig.debug || true,
    printErrors: true,
  };

  const Dashbot = DashbotAnalytics(pluginConfig.api_key, dashbotConfig).alexa;

  skill.onRequestStarted(track);
  skill.onBeforeReplySent(track);

  function track(request, reply, transition) {
    if (_.includes(pluginConfig.ignoreUsers, request.user.userId)) return Promise.resolve(null);
    if (pluginConfig.suppressSending) return Promise.resolve(null);

    debug('Sending to dashbot');

    const newRequestObject = _.pick(request, ['version', 'session', 'context', 'request']);

    if (transition) {
      return Dashbot.logOutgoing(newRequestObject, reply.toJSON())
        .then(response => response.text())
        .then((response) => {
          console.log('Dashbot', 'logOutgoing response', response);
          return response;
        });
    }

    return Dashbot.logIncoming(newRequestObject)
      .then(response => response.text())
      .then((response) => {
        console.log('Dashbot', 'logIncoming response', response);
        return response;
      });
  }
}
