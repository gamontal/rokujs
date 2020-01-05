const Roku = require('./lib/roku');

const arg1 = (process.argv[2] || '').toLowerCase(); 
const arg2 = (process.argv[3] || '');
const arg3 = (process.argv[4] || '');

switch(arg1) {
    case 'discover':
    case 'ls':
        Roku.discover(console.log)
        break;

    
    case '':
    case 'h':
    case 'help':
        break;

    default:
        if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(arg1) === false) {
            console.log('Send device IP address! Available devices are... \n\n');
            Roku.discover(devices => {
                console.log(devices); 
                process.exit();
            });
        }else {
            const device = new Roku(arg1);

            switch(arg2) {
                case '':
                case 'ls':
                case 'apps':
                    device.apps((err, apps) => console.log(apps));
                    break;

                case 'active':
                case 'active-app':
                    device.apps({active: true}, (err, apps) => console.log(apps));
                    break;

                case 'info':
                    device.deviceInfo(info => console.log(JSON.stringify(info)));
                    break;

                case 'launch':
                    const key = /\d+/.test(arg3) === true ? 'id': 'name';
                    device.launch({[key]: arg3}, err => {
                        if (err) console.log(`Error launching app "${arg3}"`);
                    });
                    break;

                default:
                    if (Roku.keys.includes(arg2)) {
                        device.press(arg2);
                    }else {
                        console.log(`Unknown command "${arg2}"`)
                    }
                    break;
            }
        }
        break;
}