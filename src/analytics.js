
/*! CCL-Tracker v0.1 | Ioannis Charalampidis, Citizen Cyberlab EU Project | GNU GPL v2.0 License */

/**
 * Pick an initiator function according to AMD or stand-alone loading
 */
(function (name, definition) {
    if (typeof module != 'undefined') module.exports = definition()
    else if (typeof define == 'function' && define.amd) define(name, definition)
    else window.analytics = definition()
})("ccl-tracker", function() {
	"use strict";

	/**
	 * Keys to permanent storage
	 */
	var KEY_ACCUMULATORS = "_ccl_tracking_accumulators",
		KEY_ACCUMDELTA 	 = "_ccl_tracking_delta",
		KEY_INCREMENTAL	 = "_ccl_tracking_incremental",
		KEY_TRACKID 	 = "_ccl_tracking_id";

	/**
	 * Generate a tracking ID (An extension over GUID v4)
	 */
	function trackid() {
	  function s4() {
		return Math.floor((1 + Math.random()) * 0x10000)
			.toString(16)
			.substring(1);
		}
		var tid = "";
		for (var i=0; i<8; i++) {
			tid += s4();
		}
		return tid;
	}
	
	/**
	 * Analytics are initialized only on demand
	 */
	var Analytics = function() {

		// Prepare analytics stack
		this.stack = [];
		// Start by disabled
		this.enabled = false;
		// Start by being not expired
		this.expired = false;
		// Timestamp when the analytics class was initialized
		this.initializedAt = Date.now();
		// Wait 10 seconds until an analytics listener appears
		this.timeoutTime = this.initializedAt + 10000;
		// The analytics listener
		this.listener = null;
		// The debug flag
		this.debug = false;
		// Disable changed callbacks
		this.disableChanged = false;

		// Tracking session ID
		this.trackingID = null;

		// Timers
		this.timers = { };
		this.timerAccumulators = { };

		// Global properties
		this.globals = { };

		// Start probe timer
		this.probeTimer = setInterval(this.probeListener.bind(this), 100);

		// Initialize or resume a tracking session
		this.trackingID = this.getPermanent( KEY_TRACKID );
		if (!this.trackingID) {
			// Generate a tracking ID
			this.trackingID = trackid();
			// Store it as cookie & localStorage item
			this.setPermanent( KEY_TRACKID , this.trackingID, 365);
		}

		// Include trackid as a parameter
		this.globals['trackid'] = this.trackingID;

	}

	/**
	 * Assistance for javascript optimizer
	 */
	var localStorage = window.localStorage,
		Analytics_prototype = Analytics.prototype;

	/**
	 * Helper function to store a permenent property
	 */
	Analytics_prototype.setPermanent = function(name, value, expireTime) {
		// Set local storage item
		if (localStorage) {
			localStorage.setItem( name, value );
		} else {
			this.createCookie(name, value, expireTime);
		}
		// Notify that the permanent store has changed
		if (this.disableChanged) return;
		if (window['$']) $(this).triggerHandler('changed', [ this.exportStore() ]);
	}

	/**
	 * Helper function retrieve a permanent property
	 */
	Analytics_prototype.getPermanent = function(name) {
		// Get local storage item
		if (localStorage) {
			return localStorage.getItem(name);
		} else {
			return this.getCookie( name );
		}
	}

	/**
	 * Helper function to delete a permenent property
	 */
	Analytics_prototype.deletePermanent = function(name) {
		// Delete local storage item
		if (localStorage) {
			return localStorage.removeItem(name);
		} else {
			this.createCookie(name, "", -32);
		}
		// Notify that the permanent store has changed
		if (this.disableChanged) return;
		if (window['$']) $(this).triggerHandler('changed', [ this.pack() ]);
	}

	/**
	 * Helper function to check if there is a permanent property
	 */
	Analytics_prototype.hasPermanent = function(name) {
		// Get local storage item
		if (localStorage) {
			return localStorage.hasOwnProperty(name);
		} else {
			return (this.getCookie( name ) != "");
		}
	}

	/**
	 * Create a cookie on the browser cookie store
	 */
	Analytics_prototype.createCookie = function(name, value, days) {
		var expires;
		if (days) {
			var date = new Date();
			date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
			expires = "; expires=" + date.toGMTString();
		}
		else {
			expires = "";
		}
		document.cookie = name + "=" + value + expires + "; path=/";
	}

	/**
	 * Fetch a cookie from browser cookie store
	 */
	Analytics_prototype.getCookie = function(c_name) {
		var c_start, c_end;
		if (document.cookie.length > 0) {
			c_start = document.cookie.indexOf(c_name + "=");
			if (c_start != -1) {
				c_start = c_start + c_name.length + 1;
				c_end = document.cookie.indexOf(";", c_start);
				if (c_end == -1) {
					c_end = document.cookie.length;
				}
				return unescape(document.cookie.substring(c_start, c_end));
			}
		}
		return "";
	}

	/**
	 * Trigger an analytics action
	 */
	Analytics_prototype.probeListener = function() {
		// Check if we are enabled or expired
		if (this.enabled || this.expired) return;

		// Check if we expired
		if (Date.now() > this.timeoutTime) {
			clearInterval(this.probeTimer);
			this.expired = true;
			this.stack = [];
			console.warn("Analytics: No back-end registered on time")
			return;
		}

		// Don't continue if there is no analytics listener
		if (!window.analyticsListener) return;

		// Stop probe timer
		clearInterval(this.probeTimer);
		// Keep reference of analytics listener
		this.listener = window.analyticsListener;
		// We are now enabled
		this.enabled = true;
		// Log
		if (this.debug)
			console.log("Analytics: Registered back-end");

		// Flush stack
		for (var i=0; i<this.stack.length; i++)
			this.send(this.stack[i][0], this.stack[i][1]);
		this.stack = [];

	}

	/**
	 * Send the analytics event without the stack
	 */
	Analytics_prototype.send = function( eventName, data ) {

		// Append timestamp if missing
		if (data.ts == undefined)
			data.ts = Date.now();

		// Log seding actions
		if (this.debug)
			console.log("Analytics: Sending", eventName, data);

		// Fire the event listener
		if (this.listener) {
			try {
				// Backwards compatibility
				if (this.listener === true) {
					$(window).trigger('analytics.'+eventName, [data]);
				} else {
					// New version just calls the listener
					this.listener(eventName, data);
				}
			} catch (e) { };
		}
	}

	/* ############################################################ */
	/*  Low-Level API Functions                                     */
	/* ############################################################ */

	/**
	 * Trigger the analytics event
	 */
	Analytics_prototype.fireEvent = function( eventName, data, replace ) {

		// Check for listener
		this.probeListener();

		// If we are expired, exit
		if (this.expired) return;

		// Append globals
		if (!data) data={};
		for (var k in this.globals)
			data[k] = this.globals[k];

		// Forward or stack it
		if (this.enabled) {
			this.send(eventName, data);
			// Debug log
		} else {
			// If action is already on stack, change it's data
			if (replace) {
				for (var i=0; i<this.stack.length; i++) {
					if (this.stack[i][0] == eventName) {
						this.stack[i] = [eventName, data];
						return;
					}
				}
			}
			// Otherwise, push on stack
			this.stack.push([eventName, data]);
			// Debug log
			if (this.debug)
				console.log("Analytics: Scheduling", eventName, data);
		}

	}

	/**
	 * Set a global property
	 */
	Analytics_prototype.setGlobal = function( name, value ) {
		// Update global property
		this.globals[name] = value;
	}

	/**
	 * Freeze analytics timers
	 */
	Analytics_prototype.freeze = function() {
		// Snapshot all timers and place on accumulators
		for (name in this.timers) {
			// Collect duration till NOW on accummulators
			this.timerAccumulators[name] += (Date.now() - this.timers[name]);
		}
	}

	/**
	 * Thaw analytics timers
	 */
	Analytics_prototype.thaw = function() {
		// Restart all timers
		for (name in this.timers) {
			// Start counting from NOW
			this.timers[name] = Date.now();
		}
	}

	/**
	 * Disable the analytics functionality entirely
	 */
	Analytics_prototype.disable = function() {
		// Mark as disabled and expired
		this.expired = true;
		this.enabled = false;
	}

	/* ############################################################ */
	/*  Timer API  Functions                                        */
	/* ############################################################ */

	/**
	 * Start a timer with the given name
	 */
	Analytics_prototype.startTimer = function(name) {
		// If timer is already started, don't start
		if (this.timers[name] !== undefined) return;
		// Store the current time in the given timer
		this.timers[name] = Date.now();
		this.timerAccumulators[name] = 0;
	}

	/**
	 * Restart a timer with the given name
	 */
	Analytics_prototype.restartTimer = function(name) {
		// If we already have a timer, get current duration
		var duration = this.stopTimer(name);
		// Replace timer start time
		this.timers[name] = Date.now();
		this.timerAccumulators[name] = 0;
		// Return duration
		return duration;
	}

	/**
	 * Return the time on the specified timer
	 */
	Analytics_prototype.getTimer = function(name) {
		// Check for invalid timers
		if (!this.timers[name]) return 0;
		// Return duration
		return  (Date.now() - this.timers[name]) + this.timerAccumulators[name];
	}

	/**
	 * Stop a timer with the given name and return
	 * the time spent.
	 */
	Analytics_prototype.stopTimer = function(name) {
		// Check for invalid timers
		if (!this.timers[name]) return 0;
		// Stop timer and get duration
		var duration = (Date.now() - this.timers[name]) + this.timerAccumulators[name];
		delete this.timers[name];
		delete this.timerAccumulators[name];
		// Return duration
		return duration;
	}

	/* ############################################################ */
	/*  Accumulators API Functions                                  */
	/* ############################################################ */

	/**
	 * Trigger as many events as needed in order to send even invremental
	 * intervals for the specified property.
	 */
	Analytics_prototype.fireIncrementalEvent = function( eventName, data, config, value ) {
		var cfg = {
			'name'			: eventName,
			'property'		: null,
			'interval'		: 1,
			'value'			: 1
		};

		// Set default data
		var data = data || { };

		// Handle string or object config
		if (typeof(config) == 'string') {
			cfg.property = config;
		} else {
			cfg.property = config['property'];
			cfg.name = config['name'] || eventName;
			cfg.interval = config['interval'] || 1;
			cfg.value 	 = config['value'] || 1;
		}
		if (value !== undefined) {
			cfg.value = value;
		}

		// Load incremental data
		var incremental = {};
		if (this.hasPermanent(KEY_INCREMENTAL))
			incremental = JSON.parse( this.getPermanent(KEY_INCREMENTAL) );

		// Get last incremental value
		if (!incremental[cfg.name])
			incremental[cfg.name] = 0;
		var lastValue = incremental[cfg.name];

		// Calculte current incremental value
		var currValue = Math.floor( cfg.value / cfg.interval ) * cfg.interval;

		// Continue only if new value is bigger
		if (currValue > lastValue) {

			// Fire last to current intervals
			for (var v=lastValue+cfg.interval; v<=currValue; v+=cfg.interval) {
				// Update event values
				data[ cfg.property ] = v;
				// Trigger event
				this.fireEvent( eventName, data );
			}

			// Update accumulator delta value
			incremental[cfg.name] = currValue;
			this.setPermanent(KEY_INCREMENTAL, JSON.stringify(incremental));

		}

	}

	/**
	 * Clear accumulator under given name
	 */
	Analytics_prototype.clearAccum = function( name ) {

		// Load Accumulators
		var accumulators = {};
		if (this.hasPermanent(KEY_ACCUMULATORS))
			accumulators = JSON.parse( this.getPermanent(KEY_ACCUMULATORS) );

		// Delete
		if (accummulators[name] !== undefined)
			delete accummulators[name];

		// Update item
		this.setPermanent(KEY_ACCUMULATORS, JSON.stringify(accumulators));

	}

	/**
	 * Clear all local counters
	 */
	Analytics_prototype.clearAll = function() {

		// Remove local storage items
		localStorage.deletePermanent( KEY_ACCUMULATORS );
		localStorage.deletePermanent( KEY_ACCUMDELTA );
		localStorage.deletePermanent( KEY_INCREMENTAL );

	}

	/**
	 * Accumulate and return a value for the given metric name
	 * 
	 * Store the 'value' in the accummulator with name 'name' and
	 * return it's value.
	 */
	Analytics_prototype.accumulate = function( name, value ) {

		// Load Accumulators
		var accumulators = {};
		if (this.hasPermanent(KEY_ACCUMULATORS))
			accumulators = JSON.parse( this.getPermanent(KEY_ACCUMULATORS) );

		// Update accumulator
		if (!accumulators[name]) {
			accumulators[name] = value;
		} else {
			accumulators[name] += value;
		}

		// Update item
		this.setPermanent(KEY_ACCUMULATORS, JSON.stringify(accumulators));

		// Return value
		return accumulators[name];

	}

	/**
	 * Clear delta value under given name
	 */
	Analytics_prototype.clearDelta = function( name ) {

		// Load Accumulators
		var accumulators = {};
		if (this.hasPermanent(KEY_ACCUMDELTA))
			accumulators = JSON.parse( this.getPermanent(KEY_ACCUMDELTA) );

		// Delete
		if (accummulators[name] !== undefined)
			delete accummulators[name];

		// Update item
		this.setPermanent(KEY_ACCUMDELTA, JSON.stringify(accumulators));

	}

	/**
	 * Calculate the delta in the value from the current value of
	 * value and the last one stored.
	 *
	 * This function retuns the delta and updates the stored value
	 * for the specified name.
	 */
	Analytics_prototype.delta = function( name, value ) {

		// Get last deltas
		var accumDelta = {};
		if (this.hasPermanent(KEY_ACCUMDELTA))
			accumDelta = JSON.parse( this.getPermanent(KEY_ACCUMDELTA) );

		// Get last accumulator delta value
		if (!accumDelta[name])
			accumDelta[name] = 0;

		// Calculate delta
		var delta = value - accumDelta[name];

		// Update delta store
		accumDelta[name] = value;
		this.setPermanent(KEY_ACCUMDELTA, JSON.stringify(accumDelta));

		// Update accumulator
		return delta;

	}

	/* ############################################################ */
	/*  Persistence API                                             */
	/* ############################################################ */

	/**
	 * Pack all the current permanent information into a persistent string.
	 */
	Analytics_prototype.exportStore = function() {
		return btoa(JSON.stringify({
			'a': this.getPermanent(KEY_ACCUMULATORS),
			'd': this.getPermanent(KEY_ACCUMDELTA),
			'i': this.getPermanent(KEY_INCREMENTAL),
			't': this.getPermanent(KEY_TRACKID)
		}));
	}

	/**
	 * Unpack all the specified information and place them back to the
	 * persistent storage.
	 */
	Analytics_prototype.importStore = function(data) {
		var data = JSON.parse( atob(data) );
		this.disableChanged = true;
		if (data['a']) this.setPermanent(KEY_ACCUMULATORS, data['a']);
		if (data['d']) this.setPermanent(KEY_ACCUMDELTA, data['d']);
		if (data['i']) this.setPermanent(KEY_INCREMENTAL, data['i']);
		if (data['t']) this.setPermanent(KEY_TRACKID, data['t']);
		this.disableChanged = false;
	}

	/* ############################################################ */
	/*  Initialization API                                          */
	/* ############################################################ */


	// Create and return an analytics instance
	var analytics = new Analytics();

	// Freeze analytics on window blur
	window.addEventListener('blur', function(ev) {
		analytics.freeze();
	});

	// Thaw analytics on window focus
	window.addEventListener('focus', function(ev) {
		analytics.thaw();
	});

	return analytics;

});
