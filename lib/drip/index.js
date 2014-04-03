
/**
 * Module dependencies.
 */

var integration = require('segmentio-integration');
var fmt = require('util').format;
var find = require('obj-case');

/**
 * Expose `Drip`
 */

var Drip = module.exports = integration('Drip')
  .endpoint('https://api.getdrip.com/v1')
  .retries(2);

/**
 * Enabled.
 *
 * Drip is enabled only on the serverside.
 *
 * @param {Facade} msg
 * @param {Object} settings
 * @return {Boolean}
 * @api public
 */

Drip.prototype.enabled = function(msg, settings){
  return !! (msg.enabled(this.name)
    && 'server' == msg.channel()
    && msg.email
    && msg.email());
};

/**
 * Validate.
 *
 * @param {Facade} msg
 * @param {Object} settings
 * @return {Error}
 * @api public
 */

Drip.prototype.validate = function(msg, settings){
  var err = this.ensure(settings.token, 'token')
    || this.ensure(settings.accountId, 'accountId');

  if ('identify' == msg.action()) {
    var campaignId = this.campaignId(msg, settings);
    err = err || this.ensure(campaignId, 'campaignId');
  }

  return err;
};

/**
 * Identify.
 *
 * https://www.getdrip.com/docs/rest-api#subscribers
 *
 * @param {Identify} identify
 * @param {Object} settings
 * @param {Function} fn
 * @api public
 */

Drip.prototype.identify = function(identify, settings, fn){
  var campaignId = this.campaignId(identify, settings);
  var accountId = settings.accountId;
  var url = fmt('/%s/campaigns/%s/subscribers', accountId, campaignId);
  var subscriber = {};

  subscriber.email = identify.email();
  subscriber.utc_offset = 0;
  subscriber.double_optin = false;
  subscriber.starting_email_index = 0;
  subscriber.custom_fields = identify.traits();
  subscriber.reactivate_if_unsubscribed = false;

  this
    .post(url)
    .type('json')
    .send({ subscribers: [subscriber] })
    .end(this.handle(fn));
};

/**
 * Track.
 *
 * https://www.getdrip.com/docs/rest-api#events
 *
 * @param {Track} track
 * @param {Object} settings
 * @param {Function} fn
 * @api public
 */

Drip.prototype.track = function(track, settings, fn){
  var accountId = settings.accountId;
  var url = fmt('/%s/events', accountId);
  var event = {};
  if (track.revenue()) event.value = track.revenue();
  event.action = track.event();
  event.email = track.email();

  this
    .post(url)
    .type('json')
    .send({ events: [event] })
    .end(this.handle(fn));
};

/**
 * Get campaignId from settings or options.
 *
 * @param {Facade} msg
 * @param {Object} settings
 * @return {Mixed}
 * @api private
 */

Drip.prototype.campaignId = function(msg, settings){
  var opts = msg.options(this.name) || {};
  return settings.campaignId || find(opts, 'campaignId');
};