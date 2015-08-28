/*
 * twitcher.js
 * Developed by Sid Sethi
 * http://github.com/SidSTi/twitcher
 * 
 * Under MIT Licence
 * (c) 2015, Sid Sethi
 */

 var Twitcher = (function() {
 	var Twitcher = function(input, o) {

 		var self = this;

 		this.input = $(input);
 		this.input.setAttribute('autocomplete', 'false');
 		
 		o = o || {};

 		configure.call(this, {
			minChars : 2,
			maxItems : 5,
			autoFirst : false,
			filter : Twitcher.FILTER_CONTAINS,
			offSet : 0,
			limit : 5,
			totalPages : null,
			currentPage : null,

			resultDiv : function(idd) {
				return $.create("div", {
					id : idd,
					className : "twitcher-result-body-stream"
				});
			},
			resultDivImg : function(imgSrc) {
				return $.create("img", {
					src : imgSrc,
					className : "resultDivImg"
				});
			},
			resultDivImgPlaceholder : function() {
				return $.create("div", {
					className : "resultDivImgPlaceholder",
				});
			},
			resultDivInfo : function() {
				return $.create("div", {
					className : "resultDivInfo"
				});
			},
			resultDivDisplayName : function(displayName, channelSrc) {
				return $.create("a", {
					href : channelSrc,
					className : "resultDivDisplayName",
					innerHTML : displayName
				});
			},
			resultDivGame : function(game, viewers) {
				return $.create("span", {
					className : "resultDivGame",
					innerHTML : game + " - " + viewers + " viewers"
				});
			},
			resultDivDescription : function(description) {
				return $.create("p", {
					className : "resultDivDescription",
					innerHTML : description
				});
			},
			item : function(text, input) {
				return $.create("li", {
					innerHTML: "<span>" + text.replace(RegExp($.regExpEscape(input.trim()), "gi"), "<mark>$&</mark>") + "</span>",
					id:text
				});			
			},
			itemImg : function(text) {
				return $.create("img", {
					src : self.bufferList[text]
				});
			},
			replace : function(text) {
				this.input.value = text;
			}
		}, o);

		this.index = -1;

		// Create Twitcher skeleton

		this.searchContainer = $.create("section", {
			className : "twitcher-search",
			around : input
		});

		this.searchButton = $.create("button", {
			className : "twitcher-submit",
			"type" : "button",
			innerHTML : "Search",
			after : input
		});

		this.searchUList = $.create("ul", {
			className : "twitcher-search-list",
			hidden : "",
			inside : this.searchContainer
		});

		this.resultContainer = $.create("section", {
			className : "twitcher-result",
			after : this.searchContainer
		});
		
		this.resultContainerHead = $.create("div", {
			className : "twitcher-result-head",
			inside : this.resultContainer
		});
		
		this.resultContainerBody = $.create("div", {
			className : "twitcher-result-body",
			after : this.resultContainerHead
		});

		this.resultContainerHeadTotal = $.create("span", {
			className : "twitcher-search-total",
			inside : this.resultContainerHead
		});

		this.resultContainerHeadPaginator = $.create("span", {
			className : "twitcher-search-paginator",
			after : this.resultContainerHeadTotal
		});

		this.prevButton = $.create("span", {
			className : "prev-button",
			inside : this.resultContainerHeadPaginator
		});

		this.currentPageSpan = $.create("span", {
			className : "current-page",
			after : this.prevButton
		});
		
		this.nextButton = $.create("span", {
			className : "next-button",
			after : this.currentPageSpan
		});
		
		this.status = $.create("span", {
			className : "visually-hidden",
			role : "status",
			inside : this.searchContainer
		});

		// Bind events

		$.bind(this.input, {

			"input" : function() {
				setTimeout(self.evaluate.bind(self, "game"), 300);
			},
			"blur" : function() {
				self.close.call(self);
			},
			"keydown" : function(evt) {
				var c = evt.keyCode;

				if (document.activeElement === self.input) {
					if(c === 13) {
						evt.preventDefault();
						self.evaluate("stream");
					}
				}
				// If the dropdown `ul` is in view, then act on keydown for the following keys:
				// Enter / Esc / Up / Down
				if(self.opened) {
					if (c === 13 && self.selected) { // Enter on a choice
						console.log('Pressed Return on selected item');
						evt.preventDefault();
						self.select();
					}
					else if(c==13 && !self.selected && self.input.value!=null) { // Enter without choosing
						console.log('Pressed Return without selection');
						self.close();
						self.evaluate("stream");
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

		$.bind(this.nextButton, {
			mousedown : function() {
				if(self.currentPage < self.totalPages) {
					if(self.streamList.hasOwnProperty("next")){
						self.evaluate("stream", self.streamList["next"]);
						self.offSet += self.limit;
						self.currentPage = Math.abs((self.limit + self.offSet)/self.limit);
					}
				}
			}
		});

		$.bind(this.prevButton, {
			mousedown : function() {
				if(self.offSet > 0) {
					if(self.streamList.hasOwnProperty("prev")){
						self.evaluate("stream", self.streamList["prev"]);
						self.offSet -= self.limit;
						self.currentPage = Math.abs((self.offSet-self.limit)/self.limit);
					}	
				} 
			}
		});

		$.bind(this.searchButton, {
			"mousedown" : function() {
				console.log('Submitted', self.input.value);
				self.evaluate("stream");
			}
		});

		$.bind(this.searchUList, {
			"mousedown" : function(evt) {
				var li = evt.target;

				if (li !== this) {

					while (li && !/li/i.test(li.nodeName)) {
						li = li.parentNode;
					}

					if (li) {
						self.select(li);
						self.evaluate.bind(self, "stream");
					}
				}
			}
		});

				
		this.bufferList = o.bufferList || {};
		this.streamList = {};

		Twitcher.all.push(this);
 	} 

 	Twitcher.prototype = {

		get selected() {
			return this.index > -1;
		},

		get opened() {
			return this.searchUList && this.searchUList.getAttribute("hidden") == null;
		},

		close : function() {
			if(this.opened){
				this.searchUList.setAttribute("hidden", "");
				this.index = -1;
			}
		},

		open : function() {
			this.searchUList.removeAttribute("hidden");

			if (this.autoFirst && this.index === -1) {
				this.goto(0);
			}
		},

		next : function() {
			var count = this.searchUList.children.length;

			this.goto(this.index < count - 1? this.index + 1 : -1);
		},

		previous : function() {
			var count = this.searchUList.children.length;

			this.goto(this.selected? this.index - 1 : count - 1);
		},

		// Should not be used, highlights specific item without any checks!
		goto : function(i) {
			var lis = this.searchUList.children;

			if (this.selected) {
				lis[this.index].setAttribute("selected", "false");
				lis[this.index].removeAttribute("style");
			}

			this.index = i;

			if (i > -1 && lis.length > 0) {
				lis[i].setAttribute("selected", "true");
				this.status.textContent = lis[i].textContent;
				lis[i].setAttribute("style", "background-color : #9B87FF")
			}
		},

		select : function(selected) {
			selected = selected || this.searchUList.children[this.index];

			if (selected) {
				var prevented;

				if (!prevented) {
					this.replace(selected.textContent);
					this.close();
				}
			}
			setTimeout(this.evaluate.bind(this, "stream"), 200);
		},

		evaluate : function(type, goToPage) {
			this.queried = this.queried || [];
			var value = this.input.value;
			$.gameParams.queryParams['q'] = value;
			$.streamParams.queryParams['q'] = value;

			if(type === "game") {
				if(this.queried.indexOf(value) === -1) {
					this.queried.push(value);
					// Make an XHR request (if the term hasn't already been queried)
					this.post($.gameParams, type);
				}
				// Re-Evaluate the existing items
				this.evaluateList();
			} 
			else if(type === "stream") {
				if(goToPage) {
					this.post($.streamParams, type, goToPage);
				} 
				else {
					// Make an XHR request to stream
					this.offSet = 0;
					this.post($.streamParams, type);
				}
				// Re-Evaluate the result page
				this.evaluateResult();
			}
		},

		evaluateList : function() {
			var self = this;
			var value = this.input.value;

			if (value.length >= this.minChars && Object.keys(self.bufferList).length > 0) {
				this.index = -1;
				// Populate list with options that match
				this.searchUList.innerHTML = "";

				Object.keys(self.bufferList)
					.filter(function(item) {
						return self.filter(item, value);
					})
					.sort(this.sort)
					.every(function(text, i) {
						var listElem = self.item(text, value);
						self.searchUList.appendChild(listElem);
						//console.log(listElem);
						listElem.firstChild.parentNode.insertBefore(self.itemImg(text), listElem.firstChild);
						//listElem.appendChild(self.itemImg(text));
						return i < self.maxItems - 1;
					});

				if (this.searchUList.children.length === 0) {
					this.close();
				} else {
					this.open();
				}
			}
			else {
				this.close();
			}
		},

		evaluateResult : function() {
			var self = this;
			var value = this.input.value;

			if (Object.keys(self.streamList).length > 0) {
				this.resultContainerBody.innerHTML = "";
				this.resultContainerHeadTotal.innerHTML = "Total : " + self.streamList.total;
				this.currentPageSpan.innerHTML = this.currentPage + "/" + this.totalPages;

				if(self.offSet==0){
					self.prevButton.setAttribute("style", "display : none");
				}
				else {
					self.prevButton.setAttribute("style", "display : inline");
					self.prevButton.innerHTML = "Prev";
				}

				if(self.currentPage == self.totalPages){
					self.nextButton.setAttribute("style", "display : none");
				}
				else {
					self.nextButton.setAttribute("style", "display : inline");
					self.nextButton.innerHTML = "Next";
				}

				Object.keys(self.streamList.channel)
					.every(function(id, index) {
						var resultObj = self.streamList.channel[id];
						var resultDiv = self.resultDiv(id);
						var resultDivImgPlaceholder = self.resultDivImgPlaceholder();
						var resultDivImg = self.resultDivImg(resultObj.imgSrc);
						var resultDivInfo = self.resultDivInfo();
						var resultDivDisplayName = self.resultDivDisplayName(resultObj.displayName, resultObj.channelSrc);
						var resultDivGame = self.resultDivGame(resultObj.game, resultObj.viewers);
						var resultDivDescription = self.resultDivDescription(resultObj.description);

						resultDiv.appendChild(resultDivImgPlaceholder);
						resultDivImgPlaceholder.parentNode.insertBefore(resultDivInfo, resultDivImgPlaceholder.nextSibling);
						resultDivInfo.appendChild(resultDivDisplayName);
						resultDivDisplayName.parentNode.insertBefore(resultDivGame, resultDivDisplayName.nextSibling);
						resultDivGame.parentNode.insertBefore(resultDivDescription, resultDivGame.nextSibling);

						self.resultContainerBody.appendChild(resultDiv);
						resultDivImgPlaceholder.appendChild(resultDivImg);
						return index < self.limit - 1;
					});
			}
		},

		post : function(custParams, type, goToPage) {
		    var headers     = custParams.headers,
	            headersKeys = Object.getOwnPropertyNames(headers),
	            method      = custParams.method,
	            url         = custParams.url,
	            self		= this,
	            i;

    		if(Object.keys(this.bufferList).length > 0 && Object.keys(this.bufferList).length >= 250){
    			this.bufferList = {};
    		}

	        if (method.match(/^GET$/i)) {
	        	url += "?";
	        	for(var query in custParams.queryParams) {
	        		var param = query + "=" + custParams.queryParams[query]+"&";
	        		url += param;
	        	}

	        	if(type === 'game') {
	        		$jsonp.send(url+'callback=twitcher', {
			        	callbackName: 'twitcher',
			        	onSuccess : function(data) {
					      self.parseObj(data);
					    },
					    onTimeout : function() {
					      console.log('timeout!');
					    },
					    timeout: 5
					});
	        	}
		       	else if(type === 'stream') {
		       		self.streamList = {};

		       		if(goToPage){
		       			$jsonp.send(goToPage+"&"+'callback=twitcher', {
				        	callbackName: 'twitcher',
				        	onSuccess : function(data) {
						      self.parseResult(data);
						    },
						    onTimeout : function() {
						      console.log('timeout!');
						    },
						    timeout: 5
						});
		       		}
		       		else {
		       			$jsonp.send(url +'callback=twitcher', {
				        	callbackName: 'twitcher',
				        	onSuccess : function(data) {
						      self.parseResult(data);
						    },
						    onTimeout : function() {
						      console.log('timeout!');
						    },
						    timeout: 5
						});
		       		}
		       	}
	        }
    	},

    	parseObj : function(data) {
    		var self = this;
    		self.bufferList = self.bufferList || {};
    		
    		if(data.hasOwnProperty('games') && data.games.length>0) {
    			data.games.reduce(function(obj, value) {
    				obj[value.name] = value.box.small;
    				return obj;
    			}, self.bufferList);
    		}
    		
    		this.evaluateList();
		},

		parseResult : function(data) {
			var self = this;
			self.streamList = {};
			
			if(data.hasOwnProperty('streams') && parseInt(data["_total"])>0) {
				self.streamList.total = data["_total"];
				self.streamList.offSet = self.offSet;
				self.totalPages = Math.ceil(self.streamList.total/self.limit);
				self.currentPage = Math.abs((self.limit + self.offSet)/self.limit);
				self.streamList.channel = {};
				
				if(data["_links"].hasOwnProperty("next")) {
					self.streamList.next = data["_links"].next;
				}

				if(data["_links"].hasOwnProperty("prev")) {
					self.streamList.prev = data["_links"].prev;
				}


				data.streams.reduce(function(obj, value) {
					var descString = "";
					obj.channel[value["_id"]] = {};
					obj.channel[value["_id"]].displayName = value.channel["display_name"];
					obj.channel[value["_id"]].imgSrc = value.preview.medium;
					obj.channel[value["_id"]].channelSrc = value.channel.url;
					
					if(value.channel.game == null){
						obj.channel[value["_id"]].game = "Name of Game not present";	
					} 
					else obj.channel[value["_id"]].game = value.channel.game;
					
					obj.channel[value["_id"]].viewers = value.viewers;
					
					if(value.channel.length > 500){
						descString = value.channel.substring(0,500) + "...";
						obj.channel[value["_id"]].description = descString;	
					}
					else obj.channel[value["_id"]].description = value.channel.status;

					return obj;
				}, self.streamList);
			}

			this.evaluateResult();
		}
	};

	// Static methods/properties
	
	Twitcher.all = [];

	Twitcher.FILTER_CONTAINS = function (text, input) {
		return RegExp($.regExpEscape(input.trim()), "i").test(text);
	};

	// Private methods

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

	// Helper functions
	
	var slice = Array.prototype.slice;

	function $(expr, con) {
		return typeof expr === "string"? (con || document).querySelector(expr) : expr || null;
	}

	function $$(expr, con) {
		return slice.call((con || document).querySelectorAll(expr));
	}

	var $jsonp = (function() {
		var result = {};

	  	result.send = function(src, options) {
	    	var options = options || {},
	      	callback_name = options.callbackName || 'callback',
	      	on_success = options.onSuccess || function(){},
	      	on_timeout = options.onTimeout || function(){},
	      	timeout = options.timeout || 10;

	    	var timeout_trigger = window.setTimeout(function() {
	      		window[callback_name] = function(){};
	      		on_timeout();
	    		}, timeout * 1000);

	    	window[callback_name] = function(data) {
	      		window.clearTimeout(timeout_trigger);
	      		on_success(data);
	    	};

	    	var script = document.createElement('script');
	    	script.type = 'text/javascript';
	    	script.async = true;
	    	script.src = src;

	    	document.getElementsByTagName('head')[0].appendChild(script);

	    	script.onload = function() {
	            this.remove();
	        }
	  	}

	  	return result;
	})();

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
			else if (i === "after") {
				var ref = $(val);
				ref.parentNode.insertBefore(element, ref.nextSibling);
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

