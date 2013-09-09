(function(window, document, undefined) {
    'use strict';

    /**
     * [Prompt description]
     *
     * Options:
     * - effect
     * @param {Element} element
     * @param {Object} options
     *
     * Events:
     * - prompt-open
     */
    function Prompt(element, options) {
        this._handlers = [];

        this.options = applyDefaults(options, this.defaults);
        this.element = element;
        this._render();
        this.closeButton = element.querySelector('.prompt-action-close');

        this._createOverlay();
        this._on('click', this.closeButton, this.close);
        this._on('keydown', this.dialog, this._escKeyHandler);
        this._on(TRANSITION_END_EVENT, this.dialog, this._openHandler);
        promptInstances++;
    }

    Prompt.prototype.open = function() {
        addClass(this.dialog, 'prompt-state-visible');
        // set focus manually in case transitions are not supported
        if(!TRANSITION_END_EVENT) {
            this._openHandler();
        }
    };

    Prompt.prototype.close = function() {
        if (this._lastActive) {
            this._lastActive.focus();
            // last active element can be unfocusable
            if(this._lastActive !== document.activeElement) {
                document.activeElement.blur();
            }
            this._lastActive = null;
        }
        removeClass(this.dialog, 'prompt-state-visible');
        this._trigger('prompt-close');
    };

    Prompt.prototype.destroy = function() {
        // put the element back on its initial place
        this._originalPosition.parent.insertBefore(this.element, this._originalPosition.next);
        this._removeEventHandlers();
        this._destroyOverlay();
        document.body.removeChild(this.dialog);
        promptInstances--;
    };

    Prompt.prototype._render = function() {
        var element = this.element;
        this._originalPosition = {
            parent: element.parentNode,
            next: element.nextElementSibling
        };

        var content = document.createElement('div');
        content.className = 'prompt-content';
        content.appendChild(element);

        var dialog = document.createElement('div');
        dialog.className = 'prompt-modal ' + EFFECTS[this.options.effect];
        // make the dialog focusable
        dialog.tabIndex = -1;
        dialog.appendChild(content);
        // ensure the dialog is rendered before all service elements to make selectors work 
        this.dialog = document.body.insertBefore(dialog, document.body.firstChild);
    };

    Prompt.prototype._on = function(event, element, handler) {
        if(event && element) {
            handler = handler.bind(this);
            this._handlers.push({
                event: event,
                element: element,
                handler: handler
            });
            element.addEventListener(event, handler, false);
        }
    };

    Prompt.prototype._removeEventHandlers = function() {
        if (this._handlers) {
            for (var i = 0, len = this._handlers.length; i < len; i++) {
                var event = this._handlers[i].event;
                var element = this._handlers[i].element;
                var handler = this._handlers[i].handler;
                element.removeEventListener(event, handler);
            }

            this._handlers = null;
        }
    };

    Prompt.prototype._trigger = function(eventName) {
        var event = document.createEvent('CustomEvent');
        event.initEvent(eventName, true, true);
        this.element.dispatchEvent(event);
    };

    Prompt.prototype._createOverlay = function() {
        var overlay;
        if (!promptInstances) {
            overlay = document.createElement('div');
            overlay.id = 'prompt_overlay';
            overlay.className = 'prompt-overlay';
            document.body.appendChild(overlay);
        } else {
            overlay = document.getElementById('prompt_overlay');
        }
        this.overlay = overlay;
    };

    Prompt.prototype._destroyOverlay = function() {
        if (promptInstances === 1) {
            document.body.removeChild(this.overlay);
        }
    };

    Prompt.prototype._openHandler = function() {
        this._lastActive = document.activeElement;
        setFocus(this.dialog);
        this._trigger('prompt-open');
    };

    Prompt.prototype._escKeyHandler = function(ev) {
        if (ev.keyCode === KEY_CODE_ESCAPE) {
            ev.preventDefault();
            this.close();
            return;
        }
    };

    Prompt.prototype.defaults = {
        effect: 'scale-up'
    };

    var KEY_CODE_ESCAPE = 27;
    var REGEX_CLASS_SEPARATOR = /[\t\r\n\f]/g;
    // TODO need additional configuration in some cases:
    // - add additional container class on page conten but not the dialog itself
    var EFFECTS = {
            'scale-up': 'prompt-fx-scale-up',
            'slide-in-right': 'prompt-fx-slide-in-right',
            'slide-in-bottom': 'prompt-fx-slide-in-bottom',
            'newspaper': 'prompt-fx-newspaper',
            'fall': 'prompt-fx-fall',
            'side-fall': 'prompt-fx-side-fall',
            'sticky-top': 'prompt-fx-sticky-top',
            'flip-hor': 'prompt-fx-flip-hor',
            'flip-vert': 'prompt-fx-flip-vert',
            'sign': 'prompt-fx-sign',
            'scale-down': 'prompt-fx-scale-down',
            'just-me': 'prompt-fx-just-me',
            'split': 'prompt-fx-split',
            'rotate-bottom': 'prompt-fx-rotate-bottom',
            'rotate-left': 'prompt-fx-rotate-left'
        };
    var promptInstances = 0;

    /*
     * Sets focus in the following order:
     * 1. first content element with autofocus attribute
     * 2. first tabbable element within the content of the dialog
     * 3. first tabbable action button
     * 4. dialog element itself
     */
    function setFocus(container) {
        var autofocused, tabbable;

        // TODO use content container as a context element
        var elements = container.querySelectorAll('input,select,button,textarea,object,a');
        for (var i = 0, len = elements.length; i < len; i++) {
            var element = elements[i];
            // will include elements without tabindex attribute, NaN (translated to tabindex '0') and positive values
            var isTabbable = !(element.tabIndex < 0);
            if(isVisible(element)) {
                var nodeName = element.nodeName.toLowerCase();

                // Anchors are tabbable if they have an href or positive tabindex attribute.
                if(!tabbable && nodeName === 'a' && isTabbable) {
                    tabbable = element;
                    // might find an element with a higher rating
                    continue;
                }

                // input, select, textarea, button, and object elements are tabbable if they do not have a negative tab index and are not disabled
                if(nodeName !== 'a' && !element.disabled) {
                    if(element.autofocus) {
                        autofocused = element;
                        // nothing more serious is left here
                        break;
                    } else if(!tabbable && isTabbable) {
                        tabbable = element;
                        // might find an element with a higher rating
                        continue;
                    }
                }
            }
        }

        (autofocused || tabbable || container).focus();
    }

    // TODO need to check parents as well
    function isVisible(element) {
        if(window.getComputedStyle(element).visibility !== 'hidden') {
            return element.offsetWidth > 0 && element.offsetHeight > 0;
        }
    }

    function addClass(element, value) {
        if(element.classList) {
            element.classList.add(value);
            return;
        }

        var current = ' ';
        if(element.className) {
            current = (' ' + element.className + ' ').replace(REGEX_CLASS_SEPARATOR, ' ');
        }

        if( current.indexOf(' ' + value + ' ') < 0 ) {
            current += value + ' ';
        }
        element.className = current.trim();
    }

    function removeClass(element, value) {
        if(element.classList) {
            element.classList.remove(value);
            return;
        }

        var current = ' ';
        if(element.className) {
            current = (' ' + element.className + ' ').replace(REGEX_CLASS_SEPARATOR, ' ');
        }

        if(current.indexOf(' ' + value + ' ') >= 0) {
            current = current.replace(' ' + value + ' ', ' ');
        }
        element.className = value ? current.trim() : '';
    }

    function applyDefaults(options, defaults) {
        var result = {};
        for(var key in defaults) {
            result[key] = (options && options[key]) || defaults[key];
        }
        return result;
    }

    function getTransitionEndEventName() {
        var transitions = {
            'transition':'transitionend',
            'OTransition':'oTransitionEnd',
            'MozTransition':'transitionend',
            'WebkitTransition':'webkitTransitionEnd'
        };
        var transition;
        for(transition in transitions){
            if( document.body.style[transition] !== undefined ){
                return transitions[transition];
            }
        }
    }

    var TRANSITION_END_EVENT = getTransitionEndEventName();

    window.Prompt = Prompt;
})(window, window.document);