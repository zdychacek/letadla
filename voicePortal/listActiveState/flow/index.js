'use strict';

var vxml = require('vxml'),
	ReservationsListState = require('./ReservationsListState');

var ListActiveFlow = vxml.CallFlow.extend({

	constructor: function (userVar) {
		ListActiveFlow.super.call(this);

		this.userVar = userVar;
	},

	create: function* () {
		var user = this.userVar.getValue(),
			reservations = yield user.listReservations();

		// there's no existing reservations
		if (!reservations.length) {
			var noReservationsState = vxml.State.create('noReservations', new vxml.Say('There are no active reservations.'));

			this.addState(noReservationsState);
		}
		else {
			var reservationCountState = vxml.State.create('reservationsCount',
				new vxml.Say('You have ' + reservations.length + ' active reservations. List follows.')
			);
			var reservationsState = new ReservationsListState('reservations', reservations);

			reservationCountState.addTransition('continue', reservationsState);

			// add reservations count info state
			this.addState(reservationCountState);
			// add reservations list state
			this.addState(reservationsState);
		}
	}
});

module.exports = ListActiveFlow;