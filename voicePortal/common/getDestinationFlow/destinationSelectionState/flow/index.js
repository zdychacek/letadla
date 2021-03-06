'use strict';

var vxml = require('vxml');

var DestinationSelectionFlow = vxml.CallFlow.extend({

	constructor: function (destinationsVar) {
		DestinationSelectionFlow.super.call(this);

		this._destinationsVar = destinationsVar;
		this._currentItem = null;
		this.selectedItem = null;
	},

	create: function* () {
		var destinations = this._destinationsVar.getValue();

		if (destinations.length) {
			var totalItemsState = vxml.State.create('totalItems',
				new vxml.Say('We found ' + destinations.length + ' destinations matching the input. To select destination press one. To go to previous, press two. To go to next, press three.')
			);

			var selectionState = vxml.State.create('selection',
				new vxml.Say(new vxml.Prompt([
					new vxml.TtsMessage('You selected '),
					new vxml.Var(this, 'selectedItem'),
					new vxml.TtsMessage('.')
				]))
			);
			selectionState.addOnEntryAction(function* (cf, state, event) {
				cf.selectedItem = cf._currentItem;
			});

			var destStates = destinations.map(function (dest, i) {
				var destState = vxml.State.create('destination_' + i, new vxml.Ask({
					prompt: dest,
					grammar: new vxml.BuiltinGrammar({ type: 'digits', length: 1 })
				}));

				destState.addOnEntryAction(function* (cf, state, event) {
					cf._currentItem = dest;
				});

				return destState;
			}, this);

			totalItemsState.addTransition('continue', destStates[0]);

			destStates.forEach(function (destState, i) {
				var prevState = destStates[i - 1] || null,
					nextState = destStates[i + 1] || null;

				// go to selection state
				destState.addTransition('continue', selectionState, function (choice) { return choice == 1; });

				if (prevState) {
					destState.addTransition('continue', prevState, function (choice) { return choice == 2; });
				}

				if (nextState) {
					destState.addTransition('continue', nextState, function (choice) { return choice == 3; });
				}
			}, this);

			this
				.addState(totalItemsState)
				.addStates(destStates)
				.addState(selectionState);
		}
		else {
			var noItemsState = vxml.State.create('noItems', new vxml.Say('We found no items.'));

			this.addState(noItemsState);
		}
	}
});

module.exports = DestinationSelectionFlow;
