//jshint esversion:10

const
	{
		MMG2CoreAPI
	}     = require("node-red-rcm-connector"),

	DATA_SET_OPTIONS = [
		{
			value:     3,
			label:     "Sites",
			idField:   "locationID",
			nameField: "locationName"
		},
		{
			value:     4,
			label:     "Locations",
			idField:   "locationID",
			nameField: "locationName"
		},
		{
			value:     11,
			label:     "Alarms"
		},
		{
			value:     13,
			label:     "Control Instructions"
		},
		{
			value:     101,
			label:     "Device Types (Static)",
			idField:   "deviceTypeID",
			nameField: "deviceTypeName"
		},
		{
			value:     102,
			label:     "Service Classifications (Static)",
			idField:   "serviceClassID",
			nameField: "name"
		}
	],

	format = (data, dataSetID, formatID) => {
		formatID  = parseInt(formatID);
		dataSetID = parseInt(dataSetID);

		if (formatID === 1) {
			//RAW FORMAT
			return {
				payload: data
			};
		}

		let idField   = null,
			nameField = null;

		for (let a = 0; a < DATA_SET_OPTIONS.length; a += 1) {
			if (DATA_SET_OPTIONS[a].value === dataSetID) {
				idField = DATA_SET_OPTIONS[a].idField;
				nameField = DATA_SET_OPTIONS[a].nameField;
				break;
			}
		}

		if (!idField) {
			return {
				payload: data  //Panic
			};
		}

		if (formatID === 2) {
			//FlexDash Simple Table
			return {
			    payload: data.map((x) => {
			    	let obj = {};
			    	obj[idField]   = x[idField];
			    	obj[nameField] = x[nameField];
			    	return obj;
			   	})
			};
		}

		if (formatID === 3) {
			//FlexDash Dropdown Select
			let choices = [],
			    labels  = [];

			data.forEach((x) => {
			    labels.push(x[nameField]);
			    choices.push(x[idField]);
			});

			return {
			    choices: choices,
			    labels:  labels
			};
		}
	};

module.exports = function(RED) {
	RED.nodes.registerType(
		"mmg2-maintained-list",

		function(config) {

			let
				connectionNode = RED.nodes.getNode(config.connection),

				inputs = {
					locationID:     parseInt(config.locationID)     || undefined,
					serviceClassID: parseInt(config.serviceClassID) || undefined,
					deviceTypeID:   config.deviceTypeID             || undefined
				},

				exec = (msg) => {

					let params,
						connection = connectionNode.context().global.connection;

					msg = msg || {};

					if (msg.locationID  !== undefined) {
						inputs.locationID = msg.locationID;
					}

					if (msg.serviceClassID !== undefined) {
						inputs.serviceClassID = msg.serviceClassID;
					}

					if ((typeof msg.deviceTypeID   === "string") && (msg.deviceTypeID.length)) {
						inputs.deviceTypeID = msg.deviceTypeID;
					}

					if (!connection || (!(connection instanceof MMG2CoreAPI))) {
						setTimeout(exec.bind(this), 250);
						return;
					}

					switch (config.dataset) {
						case MMG2CoreAPI.DATA_SETS.SITES:
							//No requirements to obtain sites.
							break;

						case MMG2CoreAPI.DATA_SETS.LOCATIONS:
							if (!inputs.locationID) {
								return;
							}
							break;

						case MMG2CoreAPI.DATA_SETS.ALARMS:
							if (!inputs.locationID) {
								return;
							}
							break;

						case MMG2CoreAPI.DATA_SETS.CONTROL_HISTORY:
							if (!inputs.locationID) {
								return;
							}
							break;


						case 101:
							{
							let data = connectionNode.context().global.deviceTypes;
							this.send(format(data, config.dataset, config.format));
							}
							return;
							// break;

						case 102:
							{
							let data = connectionNode.context().global.serviceClassifications;
							this.send(format(data, config.dataset, config.format));
							}
							return;
							// break;
					}

					if (config.dataset === MMG2CoreAPI.DATA_SETS.SITES) {

						params = {};
					}
					else if (config.dataset === MMG2CoreAPI.DATA_SETS.LOCATIONS) {
						params = {
							locationID:     inputs.locationID,
							deviceTypeID:   inputs.deviceTypeID,
							serviceClassID: inputs.serviceClassID
						};
					}
					else {
						params = {
							locationID:     inputs.locationID
						};
					}

					connection.getMaintainedList(
						config.dataset,

						params,

						(entities) => {
							this.send(format(entities, config.dataset, config.format));
						}
					);
				};

			RED.nodes.createNode(this, config);

			config.dataset    = parseInt(config.dataset);

			this.on("input", exec);
			exec();
		}
	);
};