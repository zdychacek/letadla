const mongoose = require('mongoose'),
	Class = require('./Class'),
	Carrier = require('./Carrier');

var PathPart = new mongoose.Schema({
	fromDestination: String,
	toDestination: String,
	departureTime: Number,
	arrivalTime: Number,
	'class': {
		type: mongoose.Schema.ObjectId,
		ref: Class
	},
	carrier: {
		type: mongoose.Schema.ObjectId,
		ref: Carrier
	}
});

module.exports = mongoose.model('PathPart', PathPart);