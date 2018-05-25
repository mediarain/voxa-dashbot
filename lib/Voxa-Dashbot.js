'use strict';

const _ = require('lodash');
const DashbotAnalytics = require('dashbot');
const debug = require('debug')('voxa:dashbot');

const defaultConfig = {
  ignoreUsers: [],
};

const dashbotIntegrations = {
  dialogFlow: 'google',
  alexa: 'alexa',
};

module.exports = register;

function register(skill, config) {
  const pluginConfig = _.merge({}, defaultConfig, config);

  const dashbotConfig = {
    debug: pluginConfig.debug,
    printErrors: true,
  };

  skill.onRequestStarted(trackIncoming);
  skill.onBeforeReplySent(trackOutgoing);

  function trackIncoming(request) {
    if (_.includes(pluginConfig.ignoreUsers, request.user.userId)) return Promise.resolve(null);
    if (pluginConfig.suppressSending) return Promise.resolve(null);
    const { rawEvent, platform } = request;
    const apiKey = _.get(pluginConfig, [platform, 'api_key']) || pluginConfig.api_key;

    const Dashbot = DashbotAnalytics(apiKey, dashbotConfig)[dashbotIntegrations[platform]];
    debug('Sending to dashbot');
    // PROCESSING INCOMING RESPONSE
    return Dashbot.logIncoming(rawEvent);
  }

  function trackOutgoing(request, reply) {
    if (_.includes(pluginConfig.ignoreUsers, request.user.userId)) return Promise.resolve(null);
    if (pluginConfig.suppressSending) return Promise.resolve(null);
    const { rawEvent, platform } = request;
    const apiKey = _.get(pluginConfig, [platform, 'api_key']) || pluginConfig.api_key;

    const Dashbot = DashbotAnalytics(apiKey, dashbotConfig)[dashbotIntegrations[platform]];
    debug('Sending to dashbot');
    // PROCESSING INCOMING RESPONSE
    return Dashbot.logOutgoing(rawEvent, reply);
  }
}
