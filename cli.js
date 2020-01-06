const inquirer = require('inquirer');
const Roku = require('./lib/roku');
const colors = require('colors/safe');
const fs = require('fs');

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

    const prettyDevices = devices.map(device => {
        return {
            name: `${device.server} - ${device.address}`, 
            value: device, 
            short: device.address
        }
    });
    
    return new Promise((resolve, reject) => {
        inquirer.prompt([
            {
                name: 'selected',
                type: 'list', 
                message: 'Choose device to control',
                choices: prettyDevices,
            },
            {
                name: 'format',
                type: 'list',
                message: 'Choose output format',
                choices: ['JSON', 'Pretty'],
            }
        ]).then(answers => {
            resolve({
                ...answers,
                ...{devices},
            });
        });
    })
};

const log = msg => console.log(colors.green(msg));
const error = msg => console.log(colors.red(msg));
const debug = msg => console.log(colors.yellow(msg.toUpperCase()));

const writeConfig = (path, json) => fs.writeFileSync(path, JSON.stringify(json));

(async (arg1, arg2, arg3) => {
    let config = readConfig();

    if (config === false) {
        debug('finding devices...');
        config = await askConfig();
        writeConfig(LOCAL_CONFIG, config);
        debug('configured!');
    }

    const deviceIp = config.selected.address || '';
    const device = deviceIp ? new Roku(deviceIp) : {};

    switch(arg1) {
        case 'clear':
        case 'reset':
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
                
        case '':
        case 'h':
        case 'help':
            break;

        case 'ls':
        case 'apps':
            device.apps((err, apps) => log(apps));
            break;

        case 'active':
        case 'active-app':
            device.apps({active: true}, (err, apps) => log(apps));
            break;

        case 'info':
            device.deviceInfo(log);
            break;

        case 'launch':
            const key = /\d+/.test(arg2) === true ? 'id': 'name';
            device.launch({[key]: arg2}, err => {
                if (err) error(`Error launching app "${arg2}"`);
            });
            break;

        default:
            if (Roku.keys.includes(arg1)) {
                device.press(arg1);
            }else {
                error(`Unknown command "${arg1}"`)
            }
            break;
    }
})(
    (process.argv[2] || '').toLowerCase(),
    (process.argv[3] || ''),
    (process.argv[4] || ''),
)
