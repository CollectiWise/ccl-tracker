# Citizen Cyberlab Analytics Tracker

The CCL-Tracker javascript library is used as the middleware "glue" between a javascript application and the analytics provider. It addresses the problem where it's difficult to track the user behaviour within complex javascript application, when the analytics code is hooked externally onto the application (ex. through Google Tag Manager).

In addition, it provides the necessary abstraction between the application developer and the analytics responsible, allowing the latter to chose the most appropriate tracking solution, even at a later time.

## Usage

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
<a href="#" onmouseover="analytics.fireEvent('mouseover')" onmouseout="analytics.fireEvent('mouseout');">This is a link</a>
```

## AMD Module

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

## API Reference

The `analytics` instance has the following functions:

### setGlobal( `name`, `value` )

Set a global property that will be included with every event. This is useful for specifying the user ID for example.

Example:

```javascript
analytics.setGlobal('userid', 'nv8172361');
```

### fireEvent( `name`, `properties`, `replace` )

Trigger an analytics event. The `name` argument is the name of the event and the `properties` object contains all the properties this event will have.

If these events are triggered before the analytics provider is attached to the library, they are collected in a stack. If the `replace` boolean argument is true, a newer event will overwrite a possible pending event in the stack.

Example:

```javascript
analytics.fireEvent('ui.click', {
    'button': 'submit',
    'id': 'ui-submit'
});
```

### startTimer( `name` )

Start a named timer with the specified name.

Example:

```javascript
analytics.startTimer('ui.interaction');
```

### stopTimer( `name` )

Stop a named timer and return it's current value (in milliseconds), or `0` if the timer does not exist.

Example:

```javascript
var interation_time = analytics.stopTimer('ui.interaction');
```

### restartTimer( `name` )

Restart a named timer and return it's current value (in milliseconds), or `0` if the timer does not exist.

Example:

```javascript
var current_interaction = analytics.restartTimer('ui.interaction');
```

### getTimer( `name` )

Return the current value (in milliseconds) of the specified named timer, or `0` if the timer does not exist.

Example:

```javascript
var interaction_state = analytics.getTimer('ui.interaction');
```
