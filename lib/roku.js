'use strict';

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
};

// Discover nearby Roku devices and get their IPs using SSDP
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
};

Roku.keypress_values = [
  'home', 'rev', 'fwd', 'play',
  'select', 'left', 'right', 'down',
  'up', 'back', 'replay', 'info',
  'backspace', 'enter', 'volumeDown', 'volumeUp',
  'volumeMute', 'inputTuner', 'inputHDMI1', 'inputHDMI2',
  'inputHDMI3', 'inputHDMI4', 'inputAV1', 'channelUp',
  'channelDown'
];

Roku.keypress_values.forEach(function (key) {
  Object.defineProperty(Roku.prototype, key, {
    value: function () {
      request.post(this.url + 'keypress/' + key);
    }
  });
});

//todo
Roku.prototype.delay = function () {};

// Launch an app by ID
Roku.prototype.launch = function (appId) {
  if (!appId) {
    throw new Error('App ID is required');
  }

  return request.post(this.url + 'launch/' + Number(appId));
};

// Fetch installed apps
Roku.prototype.apps = function (options, cb) {
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

Roku.prototype.type = function (text) {
  const url = this.url;

  if (typeof text !== 'string') {
    throw new Error('Text is required');
  }

  text.split('').forEach(function (char) {
    request.post(url + 'keypress/Lit_' + escape(char));
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
          service_list: function () {
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
          } ()
        });
      });
    });
  }));
};

module.exports = Roku;