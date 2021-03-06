'use strict';

var mongoose = require('mongoose'),
	Q = require('q'),
	moment = require('moment'),
	lastModified = require('./plugins/lastModified'),
	PathPart = require('./PathPart'),
	Carrier = require('./Carrier'),
	User = require('./User');

function getRnd (from, to, decimal) {
	if (decimal) {
		return Math.random() * to + from;
	}
	else {
		return Math.floor(Math.random() * to) + from;
	}
}

function getRandomItemFromArray (array) {
	return array[getRnd(0, array.length)];
}

var Flight = new mongoose.Schema({
	path: [ PathPart.schema ],
	price: Number,
	capacity: Number,
	note: String,
	freeCapacity: Number,
	passengers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

	// computed values while saving model
	fromDestination: String,
	toDestination: String,
	arrivalTime: Date,
	departureTime: Date,
	transfersCount: Number,
	totalFlightDuration: Number	// in minutes
});

Flight.plugin(lastModified);

Flight.pre('save', function (next) {
	var firstPathPart = this.path[0],
		lastPathPart = this.path.length > 1 ? this.path[this.path.length - 1] : this.path[0];

	if (firstPathPart) {
		this.fromDestination = firstPathPart.fromDestination;
		this.departureTime = firstPathPart.departureTime;
	}
	else {
		this.fromDestination = null;
		this.departureTime = null;
	}

	if (lastPathPart) {
		this.toDestination = lastPathPart.toDestination;
		this.arrivalTime = lastPathPart.arrivalTime;
	}
	else {
		this.toDestination = null;
		this.arrivalTime = null;
	}

	this.freeCapacity = this.capacity - this.passengers.length;
	this.transfersCount = this.path.length > 1 ?  this.path.length - 1 : 0;
	this.totalFlightDuration = moment(this.arrivalTime).diff(this.departureTime, 'minutes');

	next();
});

// Serialize object and add context data (logged user info)
Flight.methods.serializeWithContext = function (user) {
	var data = this.toObject();

	if (user) {
		data.hasReservation = this.passengers.some(function (passenger) {
			return passenger.equals(user._id);
		});
	}

	return data;
};

Flight.methods.addReservationForUser = function (user) {
	var deferred = Q.defer(),
		passengers = this.passengers,
		self = this,
		reservationAlreadyExists = passengers.some(function (passenger) {
			return passenger.equals(user._id);
		}), errors = [];

	if (reservationAlreadyExists) {
		errors.push('Nelze vytvořit rezervaci, která už byla vytvořena.');

		deferred.reject(errors);
	}
	else {
		if (this.freeCapacity > 0) {
			passengers.push(user._id);

			this.save(function (err, data) {
				if (!err) {
					deferred.resolve(self);
				}
				else {
					deferred.reject([{
						type: 'error',
						message: err.toString()
					}]);
				}
			});
		}
		else {
			errors.push('Let je již plně obsazen. Nelze vytvořit rezervaci.');
			deferred.reject(errors);
		}
	}

	return deferred.promise;
};

Flight.methods.cancelReservationForUser = function (user) {
	var deferred = Q.defer(),
		passengers = this.passengers,
		self = this,
		reservationAlreadyExists = passengers.some(function (passenger) {
			return passenger.equals(user._id);
		}), errors = [];

	if (reservationAlreadyExists) {
		passengers.remove(user._id);

		this.save(function (err, data) {
			if (!err) {
				deferred.resolve(self);
			}
			else {
				deferred.reject([{
					type: 'error',
					message: err.toString()
				}]);
			}
		});
	}
	else {
		errors.push('Nelze zrušit rezervaci, která neexistuje.');
		deferred.reject(errors);
	}

	return deferred.promise;
};

