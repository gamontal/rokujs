/*
The MIT License (MIT)

Copyright (c) 2016 Gabriel Montalvo

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use strict';

const async = require('async');
const request = require('request');
const parseString = require('xml2js').parseString;
const SSDPClient = require('node-ssdp').Client;
const ssdp = new SSDPClient();

let Roku = function (rokuIp) {
  if (!(this instanceof Roku)) {
    return new Roku(rokuIp);
  }

  if (!rokuIp || typeof rokuIp !== 'string') {
    throw new Error('Roku IP required');
  }

  this.ip = rokuIp;
  this.url = 'http://' + this.ip + ':8060/';
  this.commandQueue = [];
  this.queued = false;
};

// Discover nearby Roku devices and get their IPs using SSDP
// (Make sure your firewall is disabled before testing)
Roku.discover = function (timeout, cb) {
  if (typeof timeout === 'function') {
    cb = timeout;
    timeout = 7000; // 7 sec by default
  } else {
    timeout = Math.trunc(Number(timeout));
  }

  const devices = [];

  ssdp.on('response', function inResponse(headers, code, rinfo) {
    devices.push({
      server: headers.SERVER,
      address: rinfo.address,
      location: headers.LOCATION,
      usn: headers.USN,
    });
  });

  setTimeout(function () {
    ssdp.search('roku:ecp');
  }, timeout / 2);

  setTimeout(function () {
    ssdp.stop();
    return cb(devices);
  }, timeout);
};

Roku.keys = [
  'home', 'rev', 'fwd', 'play',
  'select', 'left', 'right', 'down',
  'up', 'back', 'replay', 'info',
  'backspace', 'enter', 'volumeDown', 'volumeUp',
  'volumeMute', 'inputTuner', 'inputHDMI1', 'inputHDMI2',
  'inputHDMI3', 'inputHDMI4', 'inputAV1', 'channelUp',
  'channelDown'
];

Roku.prototype.processQueue = function () {
  let that = this;

  if (!this.queued) {
    let queue = this.commandQueue;
    this.queued = true;

    async.whilst(function () {
      return queue.length;
    }, function (fn) {
      queue.shift()(fn);
    }, function () {
      that.queued = false;
    });
  }
};

Roku.prototype.delay = function (ms) {
  this.commandQueue.push(function (cb) {
    setTimeout(function () {
      cb();
    }, ms);
  });

  this.processQueue();
};

Roku.prototype.press = function (key) {
  if (!key) {
    throw new Error('Key is required');
  }

  this.commandQueue.push(function (cb) {
    request.post(this.url + 'keypress/' + key, cb);
  }.bind(this));

  this.processQueue();
};

// Launch an app by ID
Roku.prototype.launch = function (appId) {
  if (!appId) {
    throw new Error('App ID is required');
  }

  const url = this.url;

  this.commandQueue.push(function (cb) {
    request.post(url + 'launch/' + Number(appId), cb);
  });

  this.processQueue();
};

// Fetch installed apps
Roku.prototype.apps = function (options, cb) {
  if (typeof options === 'function') {
    cb = options;
  }

  const url = this.url + 'query/apps';
  const id = options.id || null;
  const name = options.name || null;

  request.get(url, function (err, res) {
    if (err) {
      return cb(err);
    }

    parseString(res.body, function (err, result) {
      let apps = [];

      // parse the list of apps
      for (let i of result.apps.app) {
        if (i.$.type === 'appl') {
          let meta = i.$;

          let app = {
            id: Number(meta.id),
            name: i._,
            version: meta.version
          };

          apps.push(app);
        }
      }

      for (let app of apps) {
        if ((id && Number(id) === app.id) ||
          (name && name.toLowerCase() === app.name.toLowerCase())) {
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
};

/*
Roku.prototype.tvChannels = function (cb) {
  request.get(this.url + 'query/tv-channels', function (err, res) {
    parseString(res.body, function (err, result) {
      if (result['tv-channels'] === '') {
        return cb([]);
      }

      const channels = result['tv-channels'].channel;
      let parsedChannels = [];

      for (let channel of channels) {
        parsedChannels.push({
          number: parseFloat(channel.number[0]),
          name: channel.name[0],
          type: channel.type[0],
          user_hidden: Boolean(channel['user-hidden'][0])
        });
      }

      cb(parsedChannels);
    });
  });
};*/

