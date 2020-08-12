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

const log = msg => console.log(colors.green(msg));
const error = msg => console.log(colors.red(msg));
const debug = msg => console.log(colors.yellow(msg.toUpperCase()));

const writeConfig = (path, json) => fs.writeFileSync(path, JSON.stringify(json));

const showHelp = () => {
    const commands = [
        'active                       list the active app for the currently selected Roku device',
        'apps                         show all apps installed on the currently selected Roku device',
        'config                       list TVs on your network and choose one',
        'discover                     list all roku devices on the network',
        'help, h                      show this menu',
        'info                         list info for the currently selected Roku device',
        'launch                       launch an app. This should be followed by an app name (see \'apps\')',
        'reset                        clear the currently selected Roku device',
    ];

    const maxLen = 'reset, clear                 '.length;

    console.log(colors.yellow(`
${colors.cyan('This is a CLI for the roku devices on your network.')}

${colors.cyan('Commands:')}
${commands.join('\n')}

${colors.cyan('Keys: (all keys can be followed by number of presses)')}
${Roku.keys.map(key => `${key}${' '.repeat(maxLen - key.length)}${`press the "${key}" key`}`).join('\n')}
`))
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

    switch(cmd) {
        case 'active':
            device.apps({active: true}, (err, apps) => log(apps));
            break;

        case 'apps':
            device.apps((err, apps) => log(apps));
            break;

        case 'clear':
            if (!fs.existsSync(LOCAL_CONFIG)) {
                error('config file not found.');
            }else {
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
            }
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
            const key = /\d+/.test(appNameOrNumTimes) === true ? 'id': 'name';
            device.launch({[key]: appNameOrNumTimes}, err => {
                if (err) error(`Error launching app "${appNameOrNumTimes}"`);
            });
            break;

        default:
            if (Roku.keys.includes(cmd)) {
                const repeatNumTimes = parseInt(appNameOrNumTimes) ? appNameOrNumTimes : 1;

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
})(
    (process.argv[2] || ''),
    (process.argv[3] || ''),
)
