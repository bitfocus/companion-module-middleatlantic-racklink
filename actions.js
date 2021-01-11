exports.getActions  = function() {

	let actions = {};

	actions['outlet_power_on'] = {
		label: 'Turn Outlet On',
		options: [
			{
				type: 'dropdown',
				label: 'Outlet Number',
				id: 'outlet',
				default: '0',
				choices: this.OUTLETS
			}
		]
	};

	actions['outlet_power_off'] = {
		label: 'Turn Outlet Off',
		options: [
			{
				type: 'dropdown',
				label: 'Outlet Number',
				id: 'outlet',
				default: '0',
				choices: this.OUTLETS
			}
		]
	};

	return actions;
}
