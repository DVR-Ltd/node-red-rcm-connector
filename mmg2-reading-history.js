//jshint esversion:10

const
	{
		MMG2CoreAPI
	}     = require("rcm-core-client"),

	HW_STATE_RELAY                    = 1,                  //Relay state
	HW_STATE_SWITCH                   = 2,                  //Switch state

	CONVERT_OPTIONS = [
		{	value: 1, label: "Raw" },
		{	value: 2, label: "FlexDash: Simple Table" },
		{	value: 3, label: "FlexDash: TimePlot" }
	],
	
	ERROR_CONDITIONS = [
		"Failure to obtain data from sensor", //0
		"Failure to control device",          //1
		"Failure to read enable pin"          //2
	],
	
	getConversionName = (id) => {
		for (let a = 0; a < CONVERT_OPTIONS.length; a += 1) {
			if (CONVERT_OPTIONS[a].value === parseInt(id)) {
				return CONVERT_OPTIONS[a].label;
			}
		}

		return null;
	},


	rhFormat = (data, formatID) => {
		formatID  = parseInt(formatID);

		if (formatID === 1) {
			//RAW FORMAT
			return {
				payload: data
			};
		}

		if (formatID === 2) {
			//FlexDash Simple Table

			return {
			    payload: data.map((x) => {
			    	let errors = [];

					for (let a = 0; a < ERROR_CONDITIONS.length; a += 1) {
						if (x.hwState & (1 << (a + 2))) {
							errors.push(ERROR_CONDITIONS[a]);
						}
					}

			    	return {
			    		timestamp: new Date(x.timestamp),
			    		value:     x.value,
			    		switch:    (!!(x.hwState & HW_STATE_SWITCH) ? "Enable" : "Disable"),
			    		relay:     (!!(x.hwState & HW_STATE_RELAY)  ? "On" : "Off"),
			    		errors:    errors
			    	};
			   	})
			};
		}

		if (formatID === 3) {
			//FlexDash Time Plot
			let retArr = [];

			for (let a = 0; a < data.length; a += 1) {
				let dataPoint = data[a];
				retArr.push([
					new Date(dataPoint.timestamp).getTime(),
					dataPoint.value
				]);
			}

			return {
				payload: retArr
			};
		}
	};


module.exports = function(RED) {
	RED.nodes.registerType(
		"mmg2-reading-history",

		function(config) {

			let subscribed     = null,

				arr,

				connectionNode = RED.nodes.getNode(config.connection);

				inputs         = {
					locationID: parseInt(config.locationID),
					beginTime:  parseInt(config.beginTime)
				},

				updateHandler  = () => {
					this.send(rhFormat(arr, config.format));
				},

				exec = (msg) => {

					let connection = connectionNode.context().global.connection;

					msg = msg || {};

					if (msg.locationID !== undefined) {
						inputs.locationID = parseInt(msg.payload);
					}

					if (msg.beginTime !== undefined) {
						inputs.beginTime = parseInt(msg.beginTime);
					}

					if ((!inputs.locationID) || (!(connection instanceof MMG2CoreAPI))) {
						setTimeout(exec.bind(this), 250);
						return;
					}


					if (subscribed !== inputs.locationID) {
						if (subscribed) {
							connection.unregisterPushHandler("SRV/readings/" + subscribed, updateHandler);
						}

						connection.registerPushHandler("SRV/readings/" + inputs.locationID, updateHandler);
						subscribed = inputs.locationID;

						connection.request({
							resource: "/API/monitor/getReadings",

							params: {
								locationID: inputs.locationID,
								beginTime:  inputs.beginTime
							},

							onSuccess: (res) => {
								arr = res.data;
								this.send(rhFormat(arr, config.format));
							},

							onFailure: () => {
								this.send({
									payload: new Error("Failure to obtain reading")
								});
							}
						});
					}
				};

			RED.nodes.createNode(this, config);

			this.on("input", exec);
			exec();
		}
	);
};