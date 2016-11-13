# [RokuJS](https://www.npmjs.com/package/rokujs) 

> Control your Roku TV using NodeJS.

This library will allow you to control your RokuTV remotely using NodeJS. It fetches data and sends commands using the [External Control Protocol (ECP) API](https://sdkdocs.roku.com/display/sdkdoc/External+Control+Guide).

> The External Control Protocol (ECP) enables a Roku device to be controlled over a local area network by providing a number of external control services. The Roku devices offering these external control services are discoverable using [SSDP](https://en.wikipedia.org/wiki/Simple_Service_Discovery_Protocol) (Simple Service Discovery Protocol). ECP is a simple RESTful API that can be accessed by programs in virtually any programming environment.

- [Getting Started](#getting-started)
- [Usage](#usage)
  - [Discover nearby Roku devices](#discover-nearby-roku-devices)
  - [Device information](#device-information)
  - [Remote keypress](#remote-keypress)
  - [Apps](#apps)
  - [App icons](#app-icons)
  - [Launch apps](#launch-apps)
  - [TV Channels](#tv-channels)
  - [Type text](#type-text)
- [Todo](#todo)
- [Licensing](#licensing)

## Getting Started

### Installation

Using npm:

```
$ npm install --save rokujs
```

If you don't have or don't want to use npm:

```
$ cd ~/.node_modules
$ git clone git://github.com/gmontalvoriv/rokujs.git
```

## Usage

### Discover nearby Roku devices

```javascript
const Roku = require('rokujs');

Roku.discover(function (devices) {
  console.log(devices);
  
  /* example response
  [ { server: 'Roku UPnP/1.0 MiniUPnPd/1.4',
    address: '192.168.2.45',
    location: 'http://192.168.2.45:8060/',
    usn: 'uuid:roku:ecp:2N005M893730' } ]
  */
});
```

**Note: At this point we will assume a Roku instance has been created**

```javascript
const Roku = require('rokujs');
const roku = new Roku('roku-address');
```

### Device information

```javascript
roku.deviceInfo(function (info) {
  console.log(info);
  
  /* example response
  { spec_version: { major: '1', minor: '0' },
  device_id: '4KK585898739',
  device_type: 'urn:roku-com:device:player:1-0',
  friendly_name: 'TCL•Roku TV - 2N005M898759',
  manufacturer: 'Roku',
  manufacturer_url: 'http://www.roku.com/',
  advertising_id: '639041cb-d1fe-5700-9346-6c6b16878221',
  vendor_name: 'TCL',
  model_description: 'Roku Streaming Player Network Media',
  model_name: 'TCL 40FS3811',
  model_region: 'US',
  model_number: '5000X',
  model_url: 'http://www.roku.com/',
  serial_number: '2N005M8987300',
  udn: '02780005-740d-10b6-80b3-b88687e0ed20',
  screen_size: 40,
  wifi_mac: 'b8:86:87:e0:ed:3f',
  network_type: 'wifi',
  user_device_name: '',
  software_version: '7.2.0',
  software_build: 4143,
  secure_device: true,
  language: 'en',
  country: 'US',
  locale: 'en_US',
  time_zone: 'US/Puerto Rico-Virgin Islands',
  time_zone_offset: -240,
  power_mode: 'PowerOn',
  supports_suspend: true,
  developer_enabled: false,
  keyed_developer_id: '',
  search_enabled: 'true',
  voice_search_enabled: true,
  notifications_enabled: true,
  notifications_first_use: true,
  headphones_connected: true,
  expert_pq_enabled: 0.5,
  service_list:
   [ { service_type: 'urn:roku-com:service:ecp:1',
       service_id: 'urn:roku-com:serviceId:ecp1-0',
       control_url: null,
       event_sub_url: null,
       scpdurl: 'ecp_SCPD.xml' },
     { service_type: 'urn:dial-multiscreen-org:service:dial:1',
       service_id: 'urn:dial-multiscreen-org:serviceId:dial1-0',
       control_url: null,
       event_sub_url: null,
       scpdurl: 'dial_SCPD.xml' } ] }
  
  */
});

```

### Remote keypress

```javascript
roku.press('home');
roku.delay(1000);

roku.press(Roku.keys[6]); // right
roku.delay(1000);

roku.press('volumeup');
```

### Apps

#### Fetch all installed apps

```javascript
roku.apps(function (err, apps) {
  console.log(apps);

  /* example response
  [ { id: 12, name: 'Netflix', version: '4.1.218' },
  { id: 13, name: 'Amazon Video', version: '5.17.10' },
  { id: 2213, name: 'Roku Media Player', version: '4.1.1524' },
  { id: 46041, name: 'Sling TV ', version: '5.0.13' },
  { id: 2285, name: 'Hulu', version: '4.7.1' },
  { id: 52838, name: 'Nick', version: '1.0.0' },
  { id: 45706, name: 'Roku TV Intro', version: '1.0.11' },
  { id: 837, name: 'YouTube', version: '2.0.70100049' },
  { id: 61322, name: 'HBO NOW', version: '1.7.2016101400' },
  { id: 50539, name: 'Twitch', version: '1.0.14' },
  { id: 47389, name: 'FX NOW', version: '1.3.8' },
  { id: 2946, name: 'Fox News Channel', version: '2.1.4' },
  { id: 26950, name: 'QVC', version: '1.0.21' } ]
  */
});
```

#### Get information about a single app

**By ID**

```javascript
roku.apps({ id: 12 }, function (err, app) {
  console.log(app);
});
```

**By name**

```javascript
roku.apps({ name: 'Netflix' }, function (err, netflix) {
  console.log(netflix);
});
```

#### Get active app information

```javascript
roku.apps({ active: true }, function (err, app) {
  console.log(app);
});
```

### App icons

```javascript
const ws = fs.createWriteStream(__dirname + '/' + 12 + '.png');
const rs = roku.iconStream(12);

rs.pipe(ws); // => 12.png
```

### Launch apps

**By ID**

```javascript
roku.launch({ id: 50539 }, function (err) {
  if (err) {
    console.log(err);
  }
});
```

**By name**

```javascript
roku.launch({ name: 'twitch'}, function (err) {
  if (err) {
    console.log(err);
  }
})
```

### TV Channels

#### Fetch all TV channels

```javascript
roku.tvChannels(function (channels) {
  console.log(channels);
});
```

#### Get active TV channel information

```javascript
roku.tvChannels({ active: true }, function (channel) {
  console.log(channel);
});
```

### Type text

**Note: Make sure you have an active field ready for input**

```javascript
roku.type('HBO');
```

## Todo

- Tests
- Command Line Interface
- Search

## Licensing

[MIT](https://github.com/gmontalvoriv/rokujs/blob/master/LICENSE) © Gabriel Montalvo