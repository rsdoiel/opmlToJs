var myProductName = "opmltojs"; myVersion = "0.4.5";

/*  The MIT License (MIT)
	Copyright (c) 2014-2017 Dave Winer
	
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
	*/

exports.parse = parse; 
exports.opmlify = opmlify; //8/6/17 by DW

const xml2js = require ("xml2js");
const utils = require ("daveutils");

function isScalar (obj) {
	if (typeof (obj) == "object") {
		return (false);
		}
	return (true);
	}

function parse (opmltext, callback) {
	function convert (sourcestruct, deststruct) {
		var atts = sourcestruct ["$"];
		if (atts !== undefined) {
			for (var x in atts) {
				deststruct [x] = atts [x];
				}
			delete sourcestruct ["$"];
			}
		for (var x in sourcestruct) {
			var obj = sourcestruct [x];
			if (isScalar (obj)) {
				deststruct [x] = obj;
				}
			else {
				if (x == "outline") {
					if (deststruct.subs === undefined) {
						deststruct.subs = new Array ();
						}
					if (Array.isArray (obj)) {
						for (var i = 0; i < obj.length; i++) {
							var newobj = new Object ();
							convert (obj [i], newobj);
							deststruct.subs.push (newobj);
							}
						}
					else {
						var newobj = new Object ();
						convert (obj, newobj);
						deststruct.subs.push (newobj);
						}
					}
				else {
					deststruct [x] = new Object ();
					convert (obj, deststruct [x]);
					}
				}
			}
		}
	var options = {
		explicitArray: false
		};
	xml2js.parseString (opmltext, options, function (err, jstruct) {
		var theOutline = {
			opml: new Object ()
			}
		convert (jstruct.opml, theOutline.opml);
		callback (theOutline);
		});
	}
function opmlify (theOutline, fname) { //returns the opmltext for the outline -- 8/6/17 by DW
	var opmltext = "", indentlevel = 0;
	function add (s) {
		opmltext += utils.filledString ("\t", indentlevel) + s + "\n";
		}
	function addSubs (subs) {
		if (subs !== undefined) {
			for (var i = 0; i < subs.length; i++) {
				let sub = subs [i], atts = "";
				for (var x in sub) {
					if (x != "subs") {
						atts += " " + x + "=\"" + utils.encodeXml (sub [x]) + "\"";
						}
					}
				if (sub.subs === undefined) {
					add ("<outline" + atts + " />");
					}
				else {
					add ("<outline" + atts + " >"); indentlevel++;
					addSubs (sub.subs);
					add ("</outline>"); indentlevel--;
					}
				}
			}
		}
	add ("<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?>");
	add ("<opml version=\"2.0\">"); indentlevel++;
	//do head section
		add ("<head>"); indentlevel++;
		for (var x in theOutline.opml.head) {
			add ("<" + x + ">" + theOutline.opml.head [x] + "</" + x + ">");
			}
		add ("</head>"); indentlevel--;
	//do body section
		add ("<body>"); indentlevel++;
		addSubs (theOutline.opml.body.subs);
		add ("</body>"); indentlevel--;
	add ("</opml>"); indentlevel--;
	return (opmltext);
	}
