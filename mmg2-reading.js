//jshint esversion:10

const
	HW_STATE_RELAY                    = 1,                  //Relay state
	HW_STATE_SWITCH                   = 2,                  //Switch state

	ERROR_CONDITIONS = [
		"Failure to obtain data from sensor", //0
		"Failure to control device",          //1
		"Failure to read enable pin"          //2
	],

	{
		MMG2CoreAPI
	}     = require("node-red-rcm-connector");


module.exports = function(RED) {
	RED.nodes.registerType(
		"mmg2-reading",

		function(config) {

			let subscribed     = null,

				connectionNode = RED.nodes.getNode(config.connection);

				inputs         = {
					locationID: parseInt(config.locationID),
					beginTime:  parseInt(config.beginTime)
				},

				updateReadingHandler  = (topic, msg) => {
					let
						errors = [],
						payload = {
							serialNumber: msg.serialNumber,
							timestamp:    new Date(msg.timestamp),
							relay:        ((msg.hwState & HW_STATE_RELAY)  ? "On"     : "Off"),
							switch:       ((msg.hwState & HW_STATE_SWITCH) ? "Enable" : "Disable"),
							value:        msg.value,
							errors:       null
						};

					for (let a = 0; a < ERROR_CONDITIONS.length; a += 1) {
						if (msg.hwState & (1 << (a + 2))) {
							errors.push(ERROR_CONDITIONS[a]);
						}
					}

					payload.errors = errors.join("\n");

					if (config.wrap) {
						this.send({ payload: payload });
					}
					else {
						this.send(payload);
					}
				},

				exec = (msg) => {
					let connection = connectionNode.context().global.connection;

					msg = msg || {};

					if (msg.locationID !== undefined) {
						inputs.locationID = parseInt(msg.locationID);
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
							connection.unregisterPushHandler("SRV/readings/" + subscribed, updateReadingHandler);
						}

						connection.registerPushHandler("SRV/readings/" + inputs.locationID, updateReadingHandler);
						subscribed = inputs.locationID;

						connection.request({
							resource: "/API/monitor/getStatus",

							params: {
								locationID: inputs.locationID,
								beginTime:  inputs.beginTime
							},

							onSuccess: (res) => {
								if (res.data.status.length) {
									updateReadingHandler(null, res.data.status[0]);
								}
								else {
									this.send({
										payload: null
									});
								}
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


			this.on("remove", () => {
				console.log("remove event.")
				connection.logOff(
					() => {
						console.log("Log off Successful.");
					},

					() => {
						console.log("Log off Unsuccessful.");
					}
				);

				connectionNode.context().global.connection = null;
				connection = null;
			});
		}
	);
};