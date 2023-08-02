//jshint esversion:10

const
	{
		MMG2CoreAPI
	}     = require("node-red-rcm-connector");


module.exports = function(RED) {
	RED.nodes.registerType(
		"mmg2-relay",

		function(config) {

			let subscribed     = null,
				changed        = false,
				called         = false,

				connectionNode = RED.nodes.getNode(config.connection);

				inputs         = {
					locationID: parseInt(config.locationID),
					control:    parseFloat(config.control)
				},

				updateHandler  = (topic, msg) => {
					this.send({
						payload: msg
					});
				},

				exec = (msg) => {

					let connection = connectionNode.context().global.connection;

					msg = msg || {};

					if (typeof msg.locationID === "number") {
						if (inputs.locationID !== msg.locationID) {
							changed = true;
							inputs.locationID = msg.locationID;
						}
					}
					
					if (typeof msg.control === "number") {
						if (inputs.control !== msg.control) {
							inputs.control = msg.control;
							changed = true;
						}
					}

					if ((!inputs.locationID) || (!inputs.control) || (!(connection instanceof MMG2CoreAPI))) {
						setTimeout(exec.bind(this), 250);
						return;
					}

					if (called || !changed) {
						return;
					}

					called = true;

					connection.request({
						resource: "/API/deviceControl/setRelay",

						params: {
							locationID: inputs.locationID,
							aso:        inputs.control
						},

						onSuccess: (res) => {
							console.log("Success :)");
							changed = false;
							called = false;
						},

						onFailure: (code, msg) => {
							console.log("failed", code, msg);
							called = false;
						}
					});
				
				};

			RED.nodes.createNode(this, config);

			this.on("input", exec);
			exec();
		}
	);
};