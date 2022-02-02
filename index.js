// MiddleAtlantic-Racklink

var tcp = require('../../tcp');
var instance_skel = require('../../instance_skel');
var Client = require('node-rest-client').Client;
var debug;
var log;

function instance(system, id, config) {
	var self = this;

	// super-constructor
	instance_skel.apply(this, arguments);

	self.actions(); // export actions

	return self;
}

instance.prototype.OUTLETS = [
	{ id: '1', label: 'Outlet 1'},
	{ id: '2', label: 'Outlet 2'},
	{ id: '3', label: 'Outlet 3'},
	{ id: '4', label: 'Outlet 4'},
	{ id: '5', label: 'Outlet 5'},
	{ id: '6', label: 'Outlet 6'},
	{ id: '7', label: 'Outlet 7'},
	{ id: '8', label: 'Outlet 8'}
];

instance.prototype.init = function () {
	var self = this;

	debug = self.debug;
	log = self.log;

	self.initFeedbacks();
	self.initVariables();
	self.init_connection();
};

instance.prototype.updateConfig = function (config) {
	var self = this;
	self.config = config;

	self.initFeedbacks();
	self.initVariables();
	self.init_connection();
};

instance.prototype.init_connection = function () {
	var self = this;

	if (self.config.host) {
		let settings_url = `http://${self.config.host}/assets/js/json/settings.json`;
	
		if ((self.config.username !== '') && (self.config.username !== undefined) && (self.config.password !== '') && (self.config.password !== undefined)) {
			self.doRest('GET', settings_url, {})
			.then(function (result) {
				if (result.data) {
					self.status(self.STATUS_OK);
					let objJSON = JSON.parse(result.data.toString());
					self.processSettingsData(objJSON);
				}
				else {
					let message = 'Failed to receive settings from the device.';
					self.log('error', message);
					self.status(selt.STATUS_ERROR, message);
				}
			})
			.catch(function (message) {
				self.log('error', message);
				self.status(self.STATUS_ERROR, message);
			});
		}
	}
};

// Return config fields for web config
instance.prototype.config_fields = function () {
	var self = this;

	return [
		{
			type: 'text',
			id: 'info',
			width: 12,
			label: 'Information',
			value: 'You will need to supply the IP address and administrator account login.'
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'IP Address',
			default: '192.168.0.154',
			regex: self.REGEX_IP,
			width: 12
		},
		{
			type: 'textinput',
			id: 'username',
			label: 'Username',
			default: 'admin',
			width: 12
		},
		{
			type: 'textinput',
			id: 'password',
			label: 'Password',
			default: 'admin',
			width: 3
		}
	]
}

// When module gets deleted
instance.prototype.destroy = function () {
	var self = this;

	debug('destroy', self.id);
}

// Set up Feedbacks
instance.prototype.initFeedbacks = function () {
	var self = this;

	var feedbacks = {

	};

	//self.setFeedbackDefinitions(feedbacks);
}

// Set up available variables
instance.prototype.initVariables = function () {
	var self = this;

	var variables = [
		{
			label: 'Model',
			name: 'model'
		},
		{
			label: 'Outlet Count',
			name: 'outlet_count'
		},
		{
			label: 'Device Name',
			name: 'device_name'
		},
		{
			label: 'Device Description',
			name: 'device_description'
		},
		{
			label: 'Device Location',
			name: 'device_location'
		},
		{
			label: 'Sequence on Power Up',
			name: 'sequence_powerup'
		},
		{
			label: 'Firmware Version',
			name: 'firmware'
		}
	];

	self.setVariableDefinitions(variables);
}

instance.prototype.init_presets = function () {
	var self = this;
	var presets = [];

	self.setPresetDefinitions(presets);
}

