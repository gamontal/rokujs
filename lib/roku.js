'use strict';

const SSDPClient = require('node-ssdp').Client;
const ssdp = new SSDPClient();
const _ = require('lodash');
const request = require('request');
const parseString = require('xml2js').parseString;

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

// Roku keypress functions
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
  literal: function () { keypress(this, 'literal'); }, // todo: test

  // Roku available commands
  commands: [
    'back', 'backspace', 'down', 'enter',
    'forward', 'home', 'info', 'left',
    'literal', 'play', 'replay', 'reverse',
    'right', 'search', 'select', 'up'
  ],

  // Discover nearby Roku devices and get their IPs using SSDP
  discover: function (timeout, cb) {
    if (typeof timeout === 'function') {
      cb = timeout;
      timeout = 7000; // 7 sec by default
    } else {
      timeout = Math.trunc(Number(timeout));
    }

    const devices = [];
    ssdp.on('response', function inResponse(headers, code, rinfo) {
      devices.push({
        server: headers['SERVER'],
        address: rinfo['address'],
        location: headers['LOCATION'],
        usn: headers['USN'],
      });
    });

    setTimeout(function () {
      ssdp.search('roku:ecp')
    }, timeout / 2);

    setTimeout(function () {
      ssdp.stop()
      return cb(devices);
    }, timeout);
  },

  delay: function () { }, // todo

  // Launch an app by ID
  launch: function (appId) {
    if (!appId) {
      throw new Error('App ID is required');
    }

    return request.post(this.url + 'launch/' + Number(appId));
  },

  // Fetch installed apps
  apps: function (options, cb) {
    const url = this.url;

    if (typeof options === 'function') {
      cb = options;
    }

    const id = options.id || null;
    const name = options.name || null;

    request.get(url + 'query/apps', function (err, res) {
      if (err) {
        return cb(err);
      }

      parseString(res.body, function (err, result) {
        let apps = [];

        // parse the list of apps
        for (let i of result.apps.app) {
          if (i['$'].type === 'appl') {
            let meta = i['$'];

            let app = {
              id: Number(meta.id),
              name: i['_'],
              version: meta.version
            };

            apps.push(app);
          }
        }

        for (let app of apps) {
          if ((id && Number(id) === app.id) || (name && name.toLowerCase() === app.name.toLowerCase())) {
            app.launch = function () {
              request.post(url + 'launch/' + this.id);
            };

            return cb(null, app);
          }
        }

        if (id || name) {
          return cb({ error: 'App not found' });
        }

        cb(null, apps);
      });
    });
  },

  info: function (cb) {
    request.get(this.url, function (err, res) {
      parseString(res.body, function (err, result) {
        const device = result.root.device[0];

        cb({
          device_type: device.deviceType[0],
          friendly_name: device.friendlyName[0],
          manufacturer: device.manufacturer[0],
          manufacturer_url: device.manufacturerURL[0],
          model_description: device.modelDescription[0],
          model_name: device.modelName[0],
          model_number: device.modelNumber[0],
          model_url: device.modelURL[0],
          serial_number: device.serialNumber[0],
          udn: device.UDN[0],
          service_list: function () {
            let list = [];
            for (let service of device.serviceList[0].service) {
              service = {
                service_type: service.serviceType[0],
                service_id: service.serviceId[0],
                control_url: service.controlUrl ? service.controlUrl[0] : null,
                event_sub_url: service.eventSubUrl ? service.eventSubUrl[0] : null,
                scpdurl: service.SCPDURL[0]
              };

              list.push(service);
            }

            return list;
          } ()
        });
      });
    });
  }
};

module.exports = Roku;