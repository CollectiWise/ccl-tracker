# Citizen Cyberlab Analytics Tracker

The CCL-Tracker javascript library is used as the middleware "glue" between a javascript application and the analytics provider. It addresses the problem where it's difficult to track the user behaviour within complex javascript application, when the analytics code is hooked externally onto the application (ex. through Google Tag Manager).

In addition, it provides the necessary abstraction between the application developer and the analytics responsible, allowing the latter to chose the most appropriate tracking solution, even at a later time.

## 1. Usage

To use it in your project, just include the library in your header:

```html
<script type="text/javascript" src="analytics.min.js"></script>
```

It will expose a global property named `analytics` that you can use right away. For example:

```javascript
$('button#submit').click(function() {
    analytics.fireEvent('ui.click', {
        'button': 'submit'
    });
});
```

Or even directly in your DOM:

```html
<a href="#" onmouseover="analytics.fireEvent('mouseover')">This is a link</a>
```

## 2. AMD Module

The library also supports AMD module loading when available. To use it in your own project, just include it the same way you load an AMD module:

```javascript

define(["jquery", "extern/analytics"], function($, analytics) {

    // Set global properties 
    analytics.setGlobal('tracking_id', '123145');

    // Bind events
    $('button#submit').click(function() {
        analytics.fireEvent('ui.click', {
            'button': 'submit'
        });
    });

});

```

## 3. Connecting to analytics back-end

As we mentioned before, this library is just the middleware between the analytics back-end and a higher-level front-end. Without any analytics back-end this library is useless.

In order to receive analytics events, you will have to define the global property `analyticsListener` at any time during or after the page loading.

There are two ways to receive events: Using a callback, or using window DOM events.

**IMPORTANT:** If you do not define the `analyticsListener` property within 10 seconds after the page is fully loaded, the ccl-tracker library will automatically disable the entire analytics mechanism. 

### Using a Callback

If you want to have just a single point where you receive all the analytics events, you should define a callback listener. To do so, just declare a global function named `analyticsListener`. Your function will be fired when an analytics event has to be submitted to the server.

For example:

```javascript
window.analyticsListener = function( eventName, eventData ) {
    // Handle the event [eventName]
    // The [eventData] object contain all the event properties
    ...
}
```

### Using DOM Events

If you want to handle individual events, you can let the library forward each analytics action on the window DOM individually. To do so, set the global property `analyticsListener` to `true`. This will indicate the tracking library to fire a special event called `analytics.XXXXX`, where XXXXX is the event name.
For example:

```javascript
window.analyticsListener = true;
$(window).on('analytics.login', function(event, eventData) {
    // Handle the event 'login'
    // The [eventData] object contain all the event properties
    ...
});
```

## 4. API Reference

The `analytics` instance has the following functions:

### 4.1. Event Functions

The following functions trigger analytics events or control the way they behave.

#### setGlobal( `name`, `value` )

Set a global property that will be included with every event. This is useful for specifying the user ID for example.

Example:

```javascript
analytics.setGlobal('userid', 'nv8172361');
```

#### fireEvent( `name`, `properties`, `replace` )

Trigger an analytics event. The `name` argument is the name of the event and the `properties` object contains all the properties this event will have.

If these events are triggered before the analytics provider is attached to the library, they are collected in a stack. If the `replace` boolean argument is true, a newer event will overwrite a possible pending event in the stack.

Example:

```javascript
analytics.fireEvent('ui.click', {
    'button': 'submit',
    'id': 'ui-submit'
});
```

#### fireIncrementalEvent( `name`, `properties`, `property`, [ `value` ] )

Trigger an analytics event every time `property` reaches a particular interval. The `name` argument is the name of the event and the `properties` object contains all the properties this event will have.

The `property` argument can be either a string or an object. In the first case it's considered to be the name of the property to monitor, assuming the interval is `1`, while on the second (recommended) has the following syntax:

```javascript
{
    "property"      : "..", // The property to monitor
    "eventProperty" : "..", // The event property to store the result
    "interval"      : 1,    // The interval to which the event should be fired
    "value"         : 0     // The current value of the property
}
```

The value can either be passed as a property of the `property` object, or as a fourth, `value` argument.

Example:

```javascript
analytics.fireIncrementalEvent('engagement.minutes', {
    'interface': 'ui-login'
}, {
    'property'      : 'ui-login.engagement',
    'eventProperty' : 'time',
    'interval'      : 60
},
    analytics.getTimer('ui-login')
);
```

The above example will fire the event `engagement.minutes` every time the `ui-login` timer reaches a round multiplicand of 60. For every event, the property `time` will be sent included in the event, containing the current value of the timer. 

### 4.2. Timer Functions

The following functions are for assistance in calculating time differences between checkpoints. This is particularly useful when you want to calculate how much time the user spent on something.

Example

```javascript
// When the user focuses on the window, start the timer
$(window).focus(function() {
    analytics.startTimer('idle-time'); 
});
// When the user moves focus away, fire an event specifying
// how much time the user spent on-line.
$(window).blur(function() {
    var offTime = analytics.stopTimer('idle-time');
    analytics.fireEvent('user.online', {
        'time': offLime
    });
});
```

#### startTimer( `name` )

Start a named timer with the specified name.

Example:

```javascript
analytics.startTimer('ui.interaction');
```

#### stopTimer( `name` )

Stop a named timer and return it's current value (in milliseconds), or `0` if the timer does not exist.

Example:

```javascript
var interation_time = analytics.stopTimer('ui.interaction');
```

#### restartTimer( `name` )

Restart a named timer and return it's current value (in milliseconds), or `0` if the timer does not exist.

Example:

```javascript
var current_interaction = analytics.restartTimer('ui.interaction');
```

#### getTimer( `name` )

Return the current value (in milliseconds) of the specified named timer, or `0` if the timer does not exist.

Example:

```javascript
var interaction_state = analytics.getTimer('ui.interaction');
```

### 4.3. Metrics Functions

The following functions can be used to calculate accumulated values.

#### accumulate( `name`, `value` )

Accumulate the specified value to the accumulator with the given name and return the result.

Example:

```javascript
var hits = analytics.accumulate('ui.hits', 10); // Add 10 more hits
```

#### clearAccum( `name` )

Remove the value of the accumulator with the specified name.

#### delta( `name`, `value` )

Calculate the delta between current `value` and last one stored from a previous call of this function and return it. 

Example:

```javascript
// Count how many new jobs are processed
var new_jobs = analytics.delta('vm.jobs', get_job_count());
```

#### clearDelta( `name` )

Remove last delta value for the item with the specified name.
