/*
 * twitcher.js
 * Developed by Sid Sethi
 * http://github.com/SidSTi/twitcher
 * 
 * Under MIT Licence
 * (c) 2015, Sid Sethi
 */

 var Twitcher = (function(){
 	'use strict';
 	var Twitcher = function(input, o) {

 		var self = this;

 		this.input = $(input);
 		this.input.setAttribute('autocomplete', 'false');
 		
 		o = o || {};

 		configure.call(this, {
			minChars: 2,
			maxItems: 10,
			autoFirst: false,
			filter: Twitcher.FILTER_CONTAINS,
			
			item: function (text, input) {
				return $.create("li", {
					innerHTML: text.replace(RegExp($.regExpEscape(input.trim()), "gi"), "<mark>$&</mark>")
				});
			},
			replace: function (text) {
				this.input.value = text;
			}
		}, o);

		this.index = -1;

		// Create necessary elements

		this.container = $.create("div", {
			className: "awesomplete",
			around: input
		});

		this.ul = $.create("ul", {
			hidden: "",
			inside: this.container
		});

		this.status = $.create("span", {
			className: "visually-hidden",
			role: "status",
			"aria-live": "assertive",
			"aria-relevant": "additions",
			inside: this.container
		});

		// Bind events

		$.bind(this.input, {
			"input": this.evaluate.bind(this),
			"blur": this.close.bind(this),
			"keydown": function(evt) {
				var c = evt.keyCode;

				// If the dropdown `ul` is in view, then act on keydown for the following keys:
				// Enter / Esc / Up / Down
				if(self.opened) {
					if (c === 13 && self.selected) { // Enter
						evt.preventDefault();
						self.select();
					}
					else if (c === 27) { // Esc
						self.close();
					}
					else if (c === 38 || c === 40) { // Down/Up arrow
						evt.preventDefault();
						self[c === 38? "previous" : "next"]();
					}
				}
			}
		});

		$.bind(this.input.form, {"submit": this.close.bind(this)});

		$.bind(this.ul, {"mousedown": function(evt) {
			var li = evt.target;

			if (li !== this) {

				while (li && !/li/i.test(li.nodeName)) {
					li = li.parentNode;
				}

				if (li) {
					self.select(li);
				}
			}
		}});

		if (this.input.hasAttribute("list")) {
			this.list = "#" + input.getAttribute("list");
			input.removeAttribute("list");
		}
		else {
			this.list = this.input.getAttribute("data-list") || o.list || [];
		}

		Twitcher.all.push(this);
 	} 

 	Twitcher.prototype = {
		set list(list) {
			if (Array.isArray(list)) {
				this._list = list;
			}
			else if (typeof list === "string" && list.indexOf(",") > -1) {
					this._list = list.split(/\s*,\s*/);
			}
			else { // Element or CSS selector
				list = $(list);

				if (list && list.children) {
					this._list = slice.apply(list.children).map(function (el) {
						return el.textContent.trim();
					});
				}
			}

			if (document.activeElement === this.input) {
				this.evaluate();
			}
		},

		get selected() {
			return this.index > -1;
		},

		get opened() {
			return this.ul && this.ul.getAttribute("hidden") == null;
		},

		close: function () {
			this.ul.setAttribute("hidden", "");
			this.index = -1;

			$.fire(this.input, "awesomplete-close");
		},

		open: function () {
			this.ul.removeAttribute("hidden");

			if (this.autoFirst && this.index === -1) {
				this.goto(0);
			}

			$.fire(this.input, "awesomplete-open");
		},

		next: function () {
			var count = this.ul.children.length;

			this.goto(this.index < count - 1? this.index + 1 : -1);
		},

		previous: function () {
			var count = this.ul.children.length;

			this.goto(this.selected? this.index - 1 : count - 1);
		},

		// Should not be used, highlights specific item without any checks!
		goto: function (i) {
			var lis = this.ul.children;

			if (this.selected) {
				lis[this.index].setAttribute("aria-selected", "false");
			}

			this.index = i;

			if (i > -1 && lis.length > 0) {
				lis[i].setAttribute("aria-selected", "true");
				this.status.textContent = lis[i].textContent;
			}

			$.fire(this.input, "awesomplete-highlight");
		},

		select: function (selected) {
			selected = selected || this.ul.children[this.index];

			if (selected) {
				var prevented;

				$.fire(this.input, "awesomplete-select", {
					text: selected.textContent,
					preventDefault: function () {
						prevented = true;
					}
				});

				if (!prevented) {
					this.replace(selected.textContent);
					this.close();
					$.fire(this.input, "awesomplete-selectcomplete");
				}
			}
		},

		evaluate: function() {
			this.queried = this.queried || [];

			var value = this.input.value;

			$.queryParams['q'] = value;

			  // Load results via AJAX (if enabled and the term hasn't already been queried)
			if($.custParams.url && this.queried.indexOf(value) === -1) {
			    this.queried.push(value);
			    this.post($.custParams, $.queryParams);
			}

			  // Run evaluate as usual on the existing items
			  this.evaluateList();
		},

		evaluateList: function() {
			var self = this;
			var value = this.input.value;

			if (value.length >= this.minChars && this._list.length > 0) {
				this.index = -1;
				// Populate list with options that match
				this.ul.innerHTML = "";

				this._list
					.filter(function(item) {
						return self.filter(item, value);
					})
					.sort(this.sort)
					.every(function(text, i) {
						self.ul.appendChild(self.item(text, value));

						return i < self.maxItems - 1;
					});

				if (this.ul.children.length === 0) {
					this.close();
				} else {
					this.open();
				}
			}
			else {
				this.close();
			}
		},

		post: function (custParams, queryParams) {
	        	        
	        var headers     = $.custParams.headers,
	            headersKeys = Object.getOwnPropertyNames(headers),
	            method      = $.custParams.method,
	            url         = $.custParams.url,
	            self		= this,
	            i;

	        if (method.match(/^GET$/i)) {
	        	url += "?";
	        	for(var query in $.queryParams){
	        		var param = query + "=" + $.queryParams[query]+"&";
	        		url += param;
	        	}

		       $jsonp.send(url+'callback=twitcher', {
		        	callbackName: 'twitcher',
		        	onSuccess: function(data){
				      self.parseObj(data);
				    },
				    onTimeout: function(){
				      console.log('timeout!');
				    },
				    timeout: 5
				});
	        }
    	},

    	parseObj: function(data) {
    		var self = this;
    		self.bufferList = self.bufferList || {};

    		data.games.reduce(function(obj, value){
    			return self.bufferList[value.name] = value.box.small;
    		}, self.bufferList);
		}
	};

	// Private functions

	Twitcher.all = [];

	Twitcher.FILTER_CONTAINS = function (text, input) {
		return RegExp($.regExpEscape(input.trim()), "i").test(text);
	};


	function configure(properties, o) {
		for (var i in properties) {
			var initial = properties[i],
			    attrValue = this.input.getAttribute("data-" + i.toLowerCase());

			if (typeof initial === "number") {
				this[i] = parseInt(attrValue);
			}
			else if (initial === false) { // Boolean options must be false by default anyway
				this[i] = attrValue !== null;
			}
			else if (initial instanceof Function) {
				this[i] = null;
			}
			else {
				this[i] = attrValue;
			}

			if (!this[i] && this[i] !== 0) {
				this[i] = (i in o)? o[i] : initial;
			}
		}
	}

	// Helpers

	var slice = Array.prototype.slice;

	function $(expr, con) {
		return typeof expr === "string"? (con || document).querySelector(expr) : expr || null;
	}

	function $$(expr, con) {
		return slice.call((con || document).querySelectorAll(expr));
	}

	$.create = function(tag, o) {
		var element = document.createElement(tag);

		for (var i in o) {
			var val = o[i];

			if (i === "inside") {
				$(val).appendChild(element);
			}
			else if (i === "around") {
				var ref = $(val);
				ref.parentNode.insertBefore(element, ref);
				element.appendChild(ref);
			}
			else if (i in element) {
				element[i] = val;
			}
			else {
				element.setAttribute(i, val);
			}
		}

		return element;
	};

	$.bind = function(element, o) {
		if (element) {
			for (var event in o) {
				var callback = o[event];

				event.split(/\s+/).forEach(function (event) {
					element.addEventListener(event, callback);
				});
			}
		}
	};

	$.fire = function(target, type, properties) {
		var evt = document.createEvent("HTMLEvents");

		evt.initEvent(type, true, true );

		for (var j in properties) {
			evt[j] = properties[j];
		}

		target.dispatchEvent(evt);
	};

	$.regExpEscape = function (s) {
		return s.replace(/[-\\^$*+?.()|[\]{}]/g, "\\$&");
	}

	// Initialization

	function init() {

		$$("input.Twitcher").forEach(function (input) {
			new Twitcher(input);
		});
	}

	// Are we in a browser? Check for Document constructor
	if (typeof Document !== 'undefined') {
		// DOM already loaded?
		if (document.readyState !== "loading") {
			init();
		}
		else {
			// Wait for it
			document.addEventListener("DOMContentLoaded", init);
		}
	}

	Twitcher.$ = $;
	Twitcher.$$ = $$;

	// Make sure to export Twitcher on self when in a browser
	if (typeof self !== 'undefined') {
		self.Twitcher = Twitcher;
	}

	return Twitcher;
 })();

 var $jsonp = (function(){
  var result = {};

  result.send = function(src, options) {
    var options = options || {},
      callback_name = options.callbackName || 'callback',
      on_success = options.onSuccess || function(){},
      on_timeout = options.onTimeout || function(){},
      timeout = options.timeout || 10;

    var timeout_trigger = window.setTimeout(function(){
      window[callback_name] = function(){};
      on_timeout();
    }, timeout * 1000);

    window[callback_name] = function(data){
      window.clearTimeout(timeout_trigger);
      on_success(data);
    };

    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = src;

    document.getElementsByTagName('head')[0].appendChild(script);

    script.onload = function () {
            this.remove();
        };
  };

  return result;
})();

 