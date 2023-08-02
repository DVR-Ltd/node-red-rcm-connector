//jshint esversion:10

const
	{
		MMG2CoreAPI
	}     = require("node-red-rcm-connector"),


	getDeviceTypes = (node, conn) => {

		conn.request({
			resource: "/API/meta/getDeviceTypes",

			onSuccess: (res) => {
				console.log("Device types retreived");
				node.context().global.deviceTypes = res.data.deviceTypes;

				getServiceClassifications(node, conn);
			},

			onFailure: () => {
				console.log("Failed to retreive device types.");
			}
		});
	},

	getServiceClassifications = (node, conn) => {
		conn.request({
			resource: "/API/meta/getServiceClassifications",

			onSuccess: (res) => {
				console.log("Service Classifications retreived");
				node.context().global.serviceClassifications = res.data.serviceClassifications;
				node.context().global.connection             = conn;
			},

			onFailure: () => {
				console.log("Failed to retreive service classifications.");
			}
		});
	};


module.exports = function(RED) {

	//Don't judge me... (it's a temporary hack)
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

	RED.nodes.registerType(
		"mmg2-connector",

		function(config) {
			RED.nodes.createNode(this, config);

			if ((!config.host) || (!config.username) || (!config.password)) {
				console.log("Connection parameters missing.");
				return;
			}

			let	connection = new MMG2CoreAPI({
					domain:   config.host,
					username: config.username,
					password: config.password
				});

			connection.on("error", (err) => {
				console.log(err);
			});

			connection.logOn(
				() => {
					console.log("LOGGED IN");
					getDeviceTypes(this, connection);

					// this.send({
					// 	payload: connection
					// });
				},

				(err) => {
					console.log("LOG IN FAIL");

					this.context().global.connection = err;
				}
			);
		}
	);
};