/*
Roku.prototype.active = function (arg, cb) {
  const url = this.url;

  if (typeof arg !== 'string') {
    throw new Error('Invalid argument type');
  }

  switch (arg.toLowerCase()) {
    case 'tvchannel':
      request.get(url + 'query/tv-active-channel', function (err, res) {
        parseString(res.body, function (err, result) {
          const channel = result['tv-channel'].channel[0];

          if (channel === '') {
            return cb({});
          }

          return cb({
            number: parseFloat(channel.number[0]),
            name: channel.name[0],
            type: channel.type[0],
            user_hidden: Boolean(channel['user-hidden'][0]),
            active_input: Boolean(channel['active-input'][0]),
            signal_state: channel['signal-state'][0],
            signal_mode: channel['signal-mode'][0],
            signal_quality: parseFloat(channel['signal-quality'][0]),
            signal_strength: parseFloat(channel['signal-strength'][0]),
            program_title: channel['program-title'][0],
            program_description: channel['program-description'][0],
            program_ratings: channel['program-ratings'][0],
            program_analog_audio: channel['program-analog-audio'][0],
            program_digital_audio: channel['program-digital-audio'][0],
            program_audio_languages: channel['program-audio-languages'][0],
            program_audio_formats: channel['program-audio-formats'][0],
            program_audio_language: channel['program-audio-language'][0],
            program_audio_format: channel['program-audio-format'][0],
            program_has_cc: Boolean(channel['program-has-cc'][0])
          });
        });
      }); break;
    case 'app':
      request.get(url + 'query/active-app', function (err, res) {
        parseString(res.body, function (err, result) {
          let screensaver = null;

          if (result['active-app'].screensaver) {
            screensaver = {
              name: result['active-app'].screensaver[0]._,
              id: parseFloat(result['active-app'].screensaver[0].$.id),
              version: result['active-app'].screensaver[0].$.version
            };
          }

          if (typeof result['active-app'].app[0] === 'string') {
            return cb({
              id: null,
              name: result['active-app'].app[0],
              version: null,
              screensaver: screensaver
            });
          }

          return cb({
            id: parseFloat(result['active-app'].app[0].$.id),
            name: result['active-app'].app[0]._,
            version: result['active-app'].app[0].$.version,
            screensaver: screensaver
          });
        });
      }); break;
    default:
      throw new Error('Invalid argument');
  }
};*/

Roku.prototype.type = function (text) {
  const url = this.url;

  if (typeof text !== 'string') {
    throw new Error('Text is required');
  }

  const press = this.press.bind(this);  
  
  text.split('').forEach(function (char) {
    /* global escape: true */
    press('Lit_' + escape(char));
  });
};

Roku.prototype.deviceInfo = function (cb) {
  let deviceInfo1;
  let deviceInfo2;
  request.get(this.url, function (err, res) {
    deviceInfo1 = res.body;
  }).pipe(request.get(this.url + 'query/device-info', function (err, res) {
    deviceInfo2 = res.body;

    parseString(deviceInfo1, function (err, info1) {
      parseString(deviceInfo2, function (err, info2) {
        info2 = info2['device-info'];

        cb({
          spec_version: {
            major: info1.root.specVersion[0].major[0],
            minor: info1.root.specVersion[0].minor[0]
          },
          device_id: info2['device-id'][0],
          device_type: info1.root.device[0].deviceType[0],
          friendly_name: info1.root.device[0].friendlyName[0],
          manufacturer: info1.root.device[0].manufacturer[0],
          manufacturer_url: info1.root.device[0].manufacturerURL[0],
          advertising_id: info2['advertising-id'][0],
          vendor_name: info2['vendor-name'][0],
          model_description: info1.root.device[0].modelDescription[0],
          model_name: info1.root.device[0].modelName[0],
          model_region: info2['model-region'][0],
          model_number: info1.root.device[0].modelNumber[0],
          model_url: info1.root.device[0].modelURL[0],
          serial_number: info1.root.device[0].serialNumber[0],
          udn: info2.udn[0],
          screen_size: parseFloat(info2['screen-size'][0]),
          wifi_mac: info2['wifi-mac'][0],
          network_type: info2['network-type'][0],
          user_device_name: info2['user-device-name'][0],
          software_version: info2['software-version'][0],
          software_build: parseFloat(info2['software-build'][0]),
          secure_device: info2['secure-device'][0],
          language: info2.language[0],
          country: info2.country[0],
          locale: info2.locale[0],
          time_zone: info2['time-zone'][0],
          time_zone_offset: info2['time-zone-offset'][0],
          power_mode: info2['power-mode'][0],
          supports_suspend: info2['supports-suspend'][0],
          developer_enabled: info2['developer-enabled'][0],
          keyed_developer_id: info2['keyed-developer-id'][0],
          search_enabled: info2['search-enabled'][0],
          voice_search_enabled: info2['voice-search-enabled'][0],
          notifications_enabled: info2['notifications-enabled'][0],
          notifications_first_use: info2['notifications-first-use'][0],
          headphones_connected: info2['headphones-connected'][0],
          expert_pq_enabled: parseFloat(info2['expert-pq-enabled'][0]),
          service_list: (function () {
            let list = [];
            for (let service of info1.root.device[0].serviceList[0].service) {
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
          } ())
        });
      });
    });
  }));
};

module.exports = Roku;