instance.prototype.actions = function (system) {
	var self = this;

	self.setActions({
		'outlet_on': {
			label: 'Turn Outlet On',
			options: [
				{
					type: 'dropdown',
					label: 'Outlet',
					id: 'outlet',
					choices: self.OUTLETS,
					tooltip: 'Outlet to control.',
					default: '1'
				}
			]
		},
		'outlet_off': {
			label: 'Turn Outlet Off',
			options: [
				{
					type: 'dropdown',
					label: 'Outlet',
					id: 'outlet',
					choices: self.OUTLETS,
					tooltip: 'Outlet to control.',
					default: '1'
				}
			]
		},
		'outlet_all_on': {
			label: 'Turn All Outlets On'
		},
		'outlet_all_off': {
			label: 'Turn All Outlets Off'
		}
	});
}

instance.prototype.action = function (action) {
	var self = this;
	var options = action.options;
	
	if (self.config.host) {
		switch (action.action) {
			case 'outlet_on':
				self.controlOutlet(options.outlet, true);
				break;
			case 'outlet_off':
				self.controlOutlet(options.outlet, false);
				break;
			case 'outlet_all_on':
				for (let i = 0; i < self.OUTLETS.length; i++) {
					self.controlOutlet(self.OUTLETS[i].id, true);
				}
				break;
			case 'outlet_all_off':
				for (let i = 0; i < self.OUTLETS.length; i++) {
					self.controlOutlet(self.OUTLETS[i].id, false);
				}
				break;
		}
	}
}

instance.prototype.doRest = function (method, url, args) {
	var self = this;

	return new Promise(function (resolve, reject) {

		function handleResponse(err, result) {
			if (err === null && typeof result === 'object' && ((result.response.statusCode === 200) || (result.response.statusCode === 201))) {
				// A successful response
				resolve(result);
			}
			else {
				if (result.error.code === 'HPE_INVALID_HEADER_TOKEN') {
					//the command probably ran, so just ignore this
					resolve(result);
				}
				else {
					// Failure. Reject the promise.
					let message = 'Unknown error';
					reject(message);
				}
			}
		}

		var options_auth = {};

		if ((self.config.username === '') || (self.config.password === '')) {
			reject('Invalid Username/Password.');
		}
		else {
			options_auth = {
				user: self.config.username,
				password: self.config.password
			};

			var client = new Client(options_auth);

			switch (method) {
				case 'POST':
					client.post(url, args, function (data, response) {
						handleResponse(null, {data: data, response: response});
					})
					.on('error', function (error) {
						handleResponse(true, {error: error});
					});
					break;
				case 'GET':
					client.get(url, function (data, response) {
						handleResponse(null, {data: data, response: response});
					})
					.on('error', function (error) {
						handleResponse(true, {error: error});
					});
					break;
				default:
					throw new Error('Invalid method');
					break;
			}
		}
	});
}

/* Processes Initial Data And Sets Up Actions and Variables */
instance.prototype.processSettingsData = function(data) {
	var self = this;

	self.setVariable('model', data.deviceSettings.model);
	self.setVariable('outlet_count', data.deviceSettings.outletCount);
	self.setVariable('device_name', data.deviceSettings.deviceName);
	self.setVariable('device_description', data.deviceSettings.deviceDesc);
	self.setVariable('device_location', data.deviceSettings.devLocation);
	self.setVariable('sequence_powerup', data.deviceSettings.sequenceOnPwrUp);
	self.setVariable('firmware', data.deviceSettings.firmware);

	self.OUTLETS = [];
	for (let i = 1; i <= data.deviceSettings.outletCount; i++) {
		let outletObj = {};
		outletObj.id = i + '';
		outletObj.label = 'Outlet ' + i;
		self.OUTLETS.push(outletObj);
	}
	self.actions();
};

/* Controls the Outlet */
instance.prototype.controlOutlet = function (outlet, on) {
	var self = this;

	let control_url = `http://${self.config.host}/outletsubmit.htm`;

	let headers = {
		'Content-Type': 'application/x-www-form-urlencoded'
	};

	let postdata = {
		'controlnum': outlet,
		'command': (on ? 'ON' : 'OFF')
	};

	let args = {
		data: postdata,
		headers: headers
	}

	self.doRest('POST', control_url, args)
	.then(function (result) {
	})
	.catch(function (message) {
		self.log('error', message);
		self.status(self.STATUS_ERROR, message);
	});
};

instance_skel.extendedBy(instance);
exports = module.exports = instance;