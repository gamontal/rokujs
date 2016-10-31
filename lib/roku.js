'use strict';

const parseString = require('xml2js').parseString;
const request = require('request');

let Roku = function (rokuIp) {
  if (!(this instanceof Roku)) {
    return new Roku(rokuIp);
  }

  if (!rokuIp) {
    throw new Error('Roku IP required');
  }

  this.ip = rokuIp;
  this.url = 'http://' + this.ip + ':8060/';
};

const keypress = function (roku, key) {
  request.post(roku.url + 'keypress/' + key, function (err, res) {
    if (err) {
      return console.log(err);
    }
  });
};

Roku.prototype = {
  home: function () { keypress(this, 'home'); },
  rev: function () { keypress(this, 'rev'); },
  fwd: function () { keypress(this, 'fwd'); },
  play: function () { keypress(this, 'play'); },
  select: function () { keypress(this, 'select'); },
  left: function () { keypress(this, 'left'); },
  right: function () { keypress(this, 'right'); },
  down: function () { keypress(this, 'down'); },
  up: function () { keypress(this, 'up'); },
  back: function () { keypress(this, 'back'); },
  replay: function () { keypress(this, 'replay'); },
  backspace: function () { keypress(this, 'backspace'); },
  search: function () { keypress(this, 'search'); },
  enter: function () { keypress(this, 'enter'); },
  literal: function () { keypress(this, 'literal'); },

  commands: [
    'back', 'backspace', 'down', 'enter',
    'forward', 'home', 'info', 'left',
    'literal', 'play', 'replay', 'reverse',
    'right', 'search', 'select', 'up'
  ],

  apps: function (cb) {
    let apps = [];

    request.get(this.url + 'query/apps', function (err, res) {
      if (err) {
        return cb(err);
      }

      parseString(res.body, function (err, result) {
        if (err) {
          return cb(err);
        }

        for (let app of result.apps.app) {
          if (!isNaN(parseFloat(app['$'].id)) && isFinite(app['$'].id)) {
            apps.push({ id: parseFloat(app['$'].id), name: app['_'] });
          }
        }

        cb(null, apps);
      });
    });
  },

  launch: function (appId, cb) {
    if (!appId) {
      throw new Error('App ID is required');
    }

    return request.post(this.url + 'launch/' + appId);
  }
};

module.exports = Roku;