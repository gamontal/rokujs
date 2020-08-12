#!/usr/bin/env node

const inquirer = require('inquirer');
const Roku = require('./lib/roku');
const colors = require('colors/safe');
const fs = require('fs');
const { resolve } = require('path');

const LOCAL_CONFIG = `./roku.json`;
const HOME_CONFIG = `~/roku.json`;

const readConfig = () => {
    const readFile = file => {
        if (!fs.existsSync(file)) {
            return false;
        } 
        
        return JSON.parse(fs.readFileSync(file));
    }
    
    let config = readFile(LOCAL_CONFIG);
    
    if (config === false) {
        config = readFile(HOME_CONFIG);
    }
    
    return config;
}

const askConfig = async () => {
    const devices = await new Promise((resolve, reject) => {
        Roku.discover(resolve);
    });

    const prettyDevices = [];
    
    for (let index in devices) {
        const device = devices[index];
        const instance = device.address ? new Roku(device.address) : null;

        let info = await new Promise((resolve, reject) => instance
            ? instance.deviceInfo(resolve)
            : resolve({})
        );

        const name = info.friendly_name ? info.friendly_name : info.user_device_name;

        prettyDevices.push({
            name: name ? `${name} @ ${device.address}` : `${device.server} - ${device.address}`,
            desription: info.description || '',
            model: info.model_name || '',
            serial: info.serial_number || '',
            ip: device.address,
            value: device,
            device,
        });
    }
    
    return new Promise((resolve, reject) => {
        inquirer.prompt([
            {
                name: 'selected',
                type: 'list', 
                message: 'Choose device to control',
                choices: prettyDevices,
            },
        ]).then(answers => {
            resolve({
                ...answers,
                ...{devices: prettyDevices},
            });
        });
    })
};

const log = msg => console.log(colors.yellow(msg));
const error = msg => console.log(colors.red(msg));
const debug = msg => console.log(colors.cyan(msg.toUpperCase()));

const writeConfig = (path, json) => fs.writeFileSync(path, JSON.stringify(json));

const showHelp = () => {
    const commands = [
        'active, active-app           list the active app',
        'active-channel               list the active channel',
        'apps                         show all apps',
        'app-info <app name or id>    show info for app',
        'channels                     show all channels',
        'config                       list TVs on your network and select one (happens by default on init)',
        'discover                     list all roku devices on the network',
        'help, h                      show this menu',
        'info                         list info for the currently selected Roku device',
        'launch <app name or id>      launch an app',
        'reset                        clear the current config',
        'type,text <words>            type text (must have keyboard or input selected)',
    ];

    const maxLen = 'reset, clear                 '.length;

    log(`
${colors.cyan('This is a CLI for the roku devices on your network.')}

${colors.cyan('Commands:')}
${commands.join('\n')}

${colors.cyan('Keys: (all keys can be followed by number of presses)')}
${Roku.keys.map(key => `${key}${' '.repeat(maxLen - key.length)}${`press the "${key}" key`}`).join('\n')}
`);
}

(async (cmd, appNameOrNumTimes) => {
    let config = readConfig();

    if (config === false) {
        debug('finding devices...');
        config = await askConfig();
        writeConfig(LOCAL_CONFIG, config);
        debug('configured!');
    }

    const deviceIp = config.selected.address || '';
    const device = deviceIp ? new Roku(deviceIp) : {};
    const appNameOrNumTimesIsNumber = /\d+/.test(appNameOrNumTimes);

    try {
        switch(cmd) {
            case 'active-channel':
                device.tvChannels({active: true}, log);
                break;

            case 'active-app':
            case 'active':
                device.apps({active: true}, (err, apps) => {
                    if (err) throw new Error(err);
                    log(apps);
                });
                break;

            case 'app-info':
                if (!appNameOrNumTimes) {
                    throw new Error("App name required.");
                }

                const appKey = appNameOrNumTimesIsNumber ? 'id': 'name';

                device.apps({[appKey]: appNameOrNumTimes}, (err, apps) => {
                    if (err) throw new Error(err);
                    log(apps);
                });
                break;

            case 'apps':
                device.apps((err, apps) => {
                    if (err) throw new Error(err);
                    log(apps)
                });
                break;

            case 'channels':
                device.tvChannels(log);
                break;

            case 'discover':
                debug('available devices:');
                debug('+++++++++++++++++++++++++++++++++++++');
                log(config.devices);
                debug('+++++++++++++++++++++++++++++++++++++');
                break;

            case 'h':
            case 'help':
                showHelp();
                break;

            case 'info':
                device.deviceInfo(log);
                break;

            case 'launch':
                if (!appNameOrNumTimes) {
                    throw new Error("App name required.");
                }

                const key = appNameOrNumTimesIsNumber ? 'id': 'name';

                device.launch({[key]: appNameOrNumTimes}, err => {
                    if (err) throw new Error(`Error launching app "${appNameOrNumTimes}"`);
                });
                break;

            case 'reset':
                if (!fs.existsSync(LOCAL_CONFIG)) {
                    throw new Error('config file not found.');
                }
                inquirer.prompt([{
                    name: 'doDelete', 
                    type: 'confirm', 
                    message: `Are you sure you want to delete config file "${LOCAL_CONFIG}"?`,
                    default: false
                }]).then(({doDelete}) => {
                    if (doDelete) {
                        fs.unlinkSync(LOCAL_CONFIG);
                        debug('file deleted!');
                    }
                });
                break;

            case 'type':
            case 'text':
                if (!appNameOrNumTimes.length) {
                    throw new Error('Text required.');
                }

                device.type(appNameOrNumTimes);
                break;

            default:
                if (Roku.keys.includes(cmd)) {
                    const repeatNumTimes = appNameOrNumTimesIsNumber ? appNameOrNumTimes : 1;

                    for (let i = 0; i < repeatNumTimes; i++) {
                        setTimeout(() => {
                            device.press(cmd)
                        }, 200);
                    }
                }else {
                    console.log(colors.red(`\n"${cmd}" is an invalid command. Here's the help menu:\n`))
                    showHelp();
                }
                break;
        }
    } catch (err) {
        error(err.message);
    }
})(
    (process.argv[2] || ''),
    (process.argv[3] || ''),
)
