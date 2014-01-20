'use strict';

var util = require('util'),
	vxml = require('../lib/vxml'),
	config = require('./config');

var DashboardState = function (id) {
	vxml.State.call(this, id);
}

util.inherits(DashboardState, vxml.State);

DashboardState.prototype.createModel = function (cf) {
	var loggedInPrompt = new vxml.Prompt();

	loggedInPrompt.audios = [
		new vxml.TtsMessage('Hello, "'),
		new vxml.Var(cf, 'user.firstName', ' '),
		new vxml.Var(cf, 'user.lastName', '".'),
	];

	// TODO: add information about reservations total count
	return new vxml.Say(loggedInPrompt)
};

DashboardState.prototype.onEntryAction = function* (cf, state, event) {
	// if set, save information about call
	if (config.saveCallHistory) {
		cf.callHistoryItem = yield cf.user.insertCallHistoryItem(cf.$sessionId, new Date());
	}
};

module.exports = DashboardState;