//jshint esversion:10
const
	HW_STATE_RELAY                    = 1,                  //Relay state
	HW_STATE_SWITCH                   = 2;                  //Switch state


module.exports = function(RED) {
	RED.nodes.registerType(
		"mmg2-isolate",

		function(config) {

			RED.nodes.createNode(this, config);

			config.isolate    = parseInt(config.isolate);

			this.on("input", (msg) => {

				if (!msg.payload) {
					this.send({
						payload: null
					});
					return;
				}
				
				switch (config.isolate) {
					case 1:  //READING
						this.send({
							payload: msg.payload.value
						});
						break;

					case 2:  //RELAY
						this.send({
							payload: !!(msg.payload.hwState & HW_STATE_RELAY)
						});
						break;

					case 3:  //SWITCH
						this.send({
							payload: !!(msg.payload.hwState & HW_STATE_SWITCH)
						});
						break;

					case 4:  //TIMESTAMP
						this.send({
							payload: new Date(msg.payload.timestamp)
						});
						break;

					case 5:  //HARDWARE FAULTS
						let conditions = [
								"Failure to obtain data from sensor", //0
								"Failure to control device",          //1
								"Failure to read enable pin"          //2
							],

							retVal = [];

						for (let a = 0; a < conditions.length; a += 1) {
							if (msg.payload.hwState & (1 << a)) {
								retVal.push(conditions[a]);
							}
						}

						this.send({
							payload: retVal
						});
						break;

					case 6:  //SERIAL NUMBER
						this.send({
							payload: msg.payload.serialNumber
						});
						break;

					case 7: //LocationID
						let locationID;

						if (msg.payload.locationID) {
							locationID = msg.payload.locationID;
						}
						else if (msg.payload.data) {
							locationID = msg.payload.data.locationID;
						}

						this.send({
							locationID: locationID,
							payload:    locationID
						});

						break;


					case 8:  //SERVICE CLASS ID
						this.send({
							serviceClassID: msg.payload.serviceClassID
						});
						break;

					case 9:  //DEVICE TYPE ID
						this.send({
							deviceTypeID: msg.payload.deviceTypeID
						});
						break;

				}
			});
		}
	);
};