// MiddleAtlantic-RackLink
const tcp           = require('../../tcp');
const instance_skel = require('../../instance_skel');
var actions         = require('./actions');
let debug;
let log;

class instance extends instance_skel {

	constructor(system,id,config) {
		super(system,id,config)

		Object.assign(this, {
			...actions
		});

		// Brightness
		/*this.CHOICES_BRIGHTNESS = [
			{ id: '0',  label: '3%',   cmd: Buffer.from([0x55,0xAA,0x00,0x00,0xFE,0xFF,0x01,0xFF,0xFF,0xFF,0x01,0x00,0x01,0x00,0x00,0x02,0x01,0x00,0x08,0x5D,0x5A]) }
		];*/

		this.HEADER_BYTE = '0xFE';
		this.TAIL_BYTE = '0XFF';

		this.OUTLETS  = [
			{ id: '1', label: 'Outlet 1'},
			{ id: '2', label: 'Outlet 2'},
			{ id: '3', label: 'Outlet 3'},
			{ id: '4', label: 'Outlet 4'},
			{ id: '5', label: 'Outlet 5'},
			{ id: '6', label: 'Outlet 6'},
			{ id: '7', label: 'Outlet 7'},
			{ id: '8', label: 'Outlet 8'},
			{ id: '9', label: 'Outlet 9'},
			{ id: '10', label: 'Outlet 10'},
			{ id: '11', label: 'Outlet 11'},
			{ id: '12', label: 'Outlet 12'},
			{ id: '13', label: 'Outlet 13'},
			{ id: '14', label: 'Outlet 14'},
			{ id: '15', label: 'Outlet 15'},
			{ id: '16', label: 'Outlet 16'}
		]

		this.actions();
	}

	actions(system) {
		this.setActions(this.getActions());
	}

	action(action) {
		let cmd;
		let element;
		let id = action.action
		let options = action.options;


		switch(id) {
			case 'outlet_power_on':
				let cmd = [];
				cmd.push(this.HEADER_BYTE);

				let length = 6;
				cmd.push('0x' + length.toString(16));

				cmd.push('0x00'); // "0" Address for initial release according to protocol manual
				cmd.push('0x20'); // "Power Outlet" command

				let outletNumber = parseInt(options.outlet);
				cmd.push('0x' + outletNumber.toString(16));
				cmd.push('0x01'); // "ON"

				let checksum = this.calculateChecksum(cmd);
				cmd.push(checksum);

				//0xfe 0x09 0x00 0x20 0x01 0x01 0x01 “0000” 0x6a 0xff

				cmd.push(this.TAIL_BYTE);
				break;
			case 'outlet_power_off':
				break;
		}

		if (cmd !== undefined) {
			if (this.socket !== undefined && this.socket.connected) {
				this.socket.send(cmd);
			} else {
				debug('Socket not connected :(');
			}

		}
	}

	// Return config fields for web config
	config_fields() {

		return [
			{
				type: 'text',
				id:   'info',
				width: 12,
				label: 'Information',
				value: 'This module will connect to a Middle Atlantic Racklink PDU over port 60000.'
			},
			{
				type:     'textinput',
				id:       'host',
				label:    'IP Address',
				width:    6,
				default: '192.168.1.11',
				regex:   this.REGEX_IP
			},
			{
				type:		'textinput',
				id:			'username',
				label:		'Username',
				width:		6,
				default: 	'Username'
			},
			{
				type:		'textinput',
				id:			'password',
				label:		'Password',
				width:		6,
				default: 	'Password'
			}
		]
	}

	// When module gets deleted
	destroy() {
		if (this.socket !== undefined) {
			this.socket.destroy();
		}

		debug('destroy', this.id);
	}

	init() {
		debug = this.debug;
		log = this.log;

		this.initTCP();
	}

	initTCP() {
		if (this.socket !== undefined) {
			this.socket.destroy();
			delete this.socket;
		}

		if (this.config.port === undefined) {
			this.config.port = 60000;
		}

		if (this.config.host) {
			this.socket = new tcp(this.config.host, this.config.port);

			this.socket.on('status_change', (status, message) => {
				this.status(status, message);
			});

			this.socket.on('error', (err) => {
				debug('Network error', err);
				this.log('error','Network error: ' + err.message);
			});

			this.socket.on('connect', () => {
				//let cmd = Buffer.from([0x55,0xAA,0x00,0x00,0xFE,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x02,0x00,0x00,0x00,0x02,0x00,0x57,0x56]);
				let cmd = [];
				cmd.push(this.HEADER_BYTE);

				let length = 3;
				length += this.config.username.length + 1 + this.config.password.length;

				cmd.push('0x' + length.toString(16));

				cmd.push('0x00'); // "0" Address for initial release according to protocol manual
				cmd.push('0x02'); // "Login" command
				cmd.push('0x01'); // "Set" command

				cmd.push(this.strToHex(this.config.username));
				cmd.push('0x7c'); // "|" pipe character
				cmd.push(this.strToHex(this.config.password));

				let checksum = this.calculateChecksum(cmd);
				cmd.push(checksum);

				cmd.push(this.TAIL_BYTE);
				//this.socket.send(cmd);
				console.log(cmd);
				debug('Connected');
			});

			// if we get any data, display it to stdout
			this.socket.on('data', (buffer) => {
				//var indata = buffer.toString('hex');
				//future feedback can be added here
				console.log('Buffer:', buffer);

				//if it is a PING (0x01), need to reply PONG
			});

		}
	}

	updateConfig(config) {
		let resetConnection = false;

		if (this.config.host !== config.host)
		{
			resetConnection = true;
		}

		this.config = config;

		this.actions();

		if (resetConnection === true || this.socket === undefined) {
			this.initTCP();
		}
	}

	strToHex(str) {
		let arr = [];

		for (let n = 0; n < str.length; n++) 
		{
			let hex = "0x" + Number(str.charCodeAt(n)).toString(16);
			arr.push(hex);
		}

		return arr.join('');
	}

	calculateChecksum(hex) {
		let sum = 0;

		for (let i = 0; i < hex.length; i++) {
			sum += hex[i];
		}

		sum &= 0x7f;

		return sum;
	}
}

exports = module.exports = instance;