Flight.statics.filter = function (filter, pagerSorter) {
	var deferred = Q.defer(),
		query = this.count({});

	pagerSorter || (pagerSorter = {});

	// filtering
	if (filter) {
		if (filter._id) {
			try {
				var id = mongoose.Types.ObjectId.fromString(filter._id);

				query.where('_id').equals(id);
			}
			catch (ex) { }
		}

		if (filter.fromDestination) {
			query.where('fromDestination').equals(filter.fromDestination);
		}

		if (filter.toDestination) {
			query.where('toDestination').equals(filter.toDestination);
		}

		if (filter.maxTransfersCount !== undefined) {
			query.where('transfersCount').lte(filter.maxTransfersCount);
		}

		if (filter.departureTimeFrom) {
			query.where('departureTime').gte(new Date(filter.departureTimeFrom));
		}
		else {
			// if departureTimeFrom is not specified, then find flights from now
			query.where('departureTime').gte(new Date());
		}

		if (filter.departureTimeTo) {
			query.where('departureTime').lte(new Date(filter.departureTimeTo));
		}

		if (filter.arrivalTimeFrom) {
			query.where('arrivalTime').gte(new Date(filter.arrivalTimeFrom));
		}

		if (filter.arrivalTimeTo) {
			query.where('arrivalTime').lte(new Date(filter.arrivalTimeTo));
		}

		if (filter.totalFlightDuration) {
			query.where('totalFlightDuration').lte(filter.totalFlightDuration);
		}

		if (filter.priceFrom) {
			query.where('price').gte(filter.priceFrom);
		}

		if (filter.priceTo) {
			query.where('price').lte(filter.priceTo);
		}

		// vyfiltrovani pouze mych rezervaci
		if (filter.userId) {
			query.where('passengers').in([ filter.userId ]);
		}
	}

	Q.when(query.exec())
		.then(function (totalCount) {
			query.find();

			// paging and sorting
			if (pagerSorter.limit) {
				query.limit(pagerSorter.limit);
			}

			if (pagerSorter.offset) {
				query.skip(pagerSorter.offset);
			}

			if (pagerSorter.sort && pagerSorter.dir) {
				var sortObj = {};
				sortObj[pagerSorter.sort] = pagerSorter.dir;

				query = query.sort(sortObj);
			}

			Q.when(query.exec())
				.then(function (flights) {
					deferred.resolve({
						items: flights,
						metadata: {
							totalCount: totalCount
						}
					});
				})
				.fail();
		})
		.fail(deferred.reject);

	return deferred.promise;
};

var destinations = require('./Destination').getAll();

function getNotUsedItemFromArray (array, excluded) {
	excluded || (excluded = []);

	while (true) {
		var city = getRandomItemFromArray(array);

		if (excluded.indexOf(city) == -1) {
			excluded.push(city);
			return city;
		}
	}
}

function generateRandomPath (carriers, pathLen) {
	var pathParts = [],
		previousPathPart = null,
		usedDestinations = [],
		startDate = moment()
			.add('months', getRnd(0, 12))
			.add('days', getRnd(0, 31))
			.add('hours', getRnd(0, 24))
			.add('minutes', getRnd(0, 60));

	for (var i = 0; i < pathLen; i++) {
		var departureTime = !previousPathPart ? startDate : moment(previousPathPart.arrivalTime).add('minutes', getRnd(25, 360));

		var pathPart = new PathPart({
				carrier: getRandomItemFromArray(carriers)._id,
				fromDestination: previousPathPart ? previousPathPart.toDestination : getNotUsedItemFromArray(destinations, usedDestinations),
				toDestination: getNotUsedItemFromArray(destinations, usedDestinations),
				departureTime: departureTime.toDate(),
				arrivalTime: moment(departureTime).add('minutes', getRnd(150, 480)).toDate()
			});

		previousPathPart = pathPart;
		pathParts.push(pathPart);
	}

	return pathParts;
}

Flight.statics.generate = function (count, cb) {
	var self = this;

	Carrier.find({}, function (err, carriers) {
		if (!err) {
			var flights = [];

			for (var i = 0; i < count; i++) {
				var pathLen = getRnd(1, 5);

				/* jshint -W055: true */
				flights.push(new self({
					price: getRnd(10, 999),
					capacity: getRnd(10, 200),
					note: 'Poznamka ze dne ' + moment().format('MMM Do YYYY, hh:mm'),
					passengers: [],
					path: generateRandomPath(carriers, pathLen)
				}));
			}

			self.create(flights, cb);
		}
		else {
			console.log(err);
			cb(err);
		}
	});
};

module.exports = mongoose.model('Flight', Flight);
