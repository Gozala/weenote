;(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){
(function(){var lang = {
  deepCopy: function (obj) {
    if (typeof obj != "object") {
        return obj;
    }

    var copy = obj.constructor();
    for (var key in obj) {
        if (typeof obj[key] == "object") {
            copy[key] = this.deepCopy(obj[key]);
        } else {
            copy[key] = obj[key];
        }
    }
    return copy;
  }
}


// =>


var Tokenizer = function(rules, flag) {
    flag = flag ? "g" + flag : "g";
    this.rules = rules;

    this.regExps = {};
    this.matchMappings = {};
    for ( var key in this.rules) {
        var rule = this.rules[key];
        var state = rule;
        var ruleRegExps = [];
        var matchTotal = 0;
        var mapping = this.matchMappings[key] = {};

        for ( var i = 0; i < state.length; i++) {

            if (state[i].regex instanceof RegExp)
                state[i].regex = state[i].regex.toString().slice(1, -1);

            // Count number of matching groups. 2 extra groups from the full match
            // And the catch-all on the end (used to force a match);
            var matchcount = new RegExp("(?:(" + state[i].regex + ")|(.))").exec("a").length - 2;

            // Replace any backreferences and offset appropriately.
            var adjustedregex = state[i].regex.replace(/\\([0-9]+)/g, function (match, digit) {
                return "\\" + (parseInt(digit, 10) + matchTotal + 1);
            });

            if (matchcount > 1 && state[i].token.length !== matchcount-1)
                throw new Error("For " + state[i].regex + " the matching groups (" +(matchcount-1) + ") and length of the token array (" + state[i].token.length + ") don't match (rule #" + i + " of state " + key + ")");

            mapping[matchTotal] = {
                rule: i,
                len: matchcount
            };
            matchTotal += matchcount;

            ruleRegExps.push(adjustedregex);
        }

        this.regExps[key] = new RegExp("(?:(" + ruleRegExps.join(")|(") + ")|(.))", flag);
    }
};

(function() {

    /**
    * Tokenizer.getLineTokens() -> Object
    *
    * Returns an object containing two properties: `tokens`, which contains all the tokens; and `state`, the current state.
    **/
    this.getLineTokens = function(line, startState) {
        var currentState = startState || "start";
        var state = this.rules[currentState];
        var mapping = this.matchMappings[currentState];
        var re = this.regExps[currentState];
        re.lastIndex = 0;

        var match, tokens = [];

        var lastIndex = 0;

        var token = {
            type: null,
            value: ""
        };

        while (match = re.exec(line)) {
            var type = "text";
            var rule = null;
            var value = [match[0]];

            for (var i = 0; i < match.length-2; i++) {
                if (match[i + 1] === undefined)
                    continue;

                rule = state[mapping[i].rule];

                if (mapping[i].len > 1)
                    value = match.slice(i+2, i+1+mapping[i].len);

                // compute token type
                if (typeof rule.token == "function")
                    type = rule.token.apply(this, value);
                else
                    type = rule.token;

                if (rule.next) {
                    currentState = rule.next;
                    state = this.rules[currentState];
                    mapping = this.matchMappings[currentState];
                    lastIndex = re.lastIndex;

                    re = this.regExps[currentState];

                    if (re === undefined) {
                         throw new Error("You indicated a state of " + rule.next + " to go to, but it doesn't exist!");
                    }

                    re.lastIndex = lastIndex;
                }
                break;
            }

            if (value[0]) {
                if (typeof type == "string") {
                    value = [value.join("")];
                    type = [type];
                }
                for (var i = 0; i < value.length; i++) {
                    if (!value[i])
                        continue;

                    if ((!rule || rule.merge || type[i] === "text") && token.type === type[i]) {
                        token.value += value[i];
                    } else {
                        if (token.type)
                            tokens.push(token);

                        token = {
                            type: type[i],
                            value: value[i]
                        };
                    }
                }
            }

            if (lastIndex == line.length)
                break;

            lastIndex = re.lastIndex;
        }

        if (token.type)
            tokens.push(token);

        return {
            tokens : tokens,
            state : currentState
        };
    };

}).call(Tokenizer.prototype);


// =>


function TextHighlightRules() {

    // regexp must not have capturing parentheses
    // regexps are ordered -> the first match is used

    this.$rules = {
        "start" : [{
            token : "empty_line",
            regex : '^$'
        }, {
            token : "text",
            regex : ".+"
        }]
    };
}


// =>

(function() {

    this.addRules = function(rules, prefix) {
        for (var key in rules) {
            var state = rules[key];
            for (var i=0; i<state.length; i++) {
                var rule = state[i];
                if (rule.next) {
                    rule.next = prefix + rule.next;
                }
            }
            this.$rules[prefix + key] = state;
        }
    };

    this.getRules = function() {
        return this.$rules;
    };

    this.embedRules = function (HighlightRules, prefix, escapeRules, states, append) {
        var embedRules = new HighlightRules().getRules();
        if (states) {
            for (var i = 0; i < states.length; i++)
                states[i] = prefix + states[i];
        } else {
            states = [];
            for (var key in embedRules)
                states.push(prefix + key);
        }

        this.addRules(embedRules, prefix);

        var addRules = Array.prototype[append ? "push" : "unshift"];
        for (var i = 0; i < states.length; i++)
            addRules.apply(this.$rules[states[i]], lang.deepCopy(escapeRules));

        if (!this.$embeds)
            this.$embeds = [];
        this.$embeds.push(prefix);
    }

    this.getEmbeds = function() {
        return this.$embeds;
    }

    this.createKeywordMapper = function(map, defaultToken, ignoreCase, splitChar) {
        var keywords = Object.create(null);
        Object.keys(map).forEach(function(className) {
            var list = map[className].split(splitChar || "|");
            for (var i = list.length; i--; )
                keywords[list[i]] = className;
        });
        map = null;
        return ignoreCase
            ? function(value) {return keywords[value.toLowerCase()] || defaultToken }
            : function(value) {return keywords[value] || defaultToken };
    }

}).call(TextHighlightRules.prototype);

// =>



var DocCommentHighlightRules = function() {

    this.$rules = {
        "start" : [ {
            token : "comment.doc.tag",
            regex : "@[\\w\\d_]+" // TODO: fix email addresses
        }, {
            token : "comment.doc",
            merge : true,
            regex : "\\s+"
        }, {
            token : "comment.doc",
            merge : true,
            regex : "TODO"
        }, {
            token : "comment.doc",
            merge : true,
            regex : "[^@\\*]+"
        }, {
            token : "comment.doc",
            merge : true,
            regex : "."
        }]
    };
};

DocCommentHighlightRules.prototype = new TextHighlightRules

DocCommentHighlightRules.getStartRule = function(start) {
    return {
        token : "comment.doc", // doc comment
        merge : true,
        regex : "\\/\\*(?=\\*)",
        next  : start
    };
};

DocCommentHighlightRules.getEndRule = function (start) {
    return {
        token : "comment.doc", // closing comment
        merge : true,
        regex : "\\*\\/",
        next  : start
    };
}


// =>



var JavaScriptHighlightRules = function() {
    // see: https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects
    var keywordMapper = this.createKeywordMapper({
        "variable.language":
            "Array|Boolean|Date|Function|Iterator|Number|Object|RegExp|String|Proxy|"  + // Constructors
            "Namespace|QName|XML|XMLList|"                                             + // E4X
            "ArrayBuffer|Float32Array|Float64Array|Int16Array|Int32Array|Int8Array|"   +
            "Uint16Array|Uint32Array|Uint8Array|Uint8ClampedArray|"                    +
            "Error|EvalError|InternalError|RangeError|ReferenceError|StopIteration|"   + // Errors
            "SyntaxError|TypeError|URIError|"                                          +
            "decodeURI|decodeURIComponent|encodeURI|encodeURIComponent|eval|isFinite|" + // Non-constructor functions
            "isNaN|parseFloat|parseInt|"                                               +
            "JSON|Math|"                                                               + // Other
            "this|arguments|prototype|window|document"                                 , // Pseudo
        "keyword":
            "const|yield|import|get|set|" +
            "break|case|catch|continue|default|delete|do|else|finally|for|function|" +
            "if|in|instanceof|new|return|switch|throw|try|typeof|let|var|while|with|debugger|" +
            // invalid or reserved
            "__parent__|__count__|escape|unescape|with|__proto__|" +
            "class|enum|extends|super|export|implements|private|public|interface|package|protected|static",
        "storage.type":
            "const|let|var|function",
        "constant.language":
            "null|Infinity|NaN|undefined",
        "support.function":
            "alert"
    }, "identifier");

    // keywords which can be followed by regular expressions
    var kwBeforeRe = "case|do|else|finally|in|instanceof|return|throw|try|typeof|yield";

    // TODO: Unicode escape sequences
    var identifierRe = "[a-zA-Z\\$_\u00a1-\uffff][a-zA-Z\\d\\$_\u00a1-\uffff]*\\b";

    var escapedRe = "\\\\(?:x[0-9a-fA-F]{2}|" + // hex
        "u[0-9a-fA-F]{4}|" + // unicode
        "[0-2][0-7]{0,2}|" + // oct
        "3[0-6][0-7]?|" + // oct
        "37[0-7]?|" + // oct
        "[4-7][0-7]?|" + //oct
        ".)";

    // regexp must not have capturing parentheses. Use (?:) instead.
    // regexps are ordered -> the first match is used

    this.$rules = {
        "start" : [
            {
                token : "comment",
                regex : /\/\/.*$/
            },
            DocCommentHighlightRules.getStartRule("doc-start"),
            {
                token : "comment", // multi line comment
                merge : true,
                regex : /\/\*/,
                next : "comment"
            }, {
                token : "string",
                regex : "'(?=.)",
                next  : "qstring"
            }, {
                token : "string",
                regex : '"(?=.)',
                next  : "qqstring"
            }, {
                token : "constant.numeric", // hex
                regex : /0[xX][0-9a-fA-F]+\b/
            }, {
                token : "constant.numeric", // float
                regex : /[+-]?\d+(?:(?:\.\d*)?(?:[eE][+-]?\d+)?)?\b/
            }, {
                // Sound.prototype.play =
                token : [
                    "storage.type", "punctuation.operator", "support.function",
                    "punctuation.operator", "entity.name.function", "text","keyword.operator"
                ],
                regex : "(" + identifierRe + ")(\\.)(prototype)(\\.)(" + identifierRe +")(\\s*)(=)",
                next: "function_arguments"
            }, {
                // Sound.play = function() {  }
                token : [
                    "storage.type", "punctuation.operator", "entity.name.function", "text",
                    "keyword.operator", "text", "storage.type", "text", "paren.lparen"
                ],
                regex : "(" + identifierRe + ")(\\.)(" + identifierRe +")(\\s*)(=)(\\s*)(function)(\\s*)(\\()",
                next: "function_arguments"
            }, {
                // play = function() {  }
                token : [
                    "entity.name.function", "text", "keyword.operator", "text", "storage.type",
                    "text", "paren.lparen"
                ],
                regex : "(" + identifierRe +")(\\s*)(=)(\\s*)(function)(\\s*)(\\()",
                next: "function_arguments"
            }, {
                // Sound.play = function play() {  }
                token : [
                    "storage.type", "punctuation.operator", "entity.name.function", "text",
                    "keyword.operator", "text",
                    "storage.type", "text", "entity.name.function", "text", "paren.lparen"
                ],
                regex : "(" + identifierRe + ")(\\.)(" + identifierRe +")(\\s*)(=)(\\s*)(function)(\\s+)(\\w+)(\\s*)(\\()",
                next: "function_arguments"
            }, {
                // function myFunc(arg) { }
                token : [
                    "storage.type", "text", "entity.name.function", "text", "paren.lparen"
                ],
                regex : "(function)(\\s+)(" + identifierRe + ")(\\s*)(\\()",
                next: "function_arguments"
            }, {
                // foobar: function() { }
                token : [
                    "entity.name.function", "text", "punctuation.operator",
                    "text", "storage.type", "text", "paren.lparen"
                ],
                regex : "(" + identifierRe + ")(\\s*)(:)(\\s*)(function)(\\s*)(\\()",
                next: "function_arguments"
            }, {
                // : function() { } (this is for issues with 'foo': function() { })
                token : [
                    "text", "text", "storage.type", "text", "paren.lparen"
                ],
                regex : "(:)(\\s*)(function)(\\s*)(\\()",
                next: "function_arguments"
            }, {
                token : "constant.language.boolean",
                regex : /(?:true|false)\b/
            }, {
                token : "keyword",
                regex : "(?:" + kwBeforeRe + ")\\b",
                next : "regex_allowed"
            }, {
                token : ["punctuation.operator", "support.function"],
                regex : /(\.)(s(?:h(?:ift|ow(?:Mod(?:elessDialog|alDialog)|Help))|croll(?:X|By(?:Pages|Lines)?|Y|To)?|t(?:opzzzz|rike)|i(?:n|zeToContent|debar|gnText)|ort|u(?:p|b(?:str(?:ing)?)?)|pli(?:ce|t)|e(?:nd|t(?:Re(?:sizable|questHeader)|M(?:i(?:nutes|lliseconds)|onth)|Seconds|Ho(?:tKeys|urs)|Year|Cursor|Time(?:out)?|Interval|ZOptions|Date|UTC(?:M(?:i(?:nutes|lliseconds)|onth)|Seconds|Hours|Date|FullYear)|FullYear|Active)|arch)|qrt|lice|avePreferences|mall)|h(?:ome|andleEvent)|navigate|c(?:har(?:CodeAt|At)|o(?:s|n(?:cat|textual|firm)|mpile)|eil|lear(?:Timeout|Interval)?|a(?:ptureEvents|ll)|reate(?:StyleSheet|Popup|EventObject))|t(?:o(?:GMTString|S(?:tring|ource)|U(?:TCString|pperCase)|Lo(?:caleString|werCase))|est|a(?:n|int(?:Enabled)?))|i(?:s(?:NaN|Finite)|ndexOf|talics)|d(?:isableExternalCapture|ump|etachEvent)|u(?:n(?:shift|taint|escape|watch)|pdateCommands)|j(?:oin|avaEnabled)|p(?:o(?:p|w)|ush|lugins.refresh|a(?:ddings|rse(?:Int|Float)?)|r(?:int|ompt|eference))|e(?:scape|nableExternalCapture|val|lementFromPoint|x(?:p|ec(?:Script|Command)?))|valueOf|UTC|queryCommand(?:State|Indeterm|Enabled|Value)|f(?:i(?:nd|le(?:ModifiedDate|Size|CreatedDate|UpdatedDate)|xed)|o(?:nt(?:size|color)|rward)|loor|romCharCode)|watch|l(?:ink|o(?:ad|g)|astIndexOf)|a(?:sin|nchor|cos|t(?:tachEvent|ob|an(?:2)?)|pply|lert|b(?:s|ort))|r(?:ou(?:nd|teEvents)|e(?:size(?:By|To)|calc|turnValue|place|verse|l(?:oad|ease(?:Capture|Events)))|andom)|g(?:o|et(?:ResponseHeader|M(?:i(?:nutes|lliseconds)|onth)|Se(?:conds|lection)|Hours|Year|Time(?:zoneOffset)?|Da(?:y|te)|UTC(?:M(?:i(?:nutes|lliseconds)|onth)|Seconds|Hours|Da(?:y|te)|FullYear)|FullYear|A(?:ttention|llResponseHeaders)))|m(?:in|ove(?:B(?:y|elow)|To(?:Absolute)?|Above)|ergeAttributes|a(?:tch|rgins|x))|b(?:toa|ig|o(?:ld|rderWidths)|link|ack))\b(?=\()/
            }, {
                token : ["punctuation.operator", "support.function.dom"],
                regex : /(\.)(s(?:ub(?:stringData|mit)|plitText|e(?:t(?:NamedItem|Attribute(?:Node)?)|lect))|has(?:ChildNodes|Feature)|namedItem|c(?:l(?:ick|o(?:se|neNode))|reate(?:C(?:omment|DATASection|aption)|T(?:Head|extNode|Foot)|DocumentFragment|ProcessingInstruction|E(?:ntityReference|lement)|Attribute))|tabIndex|i(?:nsert(?:Row|Before|Cell|Data)|tem)|open|delete(?:Row|C(?:ell|aption)|T(?:Head|Foot)|Data)|focus|write(?:ln)?|a(?:dd|ppend(?:Child|Data))|re(?:set|place(?:Child|Data)|move(?:NamedItem|Child|Attribute(?:Node)?)?)|get(?:NamedItem|Element(?:sBy(?:Name|TagName)|ById)|Attribute(?:Node)?)|blur)\b(?=\()/
            }, {
                token : ["punctuation.operator", "support.constant"],
                regex : /(\.)(s(?:ystemLanguage|cr(?:ipts|ollbars|een(?:X|Y|Top|Left))|t(?:yle(?:Sheets)?|atus(?:Text|bar)?)|ibling(?:Below|Above)|ource|uffixes|e(?:curity(?:Policy)?|l(?:ection|f)))|h(?:istory|ost(?:name)?|as(?:h|Focus))|y|X(?:MLDocument|SLDocument)|n(?:ext|ame(?:space(?:s|URI)|Prop))|M(?:IN_VALUE|AX_VALUE)|c(?:haracterSet|o(?:n(?:structor|trollers)|okieEnabled|lorDepth|mp(?:onents|lete))|urrent|puClass|l(?:i(?:p(?:boardData)?|entInformation)|osed|asses)|alle(?:e|r)|rypto)|t(?:o(?:olbar|p)|ext(?:Transform|Indent|Decoration|Align)|ags)|SQRT(?:1_2|2)|i(?:n(?:ner(?:Height|Width)|put)|ds|gnoreCase)|zIndex|o(?:scpu|n(?:readystatechange|Line)|uter(?:Height|Width)|p(?:sProfile|ener)|ffscreenBuffering)|NEGATIVE_INFINITY|d(?:i(?:splay|alog(?:Height|Top|Width|Left|Arguments)|rectories)|e(?:scription|fault(?:Status|Ch(?:ecked|arset)|View)))|u(?:ser(?:Profile|Language|Agent)|n(?:iqueID|defined)|pdateInterval)|_content|p(?:ixelDepth|ort|ersonalbar|kcs11|l(?:ugins|atform)|a(?:thname|dding(?:Right|Bottom|Top|Left)|rent(?:Window|Layer)?|ge(?:X(?:Offset)?|Y(?:Offset)?))|r(?:o(?:to(?:col|type)|duct(?:Sub)?|mpter)|e(?:vious|fix)))|e(?:n(?:coding|abledPlugin)|x(?:ternal|pando)|mbeds)|v(?:isibility|endor(?:Sub)?|Linkcolor)|URLUnencoded|P(?:I|OSITIVE_INFINITY)|f(?:ilename|o(?:nt(?:Size|Family|Weight)|rmName)|rame(?:s|Element)|gColor)|E|whiteSpace|l(?:i(?:stStyleType|n(?:eHeight|kColor))|o(?:ca(?:tion(?:bar)?|lName)|wsrc)|e(?:ngth|ft(?:Context)?)|a(?:st(?:M(?:odified|atch)|Index|Paren)|yer(?:s|X)|nguage))|a(?:pp(?:MinorVersion|Name|Co(?:deName|re)|Version)|vail(?:Height|Top|Width|Left)|ll|r(?:ity|guments)|Linkcolor|bove)|r(?:ight(?:Context)?|e(?:sponse(?:XML|Text)|adyState))|global|x|m(?:imeTypes|ultiline|enubar|argin(?:Right|Bottom|Top|Left))|L(?:N(?:10|2)|OG(?:10E|2E))|b(?:o(?:ttom|rder(?:Width|RightWidth|BottomWidth|Style|Color|TopWidth|LeftWidth))|ufferDepth|elow|ackground(?:Color|Image)))\b/
            }, {
                token : ["storage.type", "punctuation.operator", "support.function.firebug"],
                regex : /(console)(\.)(warn|info|log|error|time|timeEnd|assert)\b/
            }, {
                token : keywordMapper,
                regex : identifierRe
            }, {
                token : "keyword.operator",
                regex : /!|\$|%|&|\*|\-\-|\-|\+\+|\+|~|===|==|=|!=|!==|<=|>=|<<=|>>=|>>>=|<>|<|>|!|&&|\|\||\?\:|\*=|%=|\+=|\-=|&=|\^=|\b(?:in|instanceof|new|delete|typeof|void)/,
                next  : "regex_allowed"
            }, {
                token : "punctuation.operator",
                regex : /\?|\:|\,|\;|\./,
                next  : "regex_allowed"
            }, {
                token : "paren.lparen",
                regex : /[\[({]/,
                next  : "regex_allowed"
            }, {
                token : "paren.rparen",
                regex : /[\])}]/
            }, {
                token : "keyword.operator",
                regex : /\/=?/,
                next  : "regex_allowed"
            }, {
                token: "comment",
                regex: /^#!.*$/
            }, {
                token : "text",
                regex : /\s+/
            }
        ],
        // regular expressions are only allowed after certain tokens. This
        // makes sure we don't mix up regexps with the divison operator
        "regex_allowed": [
            DocCommentHighlightRules.getStartRule("doc-start"),
            {
                token : "comment", // multi line comment
                merge : true,
                regex : "\\/\\*",
                next : "comment_regex_allowed"
            }, {
                token : "comment",
                regex : "\\/\\/.*$"
            }, {
                token: "string.regexp",
                regex: "\\/",
                next: "regex",
                merge: true
            }, {
                token : "text",
                regex : "\\s+"
            }, {
                // immediately return to the start mode without matching
                // anything
                token: "empty",
                regex: "",
                next: "start"
            }
        ],
        "regex": [
            {
                // escapes
                token: "regexp.keyword.operator",
                regex: "\\\\(?:u[\\da-fA-F]{4}|x[\\da-fA-F]{2}|.)"
            }, {
                // flag
                token: "string.regexp",
                regex: "/\\w*",
                next: "start",
                merge: true
            }, {
                // invalid operators
                token : "invalid",
                regex: /\{\d+,?(?:\d+)?}[+*]|[+*$^?][+*]|[$^][?]|\?{3,}/
            }, {
                // operators
                token : "constant.language.escape",
                regex: /\(\?[:=!]|\)|{\d+,?(?:\d+)?}|{,\d+}|[+*]\?|[(|)$^+*?]/
            }, {
                token: "string.regexp",
                regex: /{|[^{\[\/\\(|)$^+*?]+/,
                merge: true
            }, {
                token: "constant.language.escape",
                regex: /\[\^?/,
                next: "regex_character_class",
                merge: true
            }, {
                token: "empty",
                regex: "",
                next: "start"
            }
        ],
        "regex_character_class": [
            {
                token: "regexp.keyword.operator",
                regex: "\\\\(?:u[\\da-fA-F]{4}|x[\\da-fA-F]{2}|.)"
            }, {
                token: "constant.language.escape",
                regex: "]",
                next: "regex",
                merge: true
            }, {
                token: "constant.language.escape",
                regex: "-"
            }, {
                token: "string.regexp.charachterclass",
                regex: /[^\]\-\\]+/,
                merge: true
            }, {
                token: "empty",
                regex: "",
                next: "start"
            }
        ],
        "function_arguments": [
            {
                token: "variable.parameter",
                regex: identifierRe
            }, {
                token: "punctuation.operator",
                regex: "[, ]+",
                merge: true
            }, {
                token: "punctuation.operator",
                regex: "$",
                merge: true
            }, {
                token: "empty",
                regex: "",
                next: "start"
            }
        ],
        "comment_regex_allowed" : [
            {
                token : "comment", // closing comment
                regex : ".*?\\*\\/",
                merge : true,
                next : "regex_allowed"
            }, {
                token : "comment", // comment spanning whole line
                merge : true,
                regex : ".+"
            }
        ],
        "comment" : [
            {
                token : "comment", // closing comment
                regex : ".*?\\*\\/",
                merge : true,
                next : "start"
            }, {
                token : "comment", // comment spanning whole line
                merge : true,
                regex : ".+"
            }
        ],
        "qqstring" : [
            {
                token : "constant.language.escape",
                regex : escapedRe
            }, {
                token : "string",
                regex : '[^"\\\\]+',
                merge : true
            }, {
                token : "string",
                regex : "\\\\$",
                next  : "qqstring",
                merge : true
            }, {
                token : "string",
                regex : '"|$',
                next  : "start",
                merge : true
            }
        ],
        "qstring" : [
            {
                token : "constant.language.escape",
                regex : escapedRe
            }, {
                token : "string",
                regex : "[^'\\\\]+",
                merge : true
            }, {
                token : "string",
                regex : "\\\\$",
                next  : "qstring",
                merge : true
            }, {
                token : "string",
                regex : "'|$",
                next  : "start",
                merge : true
            }
        ]
    };

    this.embedRules(DocCommentHighlightRules, "doc-",
        [ DocCommentHighlightRules.getEndRule("start") ]);
}

JavaScriptHighlightRules.prototype = new TextHighlightRules()

function serialize(tokens) {
  return tokens.reduce(function(result, token) {
    return result + "<code class='" + token.type.split(".").join(" ") + "'>" +
           token.value.replace(/</g, "&lt;").replace(/>/, "&gt;") + "</code>"
  }, "")
}


function highlight(code) {
  var tokenizer = new Tokenizer(new JavaScriptHighlightRules().getRules())
  var lines = code.split("\n").map(function(line) {
    return serialize(tokenizer.getLineTokens(line).tokens)
  }).join("\n")
  return "<pre>" + lines + "</pre>"
}
exports.highlight = highlight;

})()
},{}],2:[function(require,module,exports){
var marked = require("marked")
var highlight = require("./highlighter").highlight

function readURI(uri, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", uri, true)
  xhr.onloadend = function() {
    callback(xhr.error, xhr.responseText)
  }
  xhr.onerror = function() {
    callback(xhr.error)
  }
  xhr.send()
}

function parseEnv() {
  return window.location.search.substr(1).split("&").reduce(function(env, part) {
    var pair = part.split("=")
    env[decodeURIComponent(pair.shift())] = decodeURIComponent(pair.shift())
    return env
  }, {})
}

function reflow() {
  var el = document.body.firstChild
  var style = el.style
  var i = 1000
  var top
  var left

  style.display  = "block"
  style.fontSize = i + "em"
  style.position = "absolute"
  style.padding = 0;
  style.margin = 0;

  while (1) {
    left = innerWidth - el.offsetWidth
    top  = innerHeight - el.offsetHeight

    if (top > 0 && left > 0) break

    style.fontSize = (i -= i * 0.05) + "em"
  }

  style.display = "block"
  style.top     = top / 2 + "px"
  style.left    = left / 2 + "px"
}


function makeSwitch(slides) {
  return function() {
    var body = document.body
    var id = location.hash.match(/\d+/)
    var source = slides[id] || slides[0]
    body.innerHTML = source
    reflow()
  }
}

function main() {
  var env = parseEnv();
  readURI(env.uri, function(error, content) {
    var slides = marked.lexer(content).map(function(node) {
      return node.type === "code" ? highlight(node.text) :
                           marked.parse(node.text.trim())
    });
    var render = makeSwitch(slides)
    window.onhashchange = render
    render()
  })
}

function swapSlide(diff) {
  var index = 0 | parseInt(location.hash.match(/\d+/)) + diff
  location.hash = index <= 0 ? 0 : index;
}

function keyNavigation(e) {
  if (e.which === 39) swapSlide(1)
  else if (e.which === 37) swapSlide(-1)
}

function touchNavigation(e) {
  if (e.target.href) return
  swapSlide(e.touches[0].pageX > innerWidth / 2 ? 1 : -1)
}

function fullscreen(e) {
  // Full screen shortcut ⌥ P
  if (e.altKey && e.which === 960) {
    if (document.body.requestFullScreen)
      document.body.requestFullScreen()
    else if (document.body.mozRequestFullScreen)
      document.body.mozRequestFullScreen()
    else if (document.body.webkitRequestFullScreen)
      document.body.webkitRequestFullScreen()
    location.hash = location.hash
  }
}

window.addEventListener("DOMContentLoaded", main);
document.onkeydown = keyNavigation
document.ontouchstart = touchNavigation
document.onkeypress = fullscreen
window.onresize = reflow

},{"./highlighter":1,"marked":3}],3:[function(require,module,exports){
(function(global){/**
 * marked - A markdown parser (https://github.com/chjj/marked)
 * Copyright (c) 2011-2012, Christopher Jeffrey. (MIT Licensed)
 */

;(function() {

/**
 * Block-Level Grammar
 */

var block = {
  newline: /^\n+/,
  code: /^( {4}[^\n]+\n*)+/,
  fences: noop,
  hr: /^( *[-*_]){3,} *(?:\n+|$)/,
  heading: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/,
  lheading: /^([^\n]+)\n *(=|-){3,} *\n*/,
  blockquote: /^( *>[^\n]+(\n[^\n]+)*\n*)+/,
  list: /^( *)(bull) [^\0]+?(?:hr|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
  html: /^ *(?:comment|closed|closing) *(?:\n{2,}|\s*$)/,
  def: /^ *\[([^\]]+)\]: *([^\s]+)(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,
  paragraph: /^([^\n]+\n?(?!body))+\n*/,
  text: /^[^\n]+/
};

block.bullet = /(?:[*+-]|\d+\.)/;
block.item = /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/;
block.item = replace(block.item, 'gm')
  (/bull/g, block.bullet)
  ();

block.list = replace(block.list)
  (/bull/g, block.bullet)
  ('hr', /\n+(?=(?: *[-*_]){3,} *(?:\n+|$))/)
  ();

block.html = replace(block.html)
  ('comment', /<!--[^\0]*?-->/)
  ('closed', /<(tag)[^\0]+?<\/\1>/)
  ('closing', /<tag(?!:\/|@)\b(?:"[^"]*"|'[^']*'|[^'">])*?>/)
  (/tag/g, tag())
  ();

block.paragraph = (function() {
  var paragraph = block.paragraph.source
    , body = [];

  (function push(rule) {
    rule = block[rule] ? block[rule].source : rule;
    body.push(rule.replace(/(^|[^\[])\^/g, '$1'));
    return push;
  })
  ('hr')
  ('heading')
  ('lheading')
  ('blockquote')
  ('<' + tag())
  ('def');

  return new
    RegExp(paragraph.replace('body', body.join('|')));
})();

block.normal = {
  fences: block.fences,
  paragraph: block.paragraph
};

block.gfm = {
  fences: /^ *``` *(\w+)? *\n([^\0]+?)\s*``` *(?:\n+|$)/,
  paragraph: /^/
};

block.gfm.paragraph = replace(block.paragraph)
  ('(?!', '(?!' + block.gfm.fences.source.replace(/(^|[^\[])\^/g, '$1') + '|')
  ();

/**
 * Block Lexer
 */

block.lexer = function(src) {
  var tokens = [];

  tokens.links = {};

  src = src
    .replace(/\r\n|\r/g, '\n')
    .replace(/\t/g, '    ');

  return block.token(src, tokens, true);
};

block.token = function(src, tokens, top) {
  var src = src.replace(/^ +$/gm, '')
    , next
    , loose
    , cap
    , item
    , space
    , i
    , l;

  while (src) {
    // newline
    if (cap = block.newline.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[0].length > 1) {
        tokens.push({
          type: 'space'
        });
      }
    }

    // code
    if (cap = block.code.exec(src)) {
      src = src.substring(cap[0].length);
      cap = cap[0].replace(/^ {4}/gm, '');
      tokens.push({
        type: 'code',
        text: !options.pedantic
          ? cap.replace(/\n+$/, '')
          : cap
      });
      continue;
    }

    // fences (gfm)
    if (cap = block.fences.exec(src)) {
      src = src.substring(cap[0].length);
      tokens.push({
        type: 'code',
        lang: cap[1],
        text: cap[2]
      });
      continue;
    }

    // heading
    if (cap = block.heading.exec(src)) {
      src = src.substring(cap[0].length);
      tokens.push({
        type: 'heading',
        depth: cap[1].length,
        text: cap[2]
      });
      continue;
    }

    // lheading
    if (cap = block.lheading.exec(src)) {
      src = src.substring(cap[0].length);
      tokens.push({
        type: 'heading',
        depth: cap[2] === '=' ? 1 : 2,
        text: cap[1]
      });
      continue;
    }

    // hr
    if (cap = block.hr.exec(src)) {
      src = src.substring(cap[0].length);
      tokens.push({
        type: 'hr'
      });
      continue;
    }

    // blockquote
    if (cap = block.blockquote.exec(src)) {
      src = src.substring(cap[0].length);

      tokens.push({
        type: 'blockquote_start'
      });

      cap = cap[0].replace(/^ *> ?/gm, '');

      // Pass `top` to keep the current
      // "toplevel" state. This is exactly
      // how markdown.pl works.
      block.token(cap, tokens, top);

      tokens.push({
        type: 'blockquote_end'
      });

      continue;
    }

    // list
    if (cap = block.list.exec(src)) {
      src = src.substring(cap[0].length);

      tokens.push({
        type: 'list_start',
        ordered: isFinite(cap[2])
      });

      // Get each top-level item.
      cap = cap[0].match(block.item);

      next = false;
      l = cap.length;
      i = 0;

      for (; i < l; i++) {
        item = cap[i];

        // Remove the list item's bullet
        // so it is seen as the next token.
        space = item.length;
        item = item.replace(/^ *([*+-]|\d+\.) +/, '');

        // Outdent whatever the
        // list item contains. Hacky.
        if (~item.indexOf('\n ')) {
          space -= item.length;
          item = !options.pedantic
            ? item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '')
            : item.replace(/^ {1,4}/gm, '');
        }

        // Determine whether item is loose or not.
        // Use: /(^|\n)(?! )[^\n]+\n\n(?!\s*$)/
        // for discount behavior.
        loose = next || /\n\n(?!\s*$)/.test(item);
        if (i !== l - 1) {
          next = item[item.length-1] === '\n';
          if (!loose) loose = next;
        }

        tokens.push({
          type: loose
            ? 'loose_item_start'
            : 'list_item_start'
        });

        // Recurse.
        block.token(item, tokens);

        tokens.push({
          type: 'list_item_end'
        });
      }

      tokens.push({
        type: 'list_end'
      });

      continue;
    }

    // html
    if (cap = block.html.exec(src)) {
      src = src.substring(cap[0].length);
      tokens.push({
        type: 'html',
        pre: cap[1] === 'pre',
        text: cap[0]
      });
      continue;
    }

    // def
    if (top && (cap = block.def.exec(src))) {
      src = src.substring(cap[0].length);
      tokens.links[cap[1].toLowerCase()] = {
        href: cap[2],
        title: cap[3]
      };
      continue;
    }

    // top-level paragraph
    if (top && (cap = block.paragraph.exec(src))) {
      src = src.substring(cap[0].length);
      tokens.push({
        type: 'paragraph',
        text: cap[0]
      });
      continue;
    }

    // text
    if (cap = block.text.exec(src)) {
      // Top-level should never reach here.
      src = src.substring(cap[0].length);
      tokens.push({
        type: 'text',
        text: cap[0]
      });
      continue;
    }
  }

  return tokens;
};

/**
 * Inline Processing
 */

var inline = {
  escape: /^\\([\\`*{}\[\]()#+\-.!_>])/,
  autolink: /^<([^ >]+(@|:\/)[^ >]+)>/,
  url: noop,
  tag: /^<!--[^\0]*?-->|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,
  link: /^!?\[(inside)\]\(href\)/,
  reflink: /^!?\[(inside)\]\s*\[([^\]]*)\]/,
  nolink: /^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,
  strong: /^__([^\0]+?)__(?!_)|^\*\*([^\0]+?)\*\*(?!\*)/,
  em: /^\b_((?:__|[^\0])+?)_\b|^\*((?:\*\*|[^\0])+?)\*(?!\*)/,
  code: /^(`+)([^\0]*?[^`])\1(?!`)/,
  br: /^ {2,}\n(?!\s*$)/,
  text: /^[^\0]+?(?=[\\<!\[_*`]| {2,}\n|$)/
};

inline._linkInside = /(?:\[[^\]]*\]|[^\]]|\](?=[^\[]*\]))*/;
inline._linkHref = /\s*<?([^\s]*?)>?(?:\s+['"]([^\0]*?)['"])?\s*/;

inline.link = replace(inline.link)
  ('inside', inline._linkInside)
  ('href', inline._linkHref)
  ();

inline.reflink = replace(inline.reflink)
  ('inside', inline._linkInside)
  ();

inline.normal = {
  url: inline.url,
  strong: inline.strong,
  em: inline.em,
  text: inline.text
};

inline.pedantic = {
  strong: /^__(?=\S)([^\0]*?\S)__(?!_)|^\*\*(?=\S)([^\0]*?\S)\*\*(?!\*)/,
  em: /^_(?=\S)([^\0]*?\S)_(?!_)|^\*(?=\S)([^\0]*?\S)\*(?!\*)/
};

inline.gfm = {
  url: /^(https?:\/\/[^\s]+[^.,:;"')\]\s])/,
  text: /^[^\0]+?(?=[\\<!\[_*`]|https?:\/\/| {2,}\n|$)/
};

/**
 * Inline Lexer
 */

inline.lexer = function(src) {
  var out = ''
    , links = tokens.links
    , link
    , text
    , href
    , cap;

  while (src) {
    // escape
    if (cap = inline.escape.exec(src)) {
      src = src.substring(cap[0].length);
      out += cap[1];
      continue;
    }

    // autolink
    if (cap = inline.autolink.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[2] === '@') {
        text = cap[1][6] === ':'
          ? mangle(cap[1].substring(7))
          : mangle(cap[1]);
        href = mangle('mailto:') + text;
      } else {
        text = escape(cap[1]);
        href = text;
      }
      out += '<a href="'
        + href
        + '">'
        + text
        + '</a>';
      continue;
    }

    // url (gfm)
    if (cap = inline.url.exec(src)) {
      src = src.substring(cap[0].length);
      text = escape(cap[1]);
      href = text;
      out += '<a href="'
        + href
        + '">'
        + text
        + '</a>';
      continue;
    }

    // tag
    if (cap = inline.tag.exec(src)) {
      src = src.substring(cap[0].length);
      out += options.sanitize
        ? escape(cap[0])
        : cap[0];
      continue;
    }

    // link
    if (cap = inline.link.exec(src)) {
      src = src.substring(cap[0].length);
      out += outputLink(cap, {
        href: cap[2],
        title: cap[3]
      });
      continue;
    }

    // reflink, nolink
    if ((cap = inline.reflink.exec(src))
        || (cap = inline.nolink.exec(src))) {
      src = src.substring(cap[0].length);
      link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
      link = links[link.toLowerCase()];
      if (!link || !link.href) {
        out += cap[0][0];
        src = cap[0].substring(1) + src;
        continue;
      }
      out += outputLink(cap, link);
      continue;
    }

    // strong
    if (cap = inline.strong.exec(src)) {
      src = src.substring(cap[0].length);
      out += '<strong>'
        + inline.lexer(cap[2] || cap[1])
        + '</strong>';
      continue;
    }

    // em
    if (cap = inline.em.exec(src)) {
      src = src.substring(cap[0].length);
      out += '<em>'
        + inline.lexer(cap[2] || cap[1])
        + '</em>';
      continue;
    }

    // code
    if (cap = inline.code.exec(src)) {
      src = src.substring(cap[0].length);
      out += '<code>'
        + escape(cap[2], true)
        + '</code>';
      continue;
    }

    // br
    if (cap = inline.br.exec(src)) {
      src = src.substring(cap[0].length);
      out += '<br>';
      continue;
    }

    // text
    if (cap = inline.text.exec(src)) {
      src = src.substring(cap[0].length);
      out += escape(cap[0]);
      continue;
    }
  }

  return out;
};

function outputLink(cap, link) {
  if (cap[0][0] !== '!') {
    return '<a href="'
      + escape(link.href)
      + '"'
      + (link.title
      ? ' title="'
      + escape(link.title)
      + '"'
      : '')
      + '>'
      + inline.lexer(cap[1])
      + '</a>';
  } else {
    return '<img src="'
      + escape(link.href)
      + '" alt="'
      + escape(cap[1])
      + '"'
      + (link.title
      ? ' title="'
      + escape(link.title)
      + '"'
      : '')
      + '>';
  }
}

/**
 * Parsing
 */

var tokens
  , token;

function next() {
  return token = tokens.pop();
}

function tok() {
  switch (token.type) {
    case 'space': {
      return '';
    }
    case 'hr': {
      return '<hr>\n';
    }
    case 'heading': {
      return '<h'
        + token.depth
        + '>'
        + inline.lexer(token.text)
        + '</h'
        + token.depth
        + '>\n';
    }
    case 'code': {
      if (options.highlight) {
        token.code = options.highlight(token.text, token.lang);
        if (token.code != null && token.code !== token.text) {
          token.escaped = true;
          token.text = token.code;
        }
      }

      if (!token.escaped) {
        token.text = escape(token.text, true);
      }

      return '<pre><code'
        + (token.lang
        ? ' class="lang-'
        + token.lang
        + '"'
        : '')
        + '>'
        + token.text
        + '</code></pre>\n';
    }
    case 'blockquote_start': {
      var body = '';

      while (next().type !== 'blockquote_end') {
        body += tok();
      }

      return '<blockquote>\n'
        + body
        + '</blockquote>\n';
    }
    case 'list_start': {
      var type = token.ordered ? 'ol' : 'ul'
        , body = '';

      while (next().type !== 'list_end') {
        body += tok();
      }

      return '<'
        + type
        + '>\n'
        + body
        + '</'
        + type
        + '>\n';
    }
    case 'list_item_start': {
      var body = '';

      while (next().type !== 'list_item_end') {
        body += token.type === 'text'
          ? parseText()
          : tok();
      }

      return '<li>'
        + body
        + '</li>\n';
    }
    case 'loose_item_start': {
      var body = '';

      while (next().type !== 'list_item_end') {
        body += tok();
      }

      return '<li>'
        + body
        + '</li>\n';
    }
    case 'html': {
      if (options.sanitize) {
        return inline.lexer(token.text);
      }
      return !token.pre && !options.pedantic
        ? inline.lexer(token.text)
        : token.text;
    }
    case 'paragraph': {
      return '<p>'
        + inline.lexer(token.text)
        + '</p>\n';
    }
    case 'text': {
      return '<p>'
        + parseText()
        + '</p>\n';
    }
  }
}

function parseText() {
  var body = token.text
    , top;

  while ((top = tokens[tokens.length-1])
         && top.type === 'text') {
    body += '\n' + next().text;
  }

  return inline.lexer(body);
}

function parse(src) {
  tokens = src.reverse();

  var out = '';
  while (next()) {
    out += tok();
  }

  tokens = null;
  token = null;

  return out;
}

/**
 * Helpers
 */

function escape(html, encode) {
  return html
    .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function mangle(text) {
  var out = ''
    , l = text.length
    , i = 0
    , ch;

  for (; i < l; i++) {
    ch = text.charCodeAt(i);
    if (Math.random() > 0.5) {
      ch = 'x' + ch.toString(16);
    }
    out += '&#' + ch + ';';
  }

  return out;
}

function tag() {
  var tag = '(?!(?:'
    + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code'
    + '|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo'
    + '|span|br|wbr|ins|del|img)\\b)\\w+';

  return tag;
}

function replace(regex, opt) {
  regex = regex.source;
  opt = opt || '';
  return function self(name, val) {
    if (!name) return new RegExp(regex, opt);
    regex = regex.replace(name, val.source || val);
    return self;
  };
}

function noop() {}
noop.exec = noop;

/**
 * Marked
 */

function marked(src, opt) {
  setOptions(opt);
  return parse(block.lexer(src));
}

/**
 * Options
 */

var options
  , defaults;

function setOptions(opt) {
  if (!opt) opt = defaults;
  if (options === opt) return;
  options = opt;

  if (options.gfm) {
    block.fences = block.gfm.fences;
    block.paragraph = block.gfm.paragraph;
    inline.text = inline.gfm.text;
    inline.url = inline.gfm.url;
  } else {
    block.fences = block.normal.fences;
    block.paragraph = block.normal.paragraph;
    inline.text = inline.normal.text;
    inline.url = inline.normal.url;
  }

  if (options.pedantic) {
    inline.em = inline.pedantic.em;
    inline.strong = inline.pedantic.strong;
  } else {
    inline.em = inline.normal.em;
    inline.strong = inline.normal.strong;
  }
}

marked.options =
marked.setOptions = function(opt) {
  defaults = opt;
  setOptions(opt);
  return marked;
};

marked.setOptions({
  gfm: true,
  pedantic: false,
  sanitize: false,
  highlight: null
});

/**
 * Expose
 */

marked.parser = function(src, opt) {
  setOptions(opt);
  return parse(src);
};

marked.lexer = function(src, opt) {
  setOptions(opt);
  return block.lexer(src);
};

marked.parse = marked;

if (typeof module !== 'undefined') {
  module.exports = marked;
} else {
  this.marked = marked;
}

}).call(function() {
  return this || (typeof window !== 'undefined' ? window : global);
}());

})(window)
},{}]},{},[2])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvZ296YWxhL1Byb2plY3RzL3dlZW5vdGUvc3JjL2hpZ2hsaWdodGVyLmpzIiwiL1VzZXJzL2dvemFsYS9Qcm9qZWN0cy93ZWVub3RlL3NyYy93ZWVub3RlLmpzIiwiL1VzZXJzL2dvemFsYS9Qcm9qZWN0cy93ZWVub3RlL25vZGVfbW9kdWxlcy9tYXJrZWQvbGliL21hcmtlZC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5cEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXt2YXIgbGFuZyA9IHtcbiAgZGVlcENvcHk6IGZ1bmN0aW9uIChvYmopIHtcbiAgICBpZiAodHlwZW9mIG9iaiAhPSBcIm9iamVjdFwiKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuXG4gICAgdmFyIGNvcHkgPSBvYmouY29uc3RydWN0b3IoKTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygb2JqW2tleV0gPT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgY29weVtrZXldID0gdGhpcy5kZWVwQ29weShvYmpba2V5XSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb3B5W2tleV0gPSBvYmpba2V5XTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY29weTtcbiAgfVxufVxuXG5cbi8vID0+XG5cblxudmFyIFRva2VuaXplciA9IGZ1bmN0aW9uKHJ1bGVzLCBmbGFnKSB7XG4gICAgZmxhZyA9IGZsYWcgPyBcImdcIiArIGZsYWcgOiBcImdcIjtcbiAgICB0aGlzLnJ1bGVzID0gcnVsZXM7XG5cbiAgICB0aGlzLnJlZ0V4cHMgPSB7fTtcbiAgICB0aGlzLm1hdGNoTWFwcGluZ3MgPSB7fTtcbiAgICBmb3IgKCB2YXIga2V5IGluIHRoaXMucnVsZXMpIHtcbiAgICAgICAgdmFyIHJ1bGUgPSB0aGlzLnJ1bGVzW2tleV07XG4gICAgICAgIHZhciBzdGF0ZSA9IHJ1bGU7XG4gICAgICAgIHZhciBydWxlUmVnRXhwcyA9IFtdO1xuICAgICAgICB2YXIgbWF0Y2hUb3RhbCA9IDA7XG4gICAgICAgIHZhciBtYXBwaW5nID0gdGhpcy5tYXRjaE1hcHBpbmdzW2tleV0gPSB7fTtcblxuICAgICAgICBmb3IgKCB2YXIgaSA9IDA7IGkgPCBzdGF0ZS5sZW5ndGg7IGkrKykge1xuXG4gICAgICAgICAgICBpZiAoc3RhdGVbaV0ucmVnZXggaW5zdGFuY2VvZiBSZWdFeHApXG4gICAgICAgICAgICAgICAgc3RhdGVbaV0ucmVnZXggPSBzdGF0ZVtpXS5yZWdleC50b1N0cmluZygpLnNsaWNlKDEsIC0xKTtcblxuICAgICAgICAgICAgLy8gQ291bnQgbnVtYmVyIG9mIG1hdGNoaW5nIGdyb3Vwcy4gMiBleHRyYSBncm91cHMgZnJvbSB0aGUgZnVsbCBtYXRjaFxuICAgICAgICAgICAgLy8gQW5kIHRoZSBjYXRjaC1hbGwgb24gdGhlIGVuZCAodXNlZCB0byBmb3JjZSBhIG1hdGNoKTtcbiAgICAgICAgICAgIHZhciBtYXRjaGNvdW50ID0gbmV3IFJlZ0V4cChcIig/OihcIiArIHN0YXRlW2ldLnJlZ2V4ICsgXCIpfCguKSlcIikuZXhlYyhcImFcIikubGVuZ3RoIC0gMjtcblxuICAgICAgICAgICAgLy8gUmVwbGFjZSBhbnkgYmFja3JlZmVyZW5jZXMgYW5kIG9mZnNldCBhcHByb3ByaWF0ZWx5LlxuICAgICAgICAgICAgdmFyIGFkanVzdGVkcmVnZXggPSBzdGF0ZVtpXS5yZWdleC5yZXBsYWNlKC9cXFxcKFswLTldKykvZywgZnVuY3Rpb24gKG1hdGNoLCBkaWdpdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBcIlxcXFxcIiArIChwYXJzZUludChkaWdpdCwgMTApICsgbWF0Y2hUb3RhbCArIDEpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmIChtYXRjaGNvdW50ID4gMSAmJiBzdGF0ZVtpXS50b2tlbi5sZW5ndGggIT09IG1hdGNoY291bnQtMSlcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGb3IgXCIgKyBzdGF0ZVtpXS5yZWdleCArIFwiIHRoZSBtYXRjaGluZyBncm91cHMgKFwiICsobWF0Y2hjb3VudC0xKSArIFwiKSBhbmQgbGVuZ3RoIG9mIHRoZSB0b2tlbiBhcnJheSAoXCIgKyBzdGF0ZVtpXS50b2tlbi5sZW5ndGggKyBcIikgZG9uJ3QgbWF0Y2ggKHJ1bGUgI1wiICsgaSArIFwiIG9mIHN0YXRlIFwiICsga2V5ICsgXCIpXCIpO1xuXG4gICAgICAgICAgICBtYXBwaW5nW21hdGNoVG90YWxdID0ge1xuICAgICAgICAgICAgICAgIHJ1bGU6IGksXG4gICAgICAgICAgICAgICAgbGVuOiBtYXRjaGNvdW50XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgbWF0Y2hUb3RhbCArPSBtYXRjaGNvdW50O1xuXG4gICAgICAgICAgICBydWxlUmVnRXhwcy5wdXNoKGFkanVzdGVkcmVnZXgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5yZWdFeHBzW2tleV0gPSBuZXcgUmVnRXhwKFwiKD86KFwiICsgcnVsZVJlZ0V4cHMuam9pbihcIil8KFwiKSArIFwiKXwoLikpXCIsIGZsYWcpO1xuICAgIH1cbn07XG5cbihmdW5jdGlvbigpIHtcblxuICAgIC8qKlxuICAgICogVG9rZW5pemVyLmdldExpbmVUb2tlbnMoKSAtPiBPYmplY3RcbiAgICAqXG4gICAgKiBSZXR1cm5zIGFuIG9iamVjdCBjb250YWluaW5nIHR3byBwcm9wZXJ0aWVzOiBgdG9rZW5zYCwgd2hpY2ggY29udGFpbnMgYWxsIHRoZSB0b2tlbnM7IGFuZCBgc3RhdGVgLCB0aGUgY3VycmVudCBzdGF0ZS5cbiAgICAqKi9cbiAgICB0aGlzLmdldExpbmVUb2tlbnMgPSBmdW5jdGlvbihsaW5lLCBzdGFydFN0YXRlKSB7XG4gICAgICAgIHZhciBjdXJyZW50U3RhdGUgPSBzdGFydFN0YXRlIHx8IFwic3RhcnRcIjtcbiAgICAgICAgdmFyIHN0YXRlID0gdGhpcy5ydWxlc1tjdXJyZW50U3RhdGVdO1xuICAgICAgICB2YXIgbWFwcGluZyA9IHRoaXMubWF0Y2hNYXBwaW5nc1tjdXJyZW50U3RhdGVdO1xuICAgICAgICB2YXIgcmUgPSB0aGlzLnJlZ0V4cHNbY3VycmVudFN0YXRlXTtcbiAgICAgICAgcmUubGFzdEluZGV4ID0gMDtcblxuICAgICAgICB2YXIgbWF0Y2gsIHRva2VucyA9IFtdO1xuXG4gICAgICAgIHZhciBsYXN0SW5kZXggPSAwO1xuXG4gICAgICAgIHZhciB0b2tlbiA9IHtcbiAgICAgICAgICAgIHR5cGU6IG51bGwsXG4gICAgICAgICAgICB2YWx1ZTogXCJcIlxuICAgICAgICB9O1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCA9IHJlLmV4ZWMobGluZSkpIHtcbiAgICAgICAgICAgIHZhciB0eXBlID0gXCJ0ZXh0XCI7XG4gICAgICAgICAgICB2YXIgcnVsZSA9IG51bGw7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBbbWF0Y2hbMF1dO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1hdGNoLmxlbmd0aC0yOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2hbaSArIDFdID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICAgICAgcnVsZSA9IHN0YXRlW21hcHBpbmdbaV0ucnVsZV07XG5cbiAgICAgICAgICAgICAgICBpZiAobWFwcGluZ1tpXS5sZW4gPiAxKVxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IG1hdGNoLnNsaWNlKGkrMiwgaSsxK21hcHBpbmdbaV0ubGVuKTtcblxuICAgICAgICAgICAgICAgIC8vIGNvbXB1dGUgdG9rZW4gdHlwZVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcnVsZS50b2tlbiA9PSBcImZ1bmN0aW9uXCIpXG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPSBydWxlLnRva2VuLmFwcGx5KHRoaXMsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPSBydWxlLnRva2VuO1xuXG4gICAgICAgICAgICAgICAgaWYgKHJ1bGUubmV4dCkge1xuICAgICAgICAgICAgICAgICAgICBjdXJyZW50U3RhdGUgPSBydWxlLm5leHQ7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlID0gdGhpcy5ydWxlc1tjdXJyZW50U3RhdGVdO1xuICAgICAgICAgICAgICAgICAgICBtYXBwaW5nID0gdGhpcy5tYXRjaE1hcHBpbmdzW2N1cnJlbnRTdGF0ZV07XG4gICAgICAgICAgICAgICAgICAgIGxhc3RJbmRleCA9IHJlLmxhc3RJbmRleDtcblxuICAgICAgICAgICAgICAgICAgICByZSA9IHRoaXMucmVnRXhwc1tjdXJyZW50U3RhdGVdO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiWW91IGluZGljYXRlZCBhIHN0YXRlIG9mIFwiICsgcnVsZS5uZXh0ICsgXCIgdG8gZ28gdG8sIGJ1dCBpdCBkb2Vzbid0IGV4aXN0IVwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJlLmxhc3RJbmRleCA9IGxhc3RJbmRleDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh2YWx1ZVswXSkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdHlwZSA9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gW3ZhbHVlLmpvaW4oXCJcIildO1xuICAgICAgICAgICAgICAgICAgICB0eXBlID0gW3R5cGVdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZhbHVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdmFsdWVbaV0pXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoKCFydWxlIHx8IHJ1bGUubWVyZ2UgfHwgdHlwZVtpXSA9PT0gXCJ0ZXh0XCIpICYmIHRva2VuLnR5cGUgPT09IHR5cGVbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRva2VuLnZhbHVlICs9IHZhbHVlW2ldO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRva2VuLnR5cGUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9rZW5zLnB1c2godG9rZW4pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB0b2tlbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiB0eXBlW2ldLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZVtpXVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGxhc3RJbmRleCA9PSBsaW5lLmxlbmd0aClcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgbGFzdEluZGV4ID0gcmUubGFzdEluZGV4O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUpXG4gICAgICAgICAgICB0b2tlbnMucHVzaCh0b2tlbik7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRva2VucyA6IHRva2VucyxcbiAgICAgICAgICAgIHN0YXRlIDogY3VycmVudFN0YXRlXG4gICAgICAgIH07XG4gICAgfTtcblxufSkuY2FsbChUb2tlbml6ZXIucHJvdG90eXBlKTtcblxuXG4vLyA9PlxuXG5cbmZ1bmN0aW9uIFRleHRIaWdobGlnaHRSdWxlcygpIHtcblxuICAgIC8vIHJlZ2V4cCBtdXN0IG5vdCBoYXZlIGNhcHR1cmluZyBwYXJlbnRoZXNlc1xuICAgIC8vIHJlZ2V4cHMgYXJlIG9yZGVyZWQgLT4gdGhlIGZpcnN0IG1hdGNoIGlzIHVzZWRcblxuICAgIHRoaXMuJHJ1bGVzID0ge1xuICAgICAgICBcInN0YXJ0XCIgOiBbe1xuICAgICAgICAgICAgdG9rZW4gOiBcImVtcHR5X2xpbmVcIixcbiAgICAgICAgICAgIHJlZ2V4IDogJ14kJ1xuICAgICAgICB9LCB7XG4gICAgICAgICAgICB0b2tlbiA6IFwidGV4dFwiLFxuICAgICAgICAgICAgcmVnZXggOiBcIi4rXCJcbiAgICAgICAgfV1cbiAgICB9O1xufVxuXG5cbi8vID0+XG5cbihmdW5jdGlvbigpIHtcblxuICAgIHRoaXMuYWRkUnVsZXMgPSBmdW5jdGlvbihydWxlcywgcHJlZml4KSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBydWxlcykge1xuICAgICAgICAgICAgdmFyIHN0YXRlID0gcnVsZXNba2V5XTtcbiAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxzdGF0ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBydWxlID0gc3RhdGVbaV07XG4gICAgICAgICAgICAgICAgaWYgKHJ1bGUubmV4dCkge1xuICAgICAgICAgICAgICAgICAgICBydWxlLm5leHQgPSBwcmVmaXggKyBydWxlLm5leHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy4kcnVsZXNbcHJlZml4ICsga2V5XSA9IHN0YXRlO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0UnVsZXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuJHJ1bGVzO1xuICAgIH07XG5cbiAgICB0aGlzLmVtYmVkUnVsZXMgPSBmdW5jdGlvbiAoSGlnaGxpZ2h0UnVsZXMsIHByZWZpeCwgZXNjYXBlUnVsZXMsIHN0YXRlcywgYXBwZW5kKSB7XG4gICAgICAgIHZhciBlbWJlZFJ1bGVzID0gbmV3IEhpZ2hsaWdodFJ1bGVzKCkuZ2V0UnVsZXMoKTtcbiAgICAgICAgaWYgKHN0YXRlcykge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdGF0ZXMubGVuZ3RoOyBpKyspXG4gICAgICAgICAgICAgICAgc3RhdGVzW2ldID0gcHJlZml4ICsgc3RhdGVzW2ldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3RhdGVzID0gW107XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gZW1iZWRSdWxlcylcbiAgICAgICAgICAgICAgICBzdGF0ZXMucHVzaChwcmVmaXggKyBrZXkpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5hZGRSdWxlcyhlbWJlZFJ1bGVzLCBwcmVmaXgpO1xuXG4gICAgICAgIHZhciBhZGRSdWxlcyA9IEFycmF5LnByb3RvdHlwZVthcHBlbmQgPyBcInB1c2hcIiA6IFwidW5zaGlmdFwiXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdGF0ZXMubGVuZ3RoOyBpKyspXG4gICAgICAgICAgICBhZGRSdWxlcy5hcHBseSh0aGlzLiRydWxlc1tzdGF0ZXNbaV1dLCBsYW5nLmRlZXBDb3B5KGVzY2FwZVJ1bGVzKSk7XG5cbiAgICAgICAgaWYgKCF0aGlzLiRlbWJlZHMpXG4gICAgICAgICAgICB0aGlzLiRlbWJlZHMgPSBbXTtcbiAgICAgICAgdGhpcy4kZW1iZWRzLnB1c2gocHJlZml4KTtcbiAgICB9XG5cbiAgICB0aGlzLmdldEVtYmVkcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy4kZW1iZWRzO1xuICAgIH1cblxuICAgIHRoaXMuY3JlYXRlS2V5d29yZE1hcHBlciA9IGZ1bmN0aW9uKG1hcCwgZGVmYXVsdFRva2VuLCBpZ25vcmVDYXNlLCBzcGxpdENoYXIpIHtcbiAgICAgICAgdmFyIGtleXdvcmRzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgICAgT2JqZWN0LmtleXMobWFwKS5mb3JFYWNoKGZ1bmN0aW9uKGNsYXNzTmFtZSkge1xuICAgICAgICAgICAgdmFyIGxpc3QgPSBtYXBbY2xhc3NOYW1lXS5zcGxpdChzcGxpdENoYXIgfHwgXCJ8XCIpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IGxpc3QubGVuZ3RoOyBpLS07IClcbiAgICAgICAgICAgICAgICBrZXl3b3Jkc1tsaXN0W2ldXSA9IGNsYXNzTmFtZTtcbiAgICAgICAgfSk7XG4gICAgICAgIG1hcCA9IG51bGw7XG4gICAgICAgIHJldHVybiBpZ25vcmVDYXNlXG4gICAgICAgICAgICA/IGZ1bmN0aW9uKHZhbHVlKSB7cmV0dXJuIGtleXdvcmRzW3ZhbHVlLnRvTG93ZXJDYXNlKCldIHx8IGRlZmF1bHRUb2tlbiB9XG4gICAgICAgICAgICA6IGZ1bmN0aW9uKHZhbHVlKSB7cmV0dXJuIGtleXdvcmRzW3ZhbHVlXSB8fCBkZWZhdWx0VG9rZW4gfTtcbiAgICB9XG5cbn0pLmNhbGwoVGV4dEhpZ2hsaWdodFJ1bGVzLnByb3RvdHlwZSk7XG5cbi8vID0+XG5cblxuXG52YXIgRG9jQ29tbWVudEhpZ2hsaWdodFJ1bGVzID0gZnVuY3Rpb24oKSB7XG5cbiAgICB0aGlzLiRydWxlcyA9IHtcbiAgICAgICAgXCJzdGFydFwiIDogWyB7XG4gICAgICAgICAgICB0b2tlbiA6IFwiY29tbWVudC5kb2MudGFnXCIsXG4gICAgICAgICAgICByZWdleCA6IFwiQFtcXFxcd1xcXFxkX10rXCIgLy8gVE9ETzogZml4IGVtYWlsIGFkZHJlc3Nlc1xuICAgICAgICB9LCB7XG4gICAgICAgICAgICB0b2tlbiA6IFwiY29tbWVudC5kb2NcIixcbiAgICAgICAgICAgIG1lcmdlIDogdHJ1ZSxcbiAgICAgICAgICAgIHJlZ2V4IDogXCJcXFxccytcIlxuICAgICAgICB9LCB7XG4gICAgICAgICAgICB0b2tlbiA6IFwiY29tbWVudC5kb2NcIixcbiAgICAgICAgICAgIG1lcmdlIDogdHJ1ZSxcbiAgICAgICAgICAgIHJlZ2V4IDogXCJUT0RPXCJcbiAgICAgICAgfSwge1xuICAgICAgICAgICAgdG9rZW4gOiBcImNvbW1lbnQuZG9jXCIsXG4gICAgICAgICAgICBtZXJnZSA6IHRydWUsXG4gICAgICAgICAgICByZWdleCA6IFwiW15AXFxcXCpdK1wiXG4gICAgICAgIH0sIHtcbiAgICAgICAgICAgIHRva2VuIDogXCJjb21tZW50LmRvY1wiLFxuICAgICAgICAgICAgbWVyZ2UgOiB0cnVlLFxuICAgICAgICAgICAgcmVnZXggOiBcIi5cIlxuICAgICAgICB9XVxuICAgIH07XG59O1xuXG5Eb2NDb21tZW50SGlnaGxpZ2h0UnVsZXMucHJvdG90eXBlID0gbmV3IFRleHRIaWdobGlnaHRSdWxlc1xuXG5Eb2NDb21tZW50SGlnaGxpZ2h0UnVsZXMuZ2V0U3RhcnRSdWxlID0gZnVuY3Rpb24oc3RhcnQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICB0b2tlbiA6IFwiY29tbWVudC5kb2NcIiwgLy8gZG9jIGNvbW1lbnRcbiAgICAgICAgbWVyZ2UgOiB0cnVlLFxuICAgICAgICByZWdleCA6IFwiXFxcXC9cXFxcKig/PVxcXFwqKVwiLFxuICAgICAgICBuZXh0ICA6IHN0YXJ0XG4gICAgfTtcbn07XG5cbkRvY0NvbW1lbnRIaWdobGlnaHRSdWxlcy5nZXRFbmRSdWxlID0gZnVuY3Rpb24gKHN0YXJ0KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdG9rZW4gOiBcImNvbW1lbnQuZG9jXCIsIC8vIGNsb3NpbmcgY29tbWVudFxuICAgICAgICBtZXJnZSA6IHRydWUsXG4gICAgICAgIHJlZ2V4IDogXCJcXFxcKlxcXFwvXCIsXG4gICAgICAgIG5leHQgIDogc3RhcnRcbiAgICB9O1xufVxuXG5cbi8vID0+XG5cblxuXG52YXIgSmF2YVNjcmlwdEhpZ2hsaWdodFJ1bGVzID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gc2VlOiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0c1xuICAgIHZhciBrZXl3b3JkTWFwcGVyID0gdGhpcy5jcmVhdGVLZXl3b3JkTWFwcGVyKHtcbiAgICAgICAgXCJ2YXJpYWJsZS5sYW5ndWFnZVwiOlxuICAgICAgICAgICAgXCJBcnJheXxCb29sZWFufERhdGV8RnVuY3Rpb258SXRlcmF0b3J8TnVtYmVyfE9iamVjdHxSZWdFeHB8U3RyaW5nfFByb3h5fFwiICArIC8vIENvbnN0cnVjdG9yc1xuICAgICAgICAgICAgXCJOYW1lc3BhY2V8UU5hbWV8WE1MfFhNTExpc3R8XCIgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICArIC8vIEU0WFxuICAgICAgICAgICAgXCJBcnJheUJ1ZmZlcnxGbG9hdDMyQXJyYXl8RmxvYXQ2NEFycmF5fEludDE2QXJyYXl8SW50MzJBcnJheXxJbnQ4QXJyYXl8XCIgICArXG4gICAgICAgICAgICBcIlVpbnQxNkFycmF5fFVpbnQzMkFycmF5fFVpbnQ4QXJyYXl8VWludDhDbGFtcGVkQXJyYXl8XCIgICAgICAgICAgICAgICAgICAgICtcbiAgICAgICAgICAgIFwiRXJyb3J8RXZhbEVycm9yfEludGVybmFsRXJyb3J8UmFuZ2VFcnJvcnxSZWZlcmVuY2VFcnJvcnxTdG9wSXRlcmF0aW9ufFwiICAgKyAvLyBFcnJvcnNcbiAgICAgICAgICAgIFwiU3ludGF4RXJyb3J8VHlwZUVycm9yfFVSSUVycm9yfFwiICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgK1xuICAgICAgICAgICAgXCJkZWNvZGVVUkl8ZGVjb2RlVVJJQ29tcG9uZW50fGVuY29kZVVSSXxlbmNvZGVVUklDb21wb25lbnR8ZXZhbHxpc0Zpbml0ZXxcIiArIC8vIE5vbi1jb25zdHJ1Y3RvciBmdW5jdGlvbnNcbiAgICAgICAgICAgIFwiaXNOYU58cGFyc2VGbG9hdHxwYXJzZUludHxcIiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgK1xuICAgICAgICAgICAgXCJKU09OfE1hdGh8XCIgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICArIC8vIE90aGVyXG4gICAgICAgICAgICBcInRoaXN8YXJndW1lbnRzfHByb3RvdHlwZXx3aW5kb3d8ZG9jdW1lbnRcIiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICwgLy8gUHNldWRvXG4gICAgICAgIFwia2V5d29yZFwiOlxuICAgICAgICAgICAgXCJjb25zdHx5aWVsZHxpbXBvcnR8Z2V0fHNldHxcIiArXG4gICAgICAgICAgICBcImJyZWFrfGNhc2V8Y2F0Y2h8Y29udGludWV8ZGVmYXVsdHxkZWxldGV8ZG98ZWxzZXxmaW5hbGx5fGZvcnxmdW5jdGlvbnxcIiArXG4gICAgICAgICAgICBcImlmfGlufGluc3RhbmNlb2Z8bmV3fHJldHVybnxzd2l0Y2h8dGhyb3d8dHJ5fHR5cGVvZnxsZXR8dmFyfHdoaWxlfHdpdGh8ZGVidWdnZXJ8XCIgK1xuICAgICAgICAgICAgLy8gaW52YWxpZCBvciByZXNlcnZlZFxuICAgICAgICAgICAgXCJfX3BhcmVudF9ffF9fY291bnRfX3xlc2NhcGV8dW5lc2NhcGV8d2l0aHxfX3Byb3RvX198XCIgK1xuICAgICAgICAgICAgXCJjbGFzc3xlbnVtfGV4dGVuZHN8c3VwZXJ8ZXhwb3J0fGltcGxlbWVudHN8cHJpdmF0ZXxwdWJsaWN8aW50ZXJmYWNlfHBhY2thZ2V8cHJvdGVjdGVkfHN0YXRpY1wiLFxuICAgICAgICBcInN0b3JhZ2UudHlwZVwiOlxuICAgICAgICAgICAgXCJjb25zdHxsZXR8dmFyfGZ1bmN0aW9uXCIsXG4gICAgICAgIFwiY29uc3RhbnQubGFuZ3VhZ2VcIjpcbiAgICAgICAgICAgIFwibnVsbHxJbmZpbml0eXxOYU58dW5kZWZpbmVkXCIsXG4gICAgICAgIFwic3VwcG9ydC5mdW5jdGlvblwiOlxuICAgICAgICAgICAgXCJhbGVydFwiXG4gICAgfSwgXCJpZGVudGlmaWVyXCIpO1xuXG4gICAgLy8ga2V5d29yZHMgd2hpY2ggY2FuIGJlIGZvbGxvd2VkIGJ5IHJlZ3VsYXIgZXhwcmVzc2lvbnNcbiAgICB2YXIga3dCZWZvcmVSZSA9IFwiY2FzZXxkb3xlbHNlfGZpbmFsbHl8aW58aW5zdGFuY2VvZnxyZXR1cm58dGhyb3d8dHJ5fHR5cGVvZnx5aWVsZFwiO1xuXG4gICAgLy8gVE9ETzogVW5pY29kZSBlc2NhcGUgc2VxdWVuY2VzXG4gICAgdmFyIGlkZW50aWZpZXJSZSA9IFwiW2EtekEtWlxcXFwkX1xcdTAwYTEtXFx1ZmZmZl1bYS16QS1aXFxcXGRcXFxcJF9cXHUwMGExLVxcdWZmZmZdKlxcXFxiXCI7XG5cbiAgICB2YXIgZXNjYXBlZFJlID0gXCJcXFxcXFxcXCg/OnhbMC05YS1mQS1GXXsyfXxcIiArIC8vIGhleFxuICAgICAgICBcInVbMC05YS1mQS1GXXs0fXxcIiArIC8vIHVuaWNvZGVcbiAgICAgICAgXCJbMC0yXVswLTddezAsMn18XCIgKyAvLyBvY3RcbiAgICAgICAgXCIzWzAtNl1bMC03XT98XCIgKyAvLyBvY3RcbiAgICAgICAgXCIzN1swLTddP3xcIiArIC8vIG9jdFxuICAgICAgICBcIls0LTddWzAtN10/fFwiICsgLy9vY3RcbiAgICAgICAgXCIuKVwiO1xuXG4gICAgLy8gcmVnZXhwIG11c3Qgbm90IGhhdmUgY2FwdHVyaW5nIHBhcmVudGhlc2VzLiBVc2UgKD86KSBpbnN0ZWFkLlxuICAgIC8vIHJlZ2V4cHMgYXJlIG9yZGVyZWQgLT4gdGhlIGZpcnN0IG1hdGNoIGlzIHVzZWRcblxuICAgIHRoaXMuJHJ1bGVzID0ge1xuICAgICAgICBcInN0YXJ0XCIgOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdG9rZW4gOiBcImNvbW1lbnRcIixcbiAgICAgICAgICAgICAgICByZWdleCA6IC9cXC9cXC8uKiQvXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgRG9jQ29tbWVudEhpZ2hsaWdodFJ1bGVzLmdldFN0YXJ0UnVsZShcImRvYy1zdGFydFwiKSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0b2tlbiA6IFwiY29tbWVudFwiLCAvLyBtdWx0aSBsaW5lIGNvbW1lbnRcbiAgICAgICAgICAgICAgICBtZXJnZSA6IHRydWUsXG4gICAgICAgICAgICAgICAgcmVnZXggOiAvXFwvXFwqLyxcbiAgICAgICAgICAgICAgICBuZXh0IDogXCJjb21tZW50XCJcbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICB0b2tlbiA6IFwic3RyaW5nXCIsXG4gICAgICAgICAgICAgICAgcmVnZXggOiBcIicoPz0uKVwiLFxuICAgICAgICAgICAgICAgIG5leHQgIDogXCJxc3RyaW5nXCJcbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICB0b2tlbiA6IFwic3RyaW5nXCIsXG4gICAgICAgICAgICAgICAgcmVnZXggOiAnXCIoPz0uKScsXG4gICAgICAgICAgICAgICAgbmV4dCAgOiBcInFxc3RyaW5nXCJcbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICB0b2tlbiA6IFwiY29uc3RhbnQubnVtZXJpY1wiLCAvLyBoZXhcbiAgICAgICAgICAgICAgICByZWdleCA6IC8wW3hYXVswLTlhLWZBLUZdK1xcYi9cbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICB0b2tlbiA6IFwiY29uc3RhbnQubnVtZXJpY1wiLCAvLyBmbG9hdFxuICAgICAgICAgICAgICAgIHJlZ2V4IDogL1srLV0/XFxkKyg/Oig/OlxcLlxcZCopPyg/OltlRV1bKy1dP1xcZCspPyk/XFxiL1xuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgIC8vIFNvdW5kLnByb3RvdHlwZS5wbGF5ID1cbiAgICAgICAgICAgICAgICB0b2tlbiA6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJzdG9yYWdlLnR5cGVcIiwgXCJwdW5jdHVhdGlvbi5vcGVyYXRvclwiLCBcInN1cHBvcnQuZnVuY3Rpb25cIixcbiAgICAgICAgICAgICAgICAgICAgXCJwdW5jdHVhdGlvbi5vcGVyYXRvclwiLCBcImVudGl0eS5uYW1lLmZ1bmN0aW9uXCIsIFwidGV4dFwiLFwia2V5d29yZC5vcGVyYXRvclwiXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICByZWdleCA6IFwiKFwiICsgaWRlbnRpZmllclJlICsgXCIpKFxcXFwuKShwcm90b3R5cGUpKFxcXFwuKShcIiArIGlkZW50aWZpZXJSZSArXCIpKFxcXFxzKikoPSlcIixcbiAgICAgICAgICAgICAgICBuZXh0OiBcImZ1bmN0aW9uX2FyZ3VtZW50c1wiXG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAgLy8gU291bmQucGxheSA9IGZ1bmN0aW9uKCkgeyAgfVxuICAgICAgICAgICAgICAgIHRva2VuIDogW1xuICAgICAgICAgICAgICAgICAgICBcInN0b3JhZ2UudHlwZVwiLCBcInB1bmN0dWF0aW9uLm9wZXJhdG9yXCIsIFwiZW50aXR5Lm5hbWUuZnVuY3Rpb25cIiwgXCJ0ZXh0XCIsXG4gICAgICAgICAgICAgICAgICAgIFwia2V5d29yZC5vcGVyYXRvclwiLCBcInRleHRcIiwgXCJzdG9yYWdlLnR5cGVcIiwgXCJ0ZXh0XCIsIFwicGFyZW4ubHBhcmVuXCJcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIHJlZ2V4IDogXCIoXCIgKyBpZGVudGlmaWVyUmUgKyBcIikoXFxcXC4pKFwiICsgaWRlbnRpZmllclJlICtcIikoXFxcXHMqKSg9KShcXFxccyopKGZ1bmN0aW9uKShcXFxccyopKFxcXFwoKVwiLFxuICAgICAgICAgICAgICAgIG5leHQ6IFwiZnVuY3Rpb25fYXJndW1lbnRzXCJcbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICAvLyBwbGF5ID0gZnVuY3Rpb24oKSB7ICB9XG4gICAgICAgICAgICAgICAgdG9rZW4gOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiZW50aXR5Lm5hbWUuZnVuY3Rpb25cIiwgXCJ0ZXh0XCIsIFwia2V5d29yZC5vcGVyYXRvclwiLCBcInRleHRcIiwgXCJzdG9yYWdlLnR5cGVcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ0ZXh0XCIsIFwicGFyZW4ubHBhcmVuXCJcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIHJlZ2V4IDogXCIoXCIgKyBpZGVudGlmaWVyUmUgK1wiKShcXFxccyopKD0pKFxcXFxzKikoZnVuY3Rpb24pKFxcXFxzKikoXFxcXCgpXCIsXG4gICAgICAgICAgICAgICAgbmV4dDogXCJmdW5jdGlvbl9hcmd1bWVudHNcIlxuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgIC8vIFNvdW5kLnBsYXkgPSBmdW5jdGlvbiBwbGF5KCkgeyAgfVxuICAgICAgICAgICAgICAgIHRva2VuIDogW1xuICAgICAgICAgICAgICAgICAgICBcInN0b3JhZ2UudHlwZVwiLCBcInB1bmN0dWF0aW9uLm9wZXJhdG9yXCIsIFwiZW50aXR5Lm5hbWUuZnVuY3Rpb25cIiwgXCJ0ZXh0XCIsXG4gICAgICAgICAgICAgICAgICAgIFwia2V5d29yZC5vcGVyYXRvclwiLCBcInRleHRcIixcbiAgICAgICAgICAgICAgICAgICAgXCJzdG9yYWdlLnR5cGVcIiwgXCJ0ZXh0XCIsIFwiZW50aXR5Lm5hbWUuZnVuY3Rpb25cIiwgXCJ0ZXh0XCIsIFwicGFyZW4ubHBhcmVuXCJcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIHJlZ2V4IDogXCIoXCIgKyBpZGVudGlmaWVyUmUgKyBcIikoXFxcXC4pKFwiICsgaWRlbnRpZmllclJlICtcIikoXFxcXHMqKSg9KShcXFxccyopKGZ1bmN0aW9uKShcXFxccyspKFxcXFx3KykoXFxcXHMqKShcXFxcKClcIixcbiAgICAgICAgICAgICAgICBuZXh0OiBcImZ1bmN0aW9uX2FyZ3VtZW50c1wiXG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAgLy8gZnVuY3Rpb24gbXlGdW5jKGFyZykgeyB9XG4gICAgICAgICAgICAgICAgdG9rZW4gOiBbXG4gICAgICAgICAgICAgICAgICAgIFwic3RvcmFnZS50eXBlXCIsIFwidGV4dFwiLCBcImVudGl0eS5uYW1lLmZ1bmN0aW9uXCIsIFwidGV4dFwiLCBcInBhcmVuLmxwYXJlblwiXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICByZWdleCA6IFwiKGZ1bmN0aW9uKShcXFxccyspKFwiICsgaWRlbnRpZmllclJlICsgXCIpKFxcXFxzKikoXFxcXCgpXCIsXG4gICAgICAgICAgICAgICAgbmV4dDogXCJmdW5jdGlvbl9hcmd1bWVudHNcIlxuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgIC8vIGZvb2JhcjogZnVuY3Rpb24oKSB7IH1cbiAgICAgICAgICAgICAgICB0b2tlbiA6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJlbnRpdHkubmFtZS5mdW5jdGlvblwiLCBcInRleHRcIiwgXCJwdW5jdHVhdGlvbi5vcGVyYXRvclwiLFxuICAgICAgICAgICAgICAgICAgICBcInRleHRcIiwgXCJzdG9yYWdlLnR5cGVcIiwgXCJ0ZXh0XCIsIFwicGFyZW4ubHBhcmVuXCJcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIHJlZ2V4IDogXCIoXCIgKyBpZGVudGlmaWVyUmUgKyBcIikoXFxcXHMqKSg6KShcXFxccyopKGZ1bmN0aW9uKShcXFxccyopKFxcXFwoKVwiLFxuICAgICAgICAgICAgICAgIG5leHQ6IFwiZnVuY3Rpb25fYXJndW1lbnRzXCJcbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICAvLyA6IGZ1bmN0aW9uKCkgeyB9ICh0aGlzIGlzIGZvciBpc3N1ZXMgd2l0aCAnZm9vJzogZnVuY3Rpb24oKSB7IH0pXG4gICAgICAgICAgICAgICAgdG9rZW4gOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidGV4dFwiLCBcInRleHRcIiwgXCJzdG9yYWdlLnR5cGVcIiwgXCJ0ZXh0XCIsIFwicGFyZW4ubHBhcmVuXCJcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIHJlZ2V4IDogXCIoOikoXFxcXHMqKShmdW5jdGlvbikoXFxcXHMqKShcXFxcKClcIixcbiAgICAgICAgICAgICAgICBuZXh0OiBcImZ1bmN0aW9uX2FyZ3VtZW50c1wiXG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAgdG9rZW4gOiBcImNvbnN0YW50Lmxhbmd1YWdlLmJvb2xlYW5cIixcbiAgICAgICAgICAgICAgICByZWdleCA6IC8oPzp0cnVlfGZhbHNlKVxcYi9cbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICB0b2tlbiA6IFwia2V5d29yZFwiLFxuICAgICAgICAgICAgICAgIHJlZ2V4IDogXCIoPzpcIiArIGt3QmVmb3JlUmUgKyBcIilcXFxcYlwiLFxuICAgICAgICAgICAgICAgIG5leHQgOiBcInJlZ2V4X2FsbG93ZWRcIlxuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgIHRva2VuIDogW1wicHVuY3R1YXRpb24ub3BlcmF0b3JcIiwgXCJzdXBwb3J0LmZ1bmN0aW9uXCJdLFxuICAgICAgICAgICAgICAgIHJlZ2V4IDogLyhcXC4pKHMoPzpoKD86aWZ0fG93KD86TW9kKD86ZWxlc3NEaWFsb2d8YWxEaWFsb2cpfEhlbHApKXxjcm9sbCg/Olh8QnkoPzpQYWdlc3xMaW5lcyk/fFl8VG8pP3x0KD86b3B6enp6fHJpa2UpfGkoPzpufHplVG9Db250ZW50fGRlYmFyfGduVGV4dCl8b3J0fHUoPzpwfGIoPzpzdHIoPzppbmcpPyk/KXxwbGkoPzpjZXx0KXxlKD86bmR8dCg/OlJlKD86c2l6YWJsZXxxdWVzdEhlYWRlcil8TSg/OmkoPzpudXRlc3xsbGlzZWNvbmRzKXxvbnRoKXxTZWNvbmRzfEhvKD86dEtleXN8dXJzKXxZZWFyfEN1cnNvcnxUaW1lKD86b3V0KT98SW50ZXJ2YWx8Wk9wdGlvbnN8RGF0ZXxVVEMoPzpNKD86aSg/Om51dGVzfGxsaXNlY29uZHMpfG9udGgpfFNlY29uZHN8SG91cnN8RGF0ZXxGdWxsWWVhcil8RnVsbFllYXJ8QWN0aXZlKXxhcmNoKXxxcnR8bGljZXxhdmVQcmVmZXJlbmNlc3xtYWxsKXxoKD86b21lfGFuZGxlRXZlbnQpfG5hdmlnYXRlfGMoPzpoYXIoPzpDb2RlQXR8QXQpfG8oPzpzfG4oPzpjYXR8dGV4dHVhbHxmaXJtKXxtcGlsZSl8ZWlsfGxlYXIoPzpUaW1lb3V0fEludGVydmFsKT98YSg/OnB0dXJlRXZlbnRzfGxsKXxyZWF0ZSg/OlN0eWxlU2hlZXR8UG9wdXB8RXZlbnRPYmplY3QpKXx0KD86byg/OkdNVFN0cmluZ3xTKD86dHJpbmd8b3VyY2UpfFUoPzpUQ1N0cmluZ3xwcGVyQ2FzZSl8TG8oPzpjYWxlU3RyaW5nfHdlckNhc2UpKXxlc3R8YSg/Om58aW50KD86RW5hYmxlZCk/KSl8aSg/OnMoPzpOYU58RmluaXRlKXxuZGV4T2Z8dGFsaWNzKXxkKD86aXNhYmxlRXh0ZXJuYWxDYXB0dXJlfHVtcHxldGFjaEV2ZW50KXx1KD86big/OnNoaWZ0fHRhaW50fGVzY2FwZXx3YXRjaCl8cGRhdGVDb21tYW5kcyl8aig/Om9pbnxhdmFFbmFibGVkKXxwKD86byg/OnB8dyl8dXNofGx1Z2lucy5yZWZyZXNofGEoPzpkZGluZ3N8cnNlKD86SW50fEZsb2F0KT8pfHIoPzppbnR8b21wdHxlZmVyZW5jZSkpfGUoPzpzY2FwZXxuYWJsZUV4dGVybmFsQ2FwdHVyZXx2YWx8bGVtZW50RnJvbVBvaW50fHgoPzpwfGVjKD86U2NyaXB0fENvbW1hbmQpPykpfHZhbHVlT2Z8VVRDfHF1ZXJ5Q29tbWFuZCg/OlN0YXRlfEluZGV0ZXJtfEVuYWJsZWR8VmFsdWUpfGYoPzppKD86bmR8bGUoPzpNb2RpZmllZERhdGV8U2l6ZXxDcmVhdGVkRGF0ZXxVcGRhdGVkRGF0ZSl8eGVkKXxvKD86bnQoPzpzaXplfGNvbG9yKXxyd2FyZCl8bG9vcnxyb21DaGFyQ29kZSl8d2F0Y2h8bCg/Omlua3xvKD86YWR8Zyl8YXN0SW5kZXhPZil8YSg/OnNpbnxuY2hvcnxjb3N8dCg/OnRhY2hFdmVudHxvYnxhbig/OjIpPyl8cHBseXxsZXJ0fGIoPzpzfG9ydCkpfHIoPzpvdSg/Om5kfHRlRXZlbnRzKXxlKD86c2l6ZSg/OkJ5fFRvKXxjYWxjfHR1cm5WYWx1ZXxwbGFjZXx2ZXJzZXxsKD86b2FkfGVhc2UoPzpDYXB0dXJlfEV2ZW50cykpKXxhbmRvbSl8Zyg/Om98ZXQoPzpSZXNwb25zZUhlYWRlcnxNKD86aSg/Om51dGVzfGxsaXNlY29uZHMpfG9udGgpfFNlKD86Y29uZHN8bGVjdGlvbil8SG91cnN8WWVhcnxUaW1lKD86em9uZU9mZnNldCk/fERhKD86eXx0ZSl8VVRDKD86TSg/OmkoPzpudXRlc3xsbGlzZWNvbmRzKXxvbnRoKXxTZWNvbmRzfEhvdXJzfERhKD86eXx0ZSl8RnVsbFllYXIpfEZ1bGxZZWFyfEEoPzp0dGVudGlvbnxsbFJlc3BvbnNlSGVhZGVycykpKXxtKD86aW58b3ZlKD86Qig/Onl8ZWxvdyl8VG8oPzpBYnNvbHV0ZSk/fEFib3ZlKXxlcmdlQXR0cmlidXRlc3xhKD86dGNofHJnaW5zfHgpKXxiKD86dG9hfGlnfG8oPzpsZHxyZGVyV2lkdGhzKXxsaW5rfGFjaykpXFxiKD89XFwoKS9cbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICB0b2tlbiA6IFtcInB1bmN0dWF0aW9uLm9wZXJhdG9yXCIsIFwic3VwcG9ydC5mdW5jdGlvbi5kb21cIl0sXG4gICAgICAgICAgICAgICAgcmVnZXggOiAvKFxcLikocyg/OnViKD86c3RyaW5nRGF0YXxtaXQpfHBsaXRUZXh0fGUoPzp0KD86TmFtZWRJdGVtfEF0dHJpYnV0ZSg/Ok5vZGUpPyl8bGVjdCkpfGhhcyg/OkNoaWxkTm9kZXN8RmVhdHVyZSl8bmFtZWRJdGVtfGMoPzpsKD86aWNrfG8oPzpzZXxuZU5vZGUpKXxyZWF0ZSg/OkMoPzpvbW1lbnR8REFUQVNlY3Rpb258YXB0aW9uKXxUKD86SGVhZHxleHROb2RlfEZvb3QpfERvY3VtZW50RnJhZ21lbnR8UHJvY2Vzc2luZ0luc3RydWN0aW9ufEUoPzpudGl0eVJlZmVyZW5jZXxsZW1lbnQpfEF0dHJpYnV0ZSkpfHRhYkluZGV4fGkoPzpuc2VydCg/OlJvd3xCZWZvcmV8Q2VsbHxEYXRhKXx0ZW0pfG9wZW58ZGVsZXRlKD86Um93fEMoPzplbGx8YXB0aW9uKXxUKD86SGVhZHxGb290KXxEYXRhKXxmb2N1c3x3cml0ZSg/OmxuKT98YSg/OmRkfHBwZW5kKD86Q2hpbGR8RGF0YSkpfHJlKD86c2V0fHBsYWNlKD86Q2hpbGR8RGF0YSl8bW92ZSg/Ok5hbWVkSXRlbXxDaGlsZHxBdHRyaWJ1dGUoPzpOb2RlKT8pPyl8Z2V0KD86TmFtZWRJdGVtfEVsZW1lbnQoPzpzQnkoPzpOYW1lfFRhZ05hbWUpfEJ5SWQpfEF0dHJpYnV0ZSg/Ok5vZGUpPyl8Ymx1cilcXGIoPz1cXCgpL1xuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgIHRva2VuIDogW1wicHVuY3R1YXRpb24ub3BlcmF0b3JcIiwgXCJzdXBwb3J0LmNvbnN0YW50XCJdLFxuICAgICAgICAgICAgICAgIHJlZ2V4IDogLyhcXC4pKHMoPzp5c3RlbUxhbmd1YWdlfGNyKD86aXB0c3xvbGxiYXJzfGVlbig/Olh8WXxUb3B8TGVmdCkpfHQoPzp5bGUoPzpTaGVldHMpP3xhdHVzKD86VGV4dHxiYXIpPyl8aWJsaW5nKD86QmVsb3d8QWJvdmUpfG91cmNlfHVmZml4ZXN8ZSg/OmN1cml0eSg/OlBvbGljeSk/fGwoPzplY3Rpb258ZikpKXxoKD86aXN0b3J5fG9zdCg/Om5hbWUpP3xhcyg/Omh8Rm9jdXMpKXx5fFgoPzpNTERvY3VtZW50fFNMRG9jdW1lbnQpfG4oPzpleHR8YW1lKD86c3BhY2UoPzpzfFVSSSl8UHJvcCkpfE0oPzpJTl9WQUxVRXxBWF9WQUxVRSl8Yyg/OmhhcmFjdGVyU2V0fG8oPzpuKD86c3RydWN0b3J8dHJvbGxlcnMpfG9raWVFbmFibGVkfGxvckRlcHRofG1wKD86b25lbnRzfGxldGUpKXx1cnJlbnR8cHVDbGFzc3xsKD86aSg/OnAoPzpib2FyZERhdGEpP3xlbnRJbmZvcm1hdGlvbil8b3NlZHxhc3Nlcyl8YWxsZSg/OmV8cil8cnlwdG8pfHQoPzpvKD86b2xiYXJ8cCl8ZXh0KD86VHJhbnNmb3JtfEluZGVudHxEZWNvcmF0aW9ufEFsaWduKXxhZ3MpfFNRUlQoPzoxXzJ8Mil8aSg/Om4oPzpuZXIoPzpIZWlnaHR8V2lkdGgpfHB1dCl8ZHN8Z25vcmVDYXNlKXx6SW5kZXh8byg/OnNjcHV8big/OnJlYWR5c3RhdGVjaGFuZ2V8TGluZSl8dXRlcig/OkhlaWdodHxXaWR0aCl8cCg/OnNQcm9maWxlfGVuZXIpfGZmc2NyZWVuQnVmZmVyaW5nKXxORUdBVElWRV9JTkZJTklUWXxkKD86aSg/OnNwbGF5fGFsb2coPzpIZWlnaHR8VG9wfFdpZHRofExlZnR8QXJndW1lbnRzKXxyZWN0b3JpZXMpfGUoPzpzY3JpcHRpb258ZmF1bHQoPzpTdGF0dXN8Q2goPzplY2tlZHxhcnNldCl8VmlldykpKXx1KD86c2VyKD86UHJvZmlsZXxMYW5ndWFnZXxBZ2VudCl8big/OmlxdWVJRHxkZWZpbmVkKXxwZGF0ZUludGVydmFsKXxfY29udGVudHxwKD86aXhlbERlcHRofG9ydHxlcnNvbmFsYmFyfGtjczExfGwoPzp1Z2luc3xhdGZvcm0pfGEoPzp0aG5hbWV8ZGRpbmcoPzpSaWdodHxCb3R0b218VG9wfExlZnQpfHJlbnQoPzpXaW5kb3d8TGF5ZXIpP3xnZSg/OlgoPzpPZmZzZXQpP3xZKD86T2Zmc2V0KT8pKXxyKD86byg/OnRvKD86Y29sfHR5cGUpfGR1Y3QoPzpTdWIpP3xtcHRlcil8ZSg/OnZpb3VzfGZpeCkpKXxlKD86big/OmNvZGluZ3xhYmxlZFBsdWdpbil8eCg/OnRlcm5hbHxwYW5kbyl8bWJlZHMpfHYoPzppc2liaWxpdHl8ZW5kb3IoPzpTdWIpP3xMaW5rY29sb3IpfFVSTFVuZW5jb2RlZHxQKD86SXxPU0lUSVZFX0lORklOSVRZKXxmKD86aWxlbmFtZXxvKD86bnQoPzpTaXplfEZhbWlseXxXZWlnaHQpfHJtTmFtZSl8cmFtZSg/OnN8RWxlbWVudCl8Z0NvbG9yKXxFfHdoaXRlU3BhY2V8bCg/OmkoPzpzdFN0eWxlVHlwZXxuKD86ZUhlaWdodHxrQ29sb3IpKXxvKD86Y2EoPzp0aW9uKD86YmFyKT98bE5hbWUpfHdzcmMpfGUoPzpuZ3RofGZ0KD86Q29udGV4dCk/KXxhKD86c3QoPzpNKD86b2RpZmllZHxhdGNoKXxJbmRleHxQYXJlbil8eWVyKD86c3xYKXxuZ3VhZ2UpKXxhKD86cHAoPzpNaW5vclZlcnNpb258TmFtZXxDbyg/OmRlTmFtZXxyZSl8VmVyc2lvbil8dmFpbCg/OkhlaWdodHxUb3B8V2lkdGh8TGVmdCl8bGx8cig/Oml0eXxndW1lbnRzKXxMaW5rY29sb3J8Ym92ZSl8cig/OmlnaHQoPzpDb250ZXh0KT98ZSg/OnNwb25zZSg/OlhNTHxUZXh0KXxhZHlTdGF0ZSkpfGdsb2JhbHx4fG0oPzppbWVUeXBlc3x1bHRpbGluZXxlbnViYXJ8YXJnaW4oPzpSaWdodHxCb3R0b218VG9wfExlZnQpKXxMKD86Tig/OjEwfDIpfE9HKD86MTBFfDJFKSl8Yig/Om8oPzp0dG9tfHJkZXIoPzpXaWR0aHxSaWdodFdpZHRofEJvdHRvbVdpZHRofFN0eWxlfENvbG9yfFRvcFdpZHRofExlZnRXaWR0aCkpfHVmZmVyRGVwdGh8ZWxvd3xhY2tncm91bmQoPzpDb2xvcnxJbWFnZSkpKVxcYi9cbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICB0b2tlbiA6IFtcInN0b3JhZ2UudHlwZVwiLCBcInB1bmN0dWF0aW9uLm9wZXJhdG9yXCIsIFwic3VwcG9ydC5mdW5jdGlvbi5maXJlYnVnXCJdLFxuICAgICAgICAgICAgICAgIHJlZ2V4IDogLyhjb25zb2xlKShcXC4pKHdhcm58aW5mb3xsb2d8ZXJyb3J8dGltZXx0aW1lRW5kfGFzc2VydClcXGIvXG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAgdG9rZW4gOiBrZXl3b3JkTWFwcGVyLFxuICAgICAgICAgICAgICAgIHJlZ2V4IDogaWRlbnRpZmllclJlXG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAgdG9rZW4gOiBcImtleXdvcmQub3BlcmF0b3JcIixcbiAgICAgICAgICAgICAgICByZWdleCA6IC8hfFxcJHwlfCZ8XFwqfFxcLVxcLXxcXC18XFwrXFwrfFxcK3x+fD09PXw9PXw9fCE9fCE9PXw8PXw+PXw8PD18Pj49fD4+Pj18PD58PHw+fCF8JiZ8XFx8XFx8fFxcP1xcOnxcXCo9fCU9fFxcKz18XFwtPXwmPXxcXF49fFxcYig/OmlufGluc3RhbmNlb2Z8bmV3fGRlbGV0ZXx0eXBlb2Z8dm9pZCkvLFxuICAgICAgICAgICAgICAgIG5leHQgIDogXCJyZWdleF9hbGxvd2VkXCJcbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICB0b2tlbiA6IFwicHVuY3R1YXRpb24ub3BlcmF0b3JcIixcbiAgICAgICAgICAgICAgICByZWdleCA6IC9cXD98XFw6fFxcLHxcXDt8XFwuLyxcbiAgICAgICAgICAgICAgICBuZXh0ICA6IFwicmVnZXhfYWxsb3dlZFwiXG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAgdG9rZW4gOiBcInBhcmVuLmxwYXJlblwiLFxuICAgICAgICAgICAgICAgIHJlZ2V4IDogL1tcXFsoe10vLFxuICAgICAgICAgICAgICAgIG5leHQgIDogXCJyZWdleF9hbGxvd2VkXCJcbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICB0b2tlbiA6IFwicGFyZW4ucnBhcmVuXCIsXG4gICAgICAgICAgICAgICAgcmVnZXggOiAvW1xcXSl9XS9cbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICB0b2tlbiA6IFwia2V5d29yZC5vcGVyYXRvclwiLFxuICAgICAgICAgICAgICAgIHJlZ2V4IDogL1xcLz0/LyxcbiAgICAgICAgICAgICAgICBuZXh0ICA6IFwicmVnZXhfYWxsb3dlZFwiXG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAgdG9rZW46IFwiY29tbWVudFwiLFxuICAgICAgICAgICAgICAgIHJlZ2V4OiAvXiMhLiokL1xuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgIHRva2VuIDogXCJ0ZXh0XCIsXG4gICAgICAgICAgICAgICAgcmVnZXggOiAvXFxzKy9cbiAgICAgICAgICAgIH1cbiAgICAgICAgXSxcbiAgICAgICAgLy8gcmVndWxhciBleHByZXNzaW9ucyBhcmUgb25seSBhbGxvd2VkIGFmdGVyIGNlcnRhaW4gdG9rZW5zLiBUaGlzXG4gICAgICAgIC8vIG1ha2VzIHN1cmUgd2UgZG9uJ3QgbWl4IHVwIHJlZ2V4cHMgd2l0aCB0aGUgZGl2aXNvbiBvcGVyYXRvclxuICAgICAgICBcInJlZ2V4X2FsbG93ZWRcIjogW1xuICAgICAgICAgICAgRG9jQ29tbWVudEhpZ2hsaWdodFJ1bGVzLmdldFN0YXJ0UnVsZShcImRvYy1zdGFydFwiKSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0b2tlbiA6IFwiY29tbWVudFwiLCAvLyBtdWx0aSBsaW5lIGNvbW1lbnRcbiAgICAgICAgICAgICAgICBtZXJnZSA6IHRydWUsXG4gICAgICAgICAgICAgICAgcmVnZXggOiBcIlxcXFwvXFxcXCpcIixcbiAgICAgICAgICAgICAgICBuZXh0IDogXCJjb21tZW50X3JlZ2V4X2FsbG93ZWRcIlxuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgIHRva2VuIDogXCJjb21tZW50XCIsXG4gICAgICAgICAgICAgICAgcmVnZXggOiBcIlxcXFwvXFxcXC8uKiRcIlxuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgIHRva2VuOiBcInN0cmluZy5yZWdleHBcIixcbiAgICAgICAgICAgICAgICByZWdleDogXCJcXFxcL1wiLFxuICAgICAgICAgICAgICAgIG5leHQ6IFwicmVnZXhcIixcbiAgICAgICAgICAgICAgICBtZXJnZTogdHJ1ZVxuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgIHRva2VuIDogXCJ0ZXh0XCIsXG4gICAgICAgICAgICAgICAgcmVnZXggOiBcIlxcXFxzK1wiXG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAgLy8gaW1tZWRpYXRlbHkgcmV0dXJuIHRvIHRoZSBzdGFydCBtb2RlIHdpdGhvdXQgbWF0Y2hpbmdcbiAgICAgICAgICAgICAgICAvLyBhbnl0aGluZ1xuICAgICAgICAgICAgICAgIHRva2VuOiBcImVtcHR5XCIsXG4gICAgICAgICAgICAgICAgcmVnZXg6IFwiXCIsXG4gICAgICAgICAgICAgICAgbmV4dDogXCJzdGFydFwiXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sXG4gICAgICAgIFwicmVnZXhcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIC8vIGVzY2FwZXNcbiAgICAgICAgICAgICAgICB0b2tlbjogXCJyZWdleHAua2V5d29yZC5vcGVyYXRvclwiLFxuICAgICAgICAgICAgICAgIHJlZ2V4OiBcIlxcXFxcXFxcKD86dVtcXFxcZGEtZkEtRl17NH18eFtcXFxcZGEtZkEtRl17Mn18LilcIlxuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgIC8vIGZsYWdcbiAgICAgICAgICAgICAgICB0b2tlbjogXCJzdHJpbmcucmVnZXhwXCIsXG4gICAgICAgICAgICAgICAgcmVnZXg6IFwiL1xcXFx3KlwiLFxuICAgICAgICAgICAgICAgIG5leHQ6IFwic3RhcnRcIixcbiAgICAgICAgICAgICAgICBtZXJnZTogdHJ1ZVxuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgIC8vIGludmFsaWQgb3BlcmF0b3JzXG4gICAgICAgICAgICAgICAgdG9rZW4gOiBcImludmFsaWRcIixcbiAgICAgICAgICAgICAgICByZWdleDogL1xce1xcZCssPyg/OlxcZCspP31bKypdfFsrKiReP11bKypdfFskXl1bP118XFw/ezMsfS9cbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICAvLyBvcGVyYXRvcnNcbiAgICAgICAgICAgICAgICB0b2tlbiA6IFwiY29uc3RhbnQubGFuZ3VhZ2UuZXNjYXBlXCIsXG4gICAgICAgICAgICAgICAgcmVnZXg6IC9cXChcXD9bOj0hXXxcXCl8e1xcZCssPyg/OlxcZCspP318eyxcXGQrfXxbKypdXFw/fFsofCkkXisqP10vXG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAgdG9rZW46IFwic3RyaW5nLnJlZ2V4cFwiLFxuICAgICAgICAgICAgICAgIHJlZ2V4OiAve3xbXntcXFtcXC9cXFxcKHwpJF4rKj9dKy8sXG4gICAgICAgICAgICAgICAgbWVyZ2U6IHRydWVcbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICB0b2tlbjogXCJjb25zdGFudC5sYW5ndWFnZS5lc2NhcGVcIixcbiAgICAgICAgICAgICAgICByZWdleDogL1xcW1xcXj8vLFxuICAgICAgICAgICAgICAgIG5leHQ6IFwicmVnZXhfY2hhcmFjdGVyX2NsYXNzXCIsXG4gICAgICAgICAgICAgICAgbWVyZ2U6IHRydWVcbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICB0b2tlbjogXCJlbXB0eVwiLFxuICAgICAgICAgICAgICAgIHJlZ2V4OiBcIlwiLFxuICAgICAgICAgICAgICAgIG5leHQ6IFwic3RhcnRcIlxuICAgICAgICAgICAgfVxuICAgICAgICBdLFxuICAgICAgICBcInJlZ2V4X2NoYXJhY3Rlcl9jbGFzc1wiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdG9rZW46IFwicmVnZXhwLmtleXdvcmQub3BlcmF0b3JcIixcbiAgICAgICAgICAgICAgICByZWdleDogXCJcXFxcXFxcXCg/OnVbXFxcXGRhLWZBLUZdezR9fHhbXFxcXGRhLWZBLUZdezJ9fC4pXCJcbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICB0b2tlbjogXCJjb25zdGFudC5sYW5ndWFnZS5lc2NhcGVcIixcbiAgICAgICAgICAgICAgICByZWdleDogXCJdXCIsXG4gICAgICAgICAgICAgICAgbmV4dDogXCJyZWdleFwiLFxuICAgICAgICAgICAgICAgIG1lcmdlOiB0cnVlXG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAgdG9rZW46IFwiY29uc3RhbnQubGFuZ3VhZ2UuZXNjYXBlXCIsXG4gICAgICAgICAgICAgICAgcmVnZXg6IFwiLVwiXG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAgdG9rZW46IFwic3RyaW5nLnJlZ2V4cC5jaGFyYWNodGVyY2xhc3NcIixcbiAgICAgICAgICAgICAgICByZWdleDogL1teXFxdXFwtXFxcXF0rLyxcbiAgICAgICAgICAgICAgICBtZXJnZTogdHJ1ZVxuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgIHRva2VuOiBcImVtcHR5XCIsXG4gICAgICAgICAgICAgICAgcmVnZXg6IFwiXCIsXG4gICAgICAgICAgICAgICAgbmV4dDogXCJzdGFydFwiXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sXG4gICAgICAgIFwiZnVuY3Rpb25fYXJndW1lbnRzXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0b2tlbjogXCJ2YXJpYWJsZS5wYXJhbWV0ZXJcIixcbiAgICAgICAgICAgICAgICByZWdleDogaWRlbnRpZmllclJlXG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAgdG9rZW46IFwicHVuY3R1YXRpb24ub3BlcmF0b3JcIixcbiAgICAgICAgICAgICAgICByZWdleDogXCJbLCBdK1wiLFxuICAgICAgICAgICAgICAgIG1lcmdlOiB0cnVlXG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAgdG9rZW46IFwicHVuY3R1YXRpb24ub3BlcmF0b3JcIixcbiAgICAgICAgICAgICAgICByZWdleDogXCIkXCIsXG4gICAgICAgICAgICAgICAgbWVyZ2U6IHRydWVcbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICB0b2tlbjogXCJlbXB0eVwiLFxuICAgICAgICAgICAgICAgIHJlZ2V4OiBcIlwiLFxuICAgICAgICAgICAgICAgIG5leHQ6IFwic3RhcnRcIlxuICAgICAgICAgICAgfVxuICAgICAgICBdLFxuICAgICAgICBcImNvbW1lbnRfcmVnZXhfYWxsb3dlZFwiIDogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHRva2VuIDogXCJjb21tZW50XCIsIC8vIGNsb3NpbmcgY29tbWVudFxuICAgICAgICAgICAgICAgIHJlZ2V4IDogXCIuKj9cXFxcKlxcXFwvXCIsXG4gICAgICAgICAgICAgICAgbWVyZ2UgOiB0cnVlLFxuICAgICAgICAgICAgICAgIG5leHQgOiBcInJlZ2V4X2FsbG93ZWRcIlxuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgIHRva2VuIDogXCJjb21tZW50XCIsIC8vIGNvbW1lbnQgc3Bhbm5pbmcgd2hvbGUgbGluZVxuICAgICAgICAgICAgICAgIG1lcmdlIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICByZWdleCA6IFwiLitcIlxuICAgICAgICAgICAgfVxuICAgICAgICBdLFxuICAgICAgICBcImNvbW1lbnRcIiA6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0b2tlbiA6IFwiY29tbWVudFwiLCAvLyBjbG9zaW5nIGNvbW1lbnRcbiAgICAgICAgICAgICAgICByZWdleCA6IFwiLio/XFxcXCpcXFxcL1wiLFxuICAgICAgICAgICAgICAgIG1lcmdlIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBuZXh0IDogXCJzdGFydFwiXG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAgdG9rZW4gOiBcImNvbW1lbnRcIiwgLy8gY29tbWVudCBzcGFubmluZyB3aG9sZSBsaW5lXG4gICAgICAgICAgICAgICAgbWVyZ2UgOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJlZ2V4IDogXCIuK1wiXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sXG4gICAgICAgIFwicXFzdHJpbmdcIiA6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0b2tlbiA6IFwiY29uc3RhbnQubGFuZ3VhZ2UuZXNjYXBlXCIsXG4gICAgICAgICAgICAgICAgcmVnZXggOiBlc2NhcGVkUmVcbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICB0b2tlbiA6IFwic3RyaW5nXCIsXG4gICAgICAgICAgICAgICAgcmVnZXggOiAnW15cIlxcXFxcXFxcXSsnLFxuICAgICAgICAgICAgICAgIG1lcmdlIDogdHJ1ZVxuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgIHRva2VuIDogXCJzdHJpbmdcIixcbiAgICAgICAgICAgICAgICByZWdleCA6IFwiXFxcXFxcXFwkXCIsXG4gICAgICAgICAgICAgICAgbmV4dCAgOiBcInFxc3RyaW5nXCIsXG4gICAgICAgICAgICAgICAgbWVyZ2UgOiB0cnVlXG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAgdG9rZW4gOiBcInN0cmluZ1wiLFxuICAgICAgICAgICAgICAgIHJlZ2V4IDogJ1wifCQnLFxuICAgICAgICAgICAgICAgIG5leHQgIDogXCJzdGFydFwiLFxuICAgICAgICAgICAgICAgIG1lcmdlIDogdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICBdLFxuICAgICAgICBcInFzdHJpbmdcIiA6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0b2tlbiA6IFwiY29uc3RhbnQubGFuZ3VhZ2UuZXNjYXBlXCIsXG4gICAgICAgICAgICAgICAgcmVnZXggOiBlc2NhcGVkUmVcbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICB0b2tlbiA6IFwic3RyaW5nXCIsXG4gICAgICAgICAgICAgICAgcmVnZXggOiBcIlteJ1xcXFxcXFxcXStcIixcbiAgICAgICAgICAgICAgICBtZXJnZSA6IHRydWVcbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICB0b2tlbiA6IFwic3RyaW5nXCIsXG4gICAgICAgICAgICAgICAgcmVnZXggOiBcIlxcXFxcXFxcJFwiLFxuICAgICAgICAgICAgICAgIG5leHQgIDogXCJxc3RyaW5nXCIsXG4gICAgICAgICAgICAgICAgbWVyZ2UgOiB0cnVlXG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAgdG9rZW4gOiBcInN0cmluZ1wiLFxuICAgICAgICAgICAgICAgIHJlZ2V4IDogXCInfCRcIixcbiAgICAgICAgICAgICAgICBuZXh0ICA6IFwic3RhcnRcIixcbiAgICAgICAgICAgICAgICBtZXJnZSA6IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgIH07XG5cbiAgICB0aGlzLmVtYmVkUnVsZXMoRG9jQ29tbWVudEhpZ2hsaWdodFJ1bGVzLCBcImRvYy1cIixcbiAgICAgICAgWyBEb2NDb21tZW50SGlnaGxpZ2h0UnVsZXMuZ2V0RW5kUnVsZShcInN0YXJ0XCIpIF0pO1xufVxuXG5KYXZhU2NyaXB0SGlnaGxpZ2h0UnVsZXMucHJvdG90eXBlID0gbmV3IFRleHRIaWdobGlnaHRSdWxlcygpXG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZSh0b2tlbnMpIHtcbiAgcmV0dXJuIHRva2Vucy5yZWR1Y2UoZnVuY3Rpb24ocmVzdWx0LCB0b2tlbikge1xuICAgIHJldHVybiByZXN1bHQgKyBcIjxjb2RlIGNsYXNzPSdcIiArIHRva2VuLnR5cGUuc3BsaXQoXCIuXCIpLmpvaW4oXCIgXCIpICsgXCInPlwiICtcbiAgICAgICAgICAgdG9rZW4udmFsdWUucmVwbGFjZSgvPC9nLCBcIiZsdDtcIikucmVwbGFjZSgvPi8sIFwiJmd0O1wiKSArIFwiPC9jb2RlPlwiXG4gIH0sIFwiXCIpXG59XG5cblxuZnVuY3Rpb24gaGlnaGxpZ2h0KGNvZGUpIHtcbiAgdmFyIHRva2VuaXplciA9IG5ldyBUb2tlbml6ZXIobmV3IEphdmFTY3JpcHRIaWdobGlnaHRSdWxlcygpLmdldFJ1bGVzKCkpXG4gIHZhciBsaW5lcyA9IGNvZGUuc3BsaXQoXCJcXG5cIikubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICByZXR1cm4gc2VyaWFsaXplKHRva2VuaXplci5nZXRMaW5lVG9rZW5zKGxpbmUpLnRva2VucylcbiAgfSkuam9pbihcIlxcblwiKVxuICByZXR1cm4gXCI8cHJlPlwiICsgbGluZXMgKyBcIjwvcHJlPlwiXG59XG5leHBvcnRzLmhpZ2hsaWdodCA9IGhpZ2hsaWdodDtcblxufSkoKSIsInZhciBtYXJrZWQgPSByZXF1aXJlKFwibWFya2VkXCIpXG52YXIgaGlnaGxpZ2h0ID0gcmVxdWlyZShcIi4vaGlnaGxpZ2h0ZXJcIikuaGlnaGxpZ2h0XG5cbmZ1bmN0aW9uIHJlYWRVUkkodXJpLCBjYWxsYmFjaykge1xuICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gIHhoci5vcGVuKFwiR0VUXCIsIHVyaSwgdHJ1ZSlcbiAgeGhyLm9ubG9hZGVuZCA9IGZ1bmN0aW9uKCkge1xuICAgIGNhbGxiYWNrKHhoci5lcnJvciwgeGhyLnJlc3BvbnNlVGV4dClcbiAgfVxuICB4aHIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgIGNhbGxiYWNrKHhoci5lcnJvcilcbiAgfVxuICB4aHIuc2VuZCgpXG59XG5cbmZ1bmN0aW9uIHBhcnNlRW52KCkge1xuICByZXR1cm4gd2luZG93LmxvY2F0aW9uLnNlYXJjaC5zdWJzdHIoMSkuc3BsaXQoXCImXCIpLnJlZHVjZShmdW5jdGlvbihlbnYsIHBhcnQpIHtcbiAgICB2YXIgcGFpciA9IHBhcnQuc3BsaXQoXCI9XCIpXG4gICAgZW52W2RlY29kZVVSSUNvbXBvbmVudChwYWlyLnNoaWZ0KCkpXSA9IGRlY29kZVVSSUNvbXBvbmVudChwYWlyLnNoaWZ0KCkpXG4gICAgcmV0dXJuIGVudlxuICB9LCB7fSlcbn1cblxuZnVuY3Rpb24gcmVmbG93KCkge1xuICB2YXIgZWwgPSBkb2N1bWVudC5ib2R5LmZpcnN0Q2hpbGRcbiAgdmFyIHN0eWxlID0gZWwuc3R5bGVcbiAgdmFyIGkgPSAxMDAwXG4gIHZhciB0b3BcbiAgdmFyIGxlZnRcblxuICBzdHlsZS5kaXNwbGF5ICA9IFwiYmxvY2tcIlxuICBzdHlsZS5mb250U2l6ZSA9IGkgKyBcImVtXCJcbiAgc3R5bGUucG9zaXRpb24gPSBcImFic29sdXRlXCJcbiAgc3R5bGUucGFkZGluZyA9IDA7XG4gIHN0eWxlLm1hcmdpbiA9IDA7XG5cbiAgd2hpbGUgKDEpIHtcbiAgICBsZWZ0ID0gaW5uZXJXaWR0aCAtIGVsLm9mZnNldFdpZHRoXG4gICAgdG9wICA9IGlubmVySGVpZ2h0IC0gZWwub2Zmc2V0SGVpZ2h0XG5cbiAgICBpZiAodG9wID4gMCAmJiBsZWZ0ID4gMCkgYnJlYWtcblxuICAgIHN0eWxlLmZvbnRTaXplID0gKGkgLT0gaSAqIDAuMDUpICsgXCJlbVwiXG4gIH1cblxuICBzdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiXG4gIHN0eWxlLnRvcCAgICAgPSB0b3AgLyAyICsgXCJweFwiXG4gIHN0eWxlLmxlZnQgICAgPSBsZWZ0IC8gMiArIFwicHhcIlxufVxuXG5cbmZ1bmN0aW9uIG1ha2VTd2l0Y2goc2xpZGVzKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgYm9keSA9IGRvY3VtZW50LmJvZHlcbiAgICB2YXIgaWQgPSBsb2NhdGlvbi5oYXNoLm1hdGNoKC9cXGQrLylcbiAgICB2YXIgc291cmNlID0gc2xpZGVzW2lkXSB8fCBzbGlkZXNbMF1cbiAgICBib2R5LmlubmVySFRNTCA9IHNvdXJjZVxuICAgIHJlZmxvdygpXG4gIH1cbn1cblxuZnVuY3Rpb24gbWFpbigpIHtcbiAgdmFyIGVudiA9IHBhcnNlRW52KCk7XG4gIHJlYWRVUkkoZW52LnVyaSwgZnVuY3Rpb24oZXJyb3IsIGNvbnRlbnQpIHtcbiAgICB2YXIgc2xpZGVzID0gbWFya2VkLmxleGVyKGNvbnRlbnQpLm1hcChmdW5jdGlvbihub2RlKSB7XG4gICAgICByZXR1cm4gbm9kZS50eXBlID09PSBcImNvZGVcIiA/IGhpZ2hsaWdodChub2RlLnRleHQpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcmtlZC5wYXJzZShub2RlLnRleHQudHJpbSgpKVxuICAgIH0pO1xuICAgIHZhciByZW5kZXIgPSBtYWtlU3dpdGNoKHNsaWRlcylcbiAgICB3aW5kb3cub25oYXNoY2hhbmdlID0gcmVuZGVyXG4gICAgcmVuZGVyKClcbiAgfSlcbn1cblxuZnVuY3Rpb24gc3dhcFNsaWRlKGRpZmYpIHtcbiAgdmFyIGluZGV4ID0gMCB8IHBhcnNlSW50KGxvY2F0aW9uLmhhc2gubWF0Y2goL1xcZCsvKSkgKyBkaWZmXG4gIGxvY2F0aW9uLmhhc2ggPSBpbmRleCA8PSAwID8gMCA6IGluZGV4O1xufVxuXG5mdW5jdGlvbiBrZXlOYXZpZ2F0aW9uKGUpIHtcbiAgaWYgKGUud2hpY2ggPT09IDM5KSBzd2FwU2xpZGUoMSlcbiAgZWxzZSBpZiAoZS53aGljaCA9PT0gMzcpIHN3YXBTbGlkZSgtMSlcbn1cblxuZnVuY3Rpb24gdG91Y2hOYXZpZ2F0aW9uKGUpIHtcbiAgaWYgKGUudGFyZ2V0LmhyZWYpIHJldHVyblxuICBzd2FwU2xpZGUoZS50b3VjaGVzWzBdLnBhZ2VYID4gaW5uZXJXaWR0aCAvIDIgPyAxIDogLTEpXG59XG5cbmZ1bmN0aW9uIGZ1bGxzY3JlZW4oZSkge1xuICAvLyBGdWxsIHNjcmVlbiBzaG9ydGN1dCDijKUgUFxuICBpZiAoZS5hbHRLZXkgJiYgZS53aGljaCA9PT0gOTYwKSB7XG4gICAgaWYgKGRvY3VtZW50LmJvZHkucmVxdWVzdEZ1bGxTY3JlZW4pXG4gICAgICBkb2N1bWVudC5ib2R5LnJlcXVlc3RGdWxsU2NyZWVuKClcbiAgICBlbHNlIGlmIChkb2N1bWVudC5ib2R5Lm1velJlcXVlc3RGdWxsU2NyZWVuKVxuICAgICAgZG9jdW1lbnQuYm9keS5tb3pSZXF1ZXN0RnVsbFNjcmVlbigpXG4gICAgZWxzZSBpZiAoZG9jdW1lbnQuYm9keS53ZWJraXRSZXF1ZXN0RnVsbFNjcmVlbilcbiAgICAgIGRvY3VtZW50LmJvZHkud2Via2l0UmVxdWVzdEZ1bGxTY3JlZW4oKVxuICAgIGxvY2F0aW9uLmhhc2ggPSBsb2NhdGlvbi5oYXNoXG4gIH1cbn1cblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsIG1haW4pO1xuZG9jdW1lbnQub25rZXlkb3duID0ga2V5TmF2aWdhdGlvblxuZG9jdW1lbnQub250b3VjaHN0YXJ0ID0gdG91Y2hOYXZpZ2F0aW9uXG5kb2N1bWVudC5vbmtleXByZXNzID0gZnVsbHNjcmVlblxud2luZG93Lm9ucmVzaXplID0gcmVmbG93XG4iLCIoZnVuY3Rpb24oZ2xvYmFsKXsvKipcbiAqIG1hcmtlZCAtIEEgbWFya2Rvd24gcGFyc2VyIChodHRwczovL2dpdGh1Yi5jb20vY2hqai9tYXJrZWQpXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTEtMjAxMiwgQ2hyaXN0b3BoZXIgSmVmZnJleS4gKE1JVCBMaWNlbnNlZClcbiAqL1xuXG47KGZ1bmN0aW9uKCkge1xuXG4vKipcbiAqIEJsb2NrLUxldmVsIEdyYW1tYXJcbiAqL1xuXG52YXIgYmxvY2sgPSB7XG4gIG5ld2xpbmU6IC9eXFxuKy8sXG4gIGNvZGU6IC9eKCB7NH1bXlxcbl0rXFxuKikrLyxcbiAgZmVuY2VzOiBub29wLFxuICBocjogL14oICpbLSpfXSl7Myx9ICooPzpcXG4rfCQpLyxcbiAgaGVhZGluZzogL14gKigjezEsNn0pICooW15cXG5dKz8pICojKiAqKD86XFxuK3wkKS8sXG4gIGxoZWFkaW5nOiAvXihbXlxcbl0rKVxcbiAqKD18LSl7Myx9ICpcXG4qLyxcbiAgYmxvY2txdW90ZTogL14oICo+W15cXG5dKyhcXG5bXlxcbl0rKSpcXG4qKSsvLFxuICBsaXN0OiAvXiggKikoYnVsbCkgW15cXDBdKz8oPzpocnxcXG57Mix9KD8hICkoPyFcXDFidWxsIClcXG4qfFxccyokKS8sXG4gIGh0bWw6IC9eICooPzpjb21tZW50fGNsb3NlZHxjbG9zaW5nKSAqKD86XFxuezIsfXxcXHMqJCkvLFxuICBkZWY6IC9eICpcXFsoW15cXF1dKylcXF06ICooW15cXHNdKykoPzogK1tcIihdKFteXFxuXSspW1wiKV0pPyAqKD86XFxuK3wkKS8sXG4gIHBhcmFncmFwaDogL14oW15cXG5dK1xcbj8oPyFib2R5KSkrXFxuKi8sXG4gIHRleHQ6IC9eW15cXG5dKy9cbn07XG5cbmJsb2NrLmJ1bGxldCA9IC8oPzpbKistXXxcXGQrXFwuKS87XG5ibG9jay5pdGVtID0gL14oICopKGJ1bGwpIFteXFxuXSooPzpcXG4oPyFcXDFidWxsIClbXlxcbl0qKSovO1xuYmxvY2suaXRlbSA9IHJlcGxhY2UoYmxvY2suaXRlbSwgJ2dtJylcbiAgKC9idWxsL2csIGJsb2NrLmJ1bGxldClcbiAgKCk7XG5cbmJsb2NrLmxpc3QgPSByZXBsYWNlKGJsb2NrLmxpc3QpXG4gICgvYnVsbC9nLCBibG9jay5idWxsZXQpXG4gICgnaHInLCAvXFxuKyg/PSg/OiAqWy0qX10pezMsfSAqKD86XFxuK3wkKSkvKVxuICAoKTtcblxuYmxvY2suaHRtbCA9IHJlcGxhY2UoYmxvY2suaHRtbClcbiAgKCdjb21tZW50JywgLzwhLS1bXlxcMF0qPy0tPi8pXG4gICgnY2xvc2VkJywgLzwodGFnKVteXFwwXSs/PFxcL1xcMT4vKVxuICAoJ2Nsb3NpbmcnLCAvPHRhZyg/ITpcXC98QClcXGIoPzpcIlteXCJdKlwifCdbXiddKid8W14nXCI+XSkqPz4vKVxuICAoL3RhZy9nLCB0YWcoKSlcbiAgKCk7XG5cbmJsb2NrLnBhcmFncmFwaCA9IChmdW5jdGlvbigpIHtcbiAgdmFyIHBhcmFncmFwaCA9IGJsb2NrLnBhcmFncmFwaC5zb3VyY2VcbiAgICAsIGJvZHkgPSBbXTtcblxuICAoZnVuY3Rpb24gcHVzaChydWxlKSB7XG4gICAgcnVsZSA9IGJsb2NrW3J1bGVdID8gYmxvY2tbcnVsZV0uc291cmNlIDogcnVsZTtcbiAgICBib2R5LnB1c2gocnVsZS5yZXBsYWNlKC8oXnxbXlxcW10pXFxeL2csICckMScpKTtcbiAgICByZXR1cm4gcHVzaDtcbiAgfSlcbiAgKCdocicpXG4gICgnaGVhZGluZycpXG4gICgnbGhlYWRpbmcnKVxuICAoJ2Jsb2NrcXVvdGUnKVxuICAoJzwnICsgdGFnKCkpXG4gICgnZGVmJyk7XG5cbiAgcmV0dXJuIG5ld1xuICAgIFJlZ0V4cChwYXJhZ3JhcGgucmVwbGFjZSgnYm9keScsIGJvZHkuam9pbignfCcpKSk7XG59KSgpO1xuXG5ibG9jay5ub3JtYWwgPSB7XG4gIGZlbmNlczogYmxvY2suZmVuY2VzLFxuICBwYXJhZ3JhcGg6IGJsb2NrLnBhcmFncmFwaFxufTtcblxuYmxvY2suZ2ZtID0ge1xuICBmZW5jZXM6IC9eICpgYGAgKihcXHcrKT8gKlxcbihbXlxcMF0rPylcXHMqYGBgICooPzpcXG4rfCQpLyxcbiAgcGFyYWdyYXBoOiAvXi9cbn07XG5cbmJsb2NrLmdmbS5wYXJhZ3JhcGggPSByZXBsYWNlKGJsb2NrLnBhcmFncmFwaClcbiAgKCcoPyEnLCAnKD8hJyArIGJsb2NrLmdmbS5mZW5jZXMuc291cmNlLnJlcGxhY2UoLyhefFteXFxbXSlcXF4vZywgJyQxJykgKyAnfCcpXG4gICgpO1xuXG4vKipcbiAqIEJsb2NrIExleGVyXG4gKi9cblxuYmxvY2subGV4ZXIgPSBmdW5jdGlvbihzcmMpIHtcbiAgdmFyIHRva2VucyA9IFtdO1xuXG4gIHRva2Vucy5saW5rcyA9IHt9O1xuXG4gIHNyYyA9IHNyY1xuICAgIC5yZXBsYWNlKC9cXHJcXG58XFxyL2csICdcXG4nKVxuICAgIC5yZXBsYWNlKC9cXHQvZywgJyAgICAnKTtcblxuICByZXR1cm4gYmxvY2sudG9rZW4oc3JjLCB0b2tlbnMsIHRydWUpO1xufTtcblxuYmxvY2sudG9rZW4gPSBmdW5jdGlvbihzcmMsIHRva2VucywgdG9wKSB7XG4gIHZhciBzcmMgPSBzcmMucmVwbGFjZSgvXiArJC9nbSwgJycpXG4gICAgLCBuZXh0XG4gICAgLCBsb29zZVxuICAgICwgY2FwXG4gICAgLCBpdGVtXG4gICAgLCBzcGFjZVxuICAgICwgaVxuICAgICwgbDtcblxuICB3aGlsZSAoc3JjKSB7XG4gICAgLy8gbmV3bGluZVxuICAgIGlmIChjYXAgPSBibG9jay5uZXdsaW5lLmV4ZWMoc3JjKSkge1xuICAgICAgc3JjID0gc3JjLnN1YnN0cmluZyhjYXBbMF0ubGVuZ3RoKTtcbiAgICAgIGlmIChjYXBbMF0ubGVuZ3RoID4gMSkge1xuICAgICAgICB0b2tlbnMucHVzaCh7XG4gICAgICAgICAgdHlwZTogJ3NwYWNlJ1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBjb2RlXG4gICAgaWYgKGNhcCA9IGJsb2NrLmNvZGUuZXhlYyhzcmMpKSB7XG4gICAgICBzcmMgPSBzcmMuc3Vic3RyaW5nKGNhcFswXS5sZW5ndGgpO1xuICAgICAgY2FwID0gY2FwWzBdLnJlcGxhY2UoL14gezR9L2dtLCAnJyk7XG4gICAgICB0b2tlbnMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdjb2RlJyxcbiAgICAgICAgdGV4dDogIW9wdGlvbnMucGVkYW50aWNcbiAgICAgICAgICA/IGNhcC5yZXBsYWNlKC9cXG4rJC8sICcnKVxuICAgICAgICAgIDogY2FwXG4gICAgICB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIGZlbmNlcyAoZ2ZtKVxuICAgIGlmIChjYXAgPSBibG9jay5mZW5jZXMuZXhlYyhzcmMpKSB7XG4gICAgICBzcmMgPSBzcmMuc3Vic3RyaW5nKGNhcFswXS5sZW5ndGgpO1xuICAgICAgdG9rZW5zLnB1c2goe1xuICAgICAgICB0eXBlOiAnY29kZScsXG4gICAgICAgIGxhbmc6IGNhcFsxXSxcbiAgICAgICAgdGV4dDogY2FwWzJdXG4gICAgICB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIGhlYWRpbmdcbiAgICBpZiAoY2FwID0gYmxvY2suaGVhZGluZy5leGVjKHNyYykpIHtcbiAgICAgIHNyYyA9IHNyYy5zdWJzdHJpbmcoY2FwWzBdLmxlbmd0aCk7XG4gICAgICB0b2tlbnMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdoZWFkaW5nJyxcbiAgICAgICAgZGVwdGg6IGNhcFsxXS5sZW5ndGgsXG4gICAgICAgIHRleHQ6IGNhcFsyXVxuICAgICAgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBsaGVhZGluZ1xuICAgIGlmIChjYXAgPSBibG9jay5saGVhZGluZy5leGVjKHNyYykpIHtcbiAgICAgIHNyYyA9IHNyYy5zdWJzdHJpbmcoY2FwWzBdLmxlbmd0aCk7XG4gICAgICB0b2tlbnMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdoZWFkaW5nJyxcbiAgICAgICAgZGVwdGg6IGNhcFsyXSA9PT0gJz0nID8gMSA6IDIsXG4gICAgICAgIHRleHQ6IGNhcFsxXVxuICAgICAgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBoclxuICAgIGlmIChjYXAgPSBibG9jay5oci5leGVjKHNyYykpIHtcbiAgICAgIHNyYyA9IHNyYy5zdWJzdHJpbmcoY2FwWzBdLmxlbmd0aCk7XG4gICAgICB0b2tlbnMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdocidcbiAgICAgIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gYmxvY2txdW90ZVxuICAgIGlmIChjYXAgPSBibG9jay5ibG9ja3F1b3RlLmV4ZWMoc3JjKSkge1xuICAgICAgc3JjID0gc3JjLnN1YnN0cmluZyhjYXBbMF0ubGVuZ3RoKTtcblxuICAgICAgdG9rZW5zLnB1c2goe1xuICAgICAgICB0eXBlOiAnYmxvY2txdW90ZV9zdGFydCdcbiAgICAgIH0pO1xuXG4gICAgICBjYXAgPSBjYXBbMF0ucmVwbGFjZSgvXiAqPiA/L2dtLCAnJyk7XG5cbiAgICAgIC8vIFBhc3MgYHRvcGAgdG8ga2VlcCB0aGUgY3VycmVudFxuICAgICAgLy8gXCJ0b3BsZXZlbFwiIHN0YXRlLiBUaGlzIGlzIGV4YWN0bHlcbiAgICAgIC8vIGhvdyBtYXJrZG93bi5wbCB3b3Jrcy5cbiAgICAgIGJsb2NrLnRva2VuKGNhcCwgdG9rZW5zLCB0b3ApO1xuXG4gICAgICB0b2tlbnMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdibG9ja3F1b3RlX2VuZCdcbiAgICAgIH0pO1xuXG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBsaXN0XG4gICAgaWYgKGNhcCA9IGJsb2NrLmxpc3QuZXhlYyhzcmMpKSB7XG4gICAgICBzcmMgPSBzcmMuc3Vic3RyaW5nKGNhcFswXS5sZW5ndGgpO1xuXG4gICAgICB0b2tlbnMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdsaXN0X3N0YXJ0JyxcbiAgICAgICAgb3JkZXJlZDogaXNGaW5pdGUoY2FwWzJdKVxuICAgICAgfSk7XG5cbiAgICAgIC8vIEdldCBlYWNoIHRvcC1sZXZlbCBpdGVtLlxuICAgICAgY2FwID0gY2FwWzBdLm1hdGNoKGJsb2NrLml0ZW0pO1xuXG4gICAgICBuZXh0ID0gZmFsc2U7XG4gICAgICBsID0gY2FwLmxlbmd0aDtcbiAgICAgIGkgPSAwO1xuXG4gICAgICBmb3IgKDsgaSA8IGw7IGkrKykge1xuICAgICAgICBpdGVtID0gY2FwW2ldO1xuXG4gICAgICAgIC8vIFJlbW92ZSB0aGUgbGlzdCBpdGVtJ3MgYnVsbGV0XG4gICAgICAgIC8vIHNvIGl0IGlzIHNlZW4gYXMgdGhlIG5leHQgdG9rZW4uXG4gICAgICAgIHNwYWNlID0gaXRlbS5sZW5ndGg7XG4gICAgICAgIGl0ZW0gPSBpdGVtLnJlcGxhY2UoL14gKihbKistXXxcXGQrXFwuKSArLywgJycpO1xuXG4gICAgICAgIC8vIE91dGRlbnQgd2hhdGV2ZXIgdGhlXG4gICAgICAgIC8vIGxpc3QgaXRlbSBjb250YWlucy4gSGFja3kuXG4gICAgICAgIGlmICh+aXRlbS5pbmRleE9mKCdcXG4gJykpIHtcbiAgICAgICAgICBzcGFjZSAtPSBpdGVtLmxlbmd0aDtcbiAgICAgICAgICBpdGVtID0gIW9wdGlvbnMucGVkYW50aWNcbiAgICAgICAgICAgID8gaXRlbS5yZXBsYWNlKG5ldyBSZWdFeHAoJ14gezEsJyArIHNwYWNlICsgJ30nLCAnZ20nKSwgJycpXG4gICAgICAgICAgICA6IGl0ZW0ucmVwbGFjZSgvXiB7MSw0fS9nbSwgJycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGV0ZXJtaW5lIHdoZXRoZXIgaXRlbSBpcyBsb29zZSBvciBub3QuXG4gICAgICAgIC8vIFVzZTogLyhefFxcbikoPyEgKVteXFxuXStcXG5cXG4oPyFcXHMqJCkvXG4gICAgICAgIC8vIGZvciBkaXNjb3VudCBiZWhhdmlvci5cbiAgICAgICAgbG9vc2UgPSBuZXh0IHx8IC9cXG5cXG4oPyFcXHMqJCkvLnRlc3QoaXRlbSk7XG4gICAgICAgIGlmIChpICE9PSBsIC0gMSkge1xuICAgICAgICAgIG5leHQgPSBpdGVtW2l0ZW0ubGVuZ3RoLTFdID09PSAnXFxuJztcbiAgICAgICAgICBpZiAoIWxvb3NlKSBsb29zZSA9IG5leHQ7XG4gICAgICAgIH1cblxuICAgICAgICB0b2tlbnMucHVzaCh7XG4gICAgICAgICAgdHlwZTogbG9vc2VcbiAgICAgICAgICAgID8gJ2xvb3NlX2l0ZW1fc3RhcnQnXG4gICAgICAgICAgICA6ICdsaXN0X2l0ZW1fc3RhcnQnXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJlY3Vyc2UuXG4gICAgICAgIGJsb2NrLnRva2VuKGl0ZW0sIHRva2Vucyk7XG5cbiAgICAgICAgdG9rZW5zLnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdsaXN0X2l0ZW1fZW5kJ1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgdG9rZW5zLnB1c2goe1xuICAgICAgICB0eXBlOiAnbGlzdF9lbmQnXG4gICAgICB9KTtcblxuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gaHRtbFxuICAgIGlmIChjYXAgPSBibG9jay5odG1sLmV4ZWMoc3JjKSkge1xuICAgICAgc3JjID0gc3JjLnN1YnN0cmluZyhjYXBbMF0ubGVuZ3RoKTtcbiAgICAgIHRva2Vucy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2h0bWwnLFxuICAgICAgICBwcmU6IGNhcFsxXSA9PT0gJ3ByZScsXG4gICAgICAgIHRleHQ6IGNhcFswXVxuICAgICAgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBkZWZcbiAgICBpZiAodG9wICYmIChjYXAgPSBibG9jay5kZWYuZXhlYyhzcmMpKSkge1xuICAgICAgc3JjID0gc3JjLnN1YnN0cmluZyhjYXBbMF0ubGVuZ3RoKTtcbiAgICAgIHRva2Vucy5saW5rc1tjYXBbMV0udG9Mb3dlckNhc2UoKV0gPSB7XG4gICAgICAgIGhyZWY6IGNhcFsyXSxcbiAgICAgICAgdGl0bGU6IGNhcFszXVxuICAgICAgfTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIHRvcC1sZXZlbCBwYXJhZ3JhcGhcbiAgICBpZiAodG9wICYmIChjYXAgPSBibG9jay5wYXJhZ3JhcGguZXhlYyhzcmMpKSkge1xuICAgICAgc3JjID0gc3JjLnN1YnN0cmluZyhjYXBbMF0ubGVuZ3RoKTtcbiAgICAgIHRva2Vucy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ3BhcmFncmFwaCcsXG4gICAgICAgIHRleHQ6IGNhcFswXVxuICAgICAgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyB0ZXh0XG4gICAgaWYgKGNhcCA9IGJsb2NrLnRleHQuZXhlYyhzcmMpKSB7XG4gICAgICAvLyBUb3AtbGV2ZWwgc2hvdWxkIG5ldmVyIHJlYWNoIGhlcmUuXG4gICAgICBzcmMgPSBzcmMuc3Vic3RyaW5nKGNhcFswXS5sZW5ndGgpO1xuICAgICAgdG9rZW5zLnB1c2goe1xuICAgICAgICB0eXBlOiAndGV4dCcsXG4gICAgICAgIHRleHQ6IGNhcFswXVxuICAgICAgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdG9rZW5zO1xufTtcblxuLyoqXG4gKiBJbmxpbmUgUHJvY2Vzc2luZ1xuICovXG5cbnZhciBpbmxpbmUgPSB7XG4gIGVzY2FwZTogL15cXFxcKFtcXFxcYCp7fVxcW1xcXSgpIytcXC0uIV8+XSkvLFxuICBhdXRvbGluazogL148KFteID5dKyhAfDpcXC8pW14gPl0rKT4vLFxuICB1cmw6IG5vb3AsXG4gIHRhZzogL148IS0tW15cXDBdKj8tLT58XjxcXC8/XFx3Kyg/OlwiW15cIl0qXCJ8J1teJ10qJ3xbXidcIj5dKSo/Pi8sXG4gIGxpbms6IC9eIT9cXFsoaW5zaWRlKVxcXVxcKGhyZWZcXCkvLFxuICByZWZsaW5rOiAvXiE/XFxbKGluc2lkZSlcXF1cXHMqXFxbKFteXFxdXSopXFxdLyxcbiAgbm9saW5rOiAvXiE/XFxbKCg/OlxcW1teXFxdXSpcXF18W15cXFtcXF1dKSopXFxdLyxcbiAgc3Ryb25nOiAvXl9fKFteXFwwXSs/KV9fKD8hXyl8XlxcKlxcKihbXlxcMF0rPylcXCpcXCooPyFcXCopLyxcbiAgZW06IC9eXFxiXygoPzpfX3xbXlxcMF0pKz8pX1xcYnxeXFwqKCg/OlxcKlxcKnxbXlxcMF0pKz8pXFwqKD8hXFwqKS8sXG4gIGNvZGU6IC9eKGArKShbXlxcMF0qP1teYF0pXFwxKD8hYCkvLFxuICBicjogL14gezIsfVxcbig/IVxccyokKS8sXG4gIHRleHQ6IC9eW15cXDBdKz8oPz1bXFxcXDwhXFxbXypgXXwgezIsfVxcbnwkKS9cbn07XG5cbmlubGluZS5fbGlua0luc2lkZSA9IC8oPzpcXFtbXlxcXV0qXFxdfFteXFxdXXxcXF0oPz1bXlxcW10qXFxdKSkqLztcbmlubGluZS5fbGlua0hyZWYgPSAvXFxzKjw/KFteXFxzXSo/KT4/KD86XFxzK1snXCJdKFteXFwwXSo/KVsnXCJdKT9cXHMqLztcblxuaW5saW5lLmxpbmsgPSByZXBsYWNlKGlubGluZS5saW5rKVxuICAoJ2luc2lkZScsIGlubGluZS5fbGlua0luc2lkZSlcbiAgKCdocmVmJywgaW5saW5lLl9saW5rSHJlZilcbiAgKCk7XG5cbmlubGluZS5yZWZsaW5rID0gcmVwbGFjZShpbmxpbmUucmVmbGluaylcbiAgKCdpbnNpZGUnLCBpbmxpbmUuX2xpbmtJbnNpZGUpXG4gICgpO1xuXG5pbmxpbmUubm9ybWFsID0ge1xuICB1cmw6IGlubGluZS51cmwsXG4gIHN0cm9uZzogaW5saW5lLnN0cm9uZyxcbiAgZW06IGlubGluZS5lbSxcbiAgdGV4dDogaW5saW5lLnRleHRcbn07XG5cbmlubGluZS5wZWRhbnRpYyA9IHtcbiAgc3Ryb25nOiAvXl9fKD89XFxTKShbXlxcMF0qP1xcUylfXyg/IV8pfF5cXCpcXCooPz1cXFMpKFteXFwwXSo/XFxTKVxcKlxcKig/IVxcKikvLFxuICBlbTogL15fKD89XFxTKShbXlxcMF0qP1xcUylfKD8hXyl8XlxcKig/PVxcUykoW15cXDBdKj9cXFMpXFwqKD8hXFwqKS9cbn07XG5cbmlubGluZS5nZm0gPSB7XG4gIHVybDogL14oaHR0cHM/OlxcL1xcL1teXFxzXStbXi4sOjtcIicpXFxdXFxzXSkvLFxuICB0ZXh0OiAvXlteXFwwXSs/KD89W1xcXFw8IVxcW18qYF18aHR0cHM/OlxcL1xcL3wgezIsfVxcbnwkKS9cbn07XG5cbi8qKlxuICogSW5saW5lIExleGVyXG4gKi9cblxuaW5saW5lLmxleGVyID0gZnVuY3Rpb24oc3JjKSB7XG4gIHZhciBvdXQgPSAnJ1xuICAgICwgbGlua3MgPSB0b2tlbnMubGlua3NcbiAgICAsIGxpbmtcbiAgICAsIHRleHRcbiAgICAsIGhyZWZcbiAgICAsIGNhcDtcblxuICB3aGlsZSAoc3JjKSB7XG4gICAgLy8gZXNjYXBlXG4gICAgaWYgKGNhcCA9IGlubGluZS5lc2NhcGUuZXhlYyhzcmMpKSB7XG4gICAgICBzcmMgPSBzcmMuc3Vic3RyaW5nKGNhcFswXS5sZW5ndGgpO1xuICAgICAgb3V0ICs9IGNhcFsxXTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIGF1dG9saW5rXG4gICAgaWYgKGNhcCA9IGlubGluZS5hdXRvbGluay5leGVjKHNyYykpIHtcbiAgICAgIHNyYyA9IHNyYy5zdWJzdHJpbmcoY2FwWzBdLmxlbmd0aCk7XG4gICAgICBpZiAoY2FwWzJdID09PSAnQCcpIHtcbiAgICAgICAgdGV4dCA9IGNhcFsxXVs2XSA9PT0gJzonXG4gICAgICAgICAgPyBtYW5nbGUoY2FwWzFdLnN1YnN0cmluZyg3KSlcbiAgICAgICAgICA6IG1hbmdsZShjYXBbMV0pO1xuICAgICAgICBocmVmID0gbWFuZ2xlKCdtYWlsdG86JykgKyB0ZXh0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGV4dCA9IGVzY2FwZShjYXBbMV0pO1xuICAgICAgICBocmVmID0gdGV4dDtcbiAgICAgIH1cbiAgICAgIG91dCArPSAnPGEgaHJlZj1cIidcbiAgICAgICAgKyBocmVmXG4gICAgICAgICsgJ1wiPidcbiAgICAgICAgKyB0ZXh0XG4gICAgICAgICsgJzwvYT4nO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gdXJsIChnZm0pXG4gICAgaWYgKGNhcCA9IGlubGluZS51cmwuZXhlYyhzcmMpKSB7XG4gICAgICBzcmMgPSBzcmMuc3Vic3RyaW5nKGNhcFswXS5sZW5ndGgpO1xuICAgICAgdGV4dCA9IGVzY2FwZShjYXBbMV0pO1xuICAgICAgaHJlZiA9IHRleHQ7XG4gICAgICBvdXQgKz0gJzxhIGhyZWY9XCInXG4gICAgICAgICsgaHJlZlxuICAgICAgICArICdcIj4nXG4gICAgICAgICsgdGV4dFxuICAgICAgICArICc8L2E+JztcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIHRhZ1xuICAgIGlmIChjYXAgPSBpbmxpbmUudGFnLmV4ZWMoc3JjKSkge1xuICAgICAgc3JjID0gc3JjLnN1YnN0cmluZyhjYXBbMF0ubGVuZ3RoKTtcbiAgICAgIG91dCArPSBvcHRpb25zLnNhbml0aXplXG4gICAgICAgID8gZXNjYXBlKGNhcFswXSlcbiAgICAgICAgOiBjYXBbMF07XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBsaW5rXG4gICAgaWYgKGNhcCA9IGlubGluZS5saW5rLmV4ZWMoc3JjKSkge1xuICAgICAgc3JjID0gc3JjLnN1YnN0cmluZyhjYXBbMF0ubGVuZ3RoKTtcbiAgICAgIG91dCArPSBvdXRwdXRMaW5rKGNhcCwge1xuICAgICAgICBocmVmOiBjYXBbMl0sXG4gICAgICAgIHRpdGxlOiBjYXBbM11cbiAgICAgIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gcmVmbGluaywgbm9saW5rXG4gICAgaWYgKChjYXAgPSBpbmxpbmUucmVmbGluay5leGVjKHNyYykpXG4gICAgICAgIHx8IChjYXAgPSBpbmxpbmUubm9saW5rLmV4ZWMoc3JjKSkpIHtcbiAgICAgIHNyYyA9IHNyYy5zdWJzdHJpbmcoY2FwWzBdLmxlbmd0aCk7XG4gICAgICBsaW5rID0gKGNhcFsyXSB8fCBjYXBbMV0pLnJlcGxhY2UoL1xccysvZywgJyAnKTtcbiAgICAgIGxpbmsgPSBsaW5rc1tsaW5rLnRvTG93ZXJDYXNlKCldO1xuICAgICAgaWYgKCFsaW5rIHx8ICFsaW5rLmhyZWYpIHtcbiAgICAgICAgb3V0ICs9IGNhcFswXVswXTtcbiAgICAgICAgc3JjID0gY2FwWzBdLnN1YnN0cmluZygxKSArIHNyYztcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBvdXQgKz0gb3V0cHV0TGluayhjYXAsIGxpbmspO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gc3Ryb25nXG4gICAgaWYgKGNhcCA9IGlubGluZS5zdHJvbmcuZXhlYyhzcmMpKSB7XG4gICAgICBzcmMgPSBzcmMuc3Vic3RyaW5nKGNhcFswXS5sZW5ndGgpO1xuICAgICAgb3V0ICs9ICc8c3Ryb25nPidcbiAgICAgICAgKyBpbmxpbmUubGV4ZXIoY2FwWzJdIHx8IGNhcFsxXSlcbiAgICAgICAgKyAnPC9zdHJvbmc+JztcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIGVtXG4gICAgaWYgKGNhcCA9IGlubGluZS5lbS5leGVjKHNyYykpIHtcbiAgICAgIHNyYyA9IHNyYy5zdWJzdHJpbmcoY2FwWzBdLmxlbmd0aCk7XG4gICAgICBvdXQgKz0gJzxlbT4nXG4gICAgICAgICsgaW5saW5lLmxleGVyKGNhcFsyXSB8fCBjYXBbMV0pXG4gICAgICAgICsgJzwvZW0+JztcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIGNvZGVcbiAgICBpZiAoY2FwID0gaW5saW5lLmNvZGUuZXhlYyhzcmMpKSB7XG4gICAgICBzcmMgPSBzcmMuc3Vic3RyaW5nKGNhcFswXS5sZW5ndGgpO1xuICAgICAgb3V0ICs9ICc8Y29kZT4nXG4gICAgICAgICsgZXNjYXBlKGNhcFsyXSwgdHJ1ZSlcbiAgICAgICAgKyAnPC9jb2RlPic7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBiclxuICAgIGlmIChjYXAgPSBpbmxpbmUuYnIuZXhlYyhzcmMpKSB7XG4gICAgICBzcmMgPSBzcmMuc3Vic3RyaW5nKGNhcFswXS5sZW5ndGgpO1xuICAgICAgb3V0ICs9ICc8YnI+JztcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIHRleHRcbiAgICBpZiAoY2FwID0gaW5saW5lLnRleHQuZXhlYyhzcmMpKSB7XG4gICAgICBzcmMgPSBzcmMuc3Vic3RyaW5nKGNhcFswXS5sZW5ndGgpO1xuICAgICAgb3V0ICs9IGVzY2FwZShjYXBbMF0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG91dDtcbn07XG5cbmZ1bmN0aW9uIG91dHB1dExpbmsoY2FwLCBsaW5rKSB7XG4gIGlmIChjYXBbMF1bMF0gIT09ICchJykge1xuICAgIHJldHVybiAnPGEgaHJlZj1cIidcbiAgICAgICsgZXNjYXBlKGxpbmsuaHJlZilcbiAgICAgICsgJ1wiJ1xuICAgICAgKyAobGluay50aXRsZVxuICAgICAgPyAnIHRpdGxlPVwiJ1xuICAgICAgKyBlc2NhcGUobGluay50aXRsZSlcbiAgICAgICsgJ1wiJ1xuICAgICAgOiAnJylcbiAgICAgICsgJz4nXG4gICAgICArIGlubGluZS5sZXhlcihjYXBbMV0pXG4gICAgICArICc8L2E+JztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gJzxpbWcgc3JjPVwiJ1xuICAgICAgKyBlc2NhcGUobGluay5ocmVmKVxuICAgICAgKyAnXCIgYWx0PVwiJ1xuICAgICAgKyBlc2NhcGUoY2FwWzFdKVxuICAgICAgKyAnXCInXG4gICAgICArIChsaW5rLnRpdGxlXG4gICAgICA/ICcgdGl0bGU9XCInXG4gICAgICArIGVzY2FwZShsaW5rLnRpdGxlKVxuICAgICAgKyAnXCInXG4gICAgICA6ICcnKVxuICAgICAgKyAnPic7XG4gIH1cbn1cblxuLyoqXG4gKiBQYXJzaW5nXG4gKi9cblxudmFyIHRva2Vuc1xuICAsIHRva2VuO1xuXG5mdW5jdGlvbiBuZXh0KCkge1xuICByZXR1cm4gdG9rZW4gPSB0b2tlbnMucG9wKCk7XG59XG5cbmZ1bmN0aW9uIHRvaygpIHtcbiAgc3dpdGNoICh0b2tlbi50eXBlKSB7XG4gICAgY2FzZSAnc3BhY2UnOiB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuICAgIGNhc2UgJ2hyJzoge1xuICAgICAgcmV0dXJuICc8aHI+XFxuJztcbiAgICB9XG4gICAgY2FzZSAnaGVhZGluZyc6IHtcbiAgICAgIHJldHVybiAnPGgnXG4gICAgICAgICsgdG9rZW4uZGVwdGhcbiAgICAgICAgKyAnPidcbiAgICAgICAgKyBpbmxpbmUubGV4ZXIodG9rZW4udGV4dClcbiAgICAgICAgKyAnPC9oJ1xuICAgICAgICArIHRva2VuLmRlcHRoXG4gICAgICAgICsgJz5cXG4nO1xuICAgIH1cbiAgICBjYXNlICdjb2RlJzoge1xuICAgICAgaWYgKG9wdGlvbnMuaGlnaGxpZ2h0KSB7XG4gICAgICAgIHRva2VuLmNvZGUgPSBvcHRpb25zLmhpZ2hsaWdodCh0b2tlbi50ZXh0LCB0b2tlbi5sYW5nKTtcbiAgICAgICAgaWYgKHRva2VuLmNvZGUgIT0gbnVsbCAmJiB0b2tlbi5jb2RlICE9PSB0b2tlbi50ZXh0KSB7XG4gICAgICAgICAgdG9rZW4uZXNjYXBlZCA9IHRydWU7XG4gICAgICAgICAgdG9rZW4udGV4dCA9IHRva2VuLmNvZGU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKCF0b2tlbi5lc2NhcGVkKSB7XG4gICAgICAgIHRva2VuLnRleHQgPSBlc2NhcGUodG9rZW4udGV4dCwgdHJ1ZSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiAnPHByZT48Y29kZSdcbiAgICAgICAgKyAodG9rZW4ubGFuZ1xuICAgICAgICA/ICcgY2xhc3M9XCJsYW5nLSdcbiAgICAgICAgKyB0b2tlbi5sYW5nXG4gICAgICAgICsgJ1wiJ1xuICAgICAgICA6ICcnKVxuICAgICAgICArICc+J1xuICAgICAgICArIHRva2VuLnRleHRcbiAgICAgICAgKyAnPC9jb2RlPjwvcHJlPlxcbic7XG4gICAgfVxuICAgIGNhc2UgJ2Jsb2NrcXVvdGVfc3RhcnQnOiB7XG4gICAgICB2YXIgYm9keSA9ICcnO1xuXG4gICAgICB3aGlsZSAobmV4dCgpLnR5cGUgIT09ICdibG9ja3F1b3RlX2VuZCcpIHtcbiAgICAgICAgYm9keSArPSB0b2soKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuICc8YmxvY2txdW90ZT5cXG4nXG4gICAgICAgICsgYm9keVxuICAgICAgICArICc8L2Jsb2NrcXVvdGU+XFxuJztcbiAgICB9XG4gICAgY2FzZSAnbGlzdF9zdGFydCc6IHtcbiAgICAgIHZhciB0eXBlID0gdG9rZW4ub3JkZXJlZCA/ICdvbCcgOiAndWwnXG4gICAgICAgICwgYm9keSA9ICcnO1xuXG4gICAgICB3aGlsZSAobmV4dCgpLnR5cGUgIT09ICdsaXN0X2VuZCcpIHtcbiAgICAgICAgYm9keSArPSB0b2soKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuICc8J1xuICAgICAgICArIHR5cGVcbiAgICAgICAgKyAnPlxcbidcbiAgICAgICAgKyBib2R5XG4gICAgICAgICsgJzwvJ1xuICAgICAgICArIHR5cGVcbiAgICAgICAgKyAnPlxcbic7XG4gICAgfVxuICAgIGNhc2UgJ2xpc3RfaXRlbV9zdGFydCc6IHtcbiAgICAgIHZhciBib2R5ID0gJyc7XG5cbiAgICAgIHdoaWxlIChuZXh0KCkudHlwZSAhPT0gJ2xpc3RfaXRlbV9lbmQnKSB7XG4gICAgICAgIGJvZHkgKz0gdG9rZW4udHlwZSA9PT0gJ3RleHQnXG4gICAgICAgICAgPyBwYXJzZVRleHQoKVxuICAgICAgICAgIDogdG9rKCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiAnPGxpPidcbiAgICAgICAgKyBib2R5XG4gICAgICAgICsgJzwvbGk+XFxuJztcbiAgICB9XG4gICAgY2FzZSAnbG9vc2VfaXRlbV9zdGFydCc6IHtcbiAgICAgIHZhciBib2R5ID0gJyc7XG5cbiAgICAgIHdoaWxlIChuZXh0KCkudHlwZSAhPT0gJ2xpc3RfaXRlbV9lbmQnKSB7XG4gICAgICAgIGJvZHkgKz0gdG9rKCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiAnPGxpPidcbiAgICAgICAgKyBib2R5XG4gICAgICAgICsgJzwvbGk+XFxuJztcbiAgICB9XG4gICAgY2FzZSAnaHRtbCc6IHtcbiAgICAgIGlmIChvcHRpb25zLnNhbml0aXplKSB7XG4gICAgICAgIHJldHVybiBpbmxpbmUubGV4ZXIodG9rZW4udGV4dCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gIXRva2VuLnByZSAmJiAhb3B0aW9ucy5wZWRhbnRpY1xuICAgICAgICA/IGlubGluZS5sZXhlcih0b2tlbi50ZXh0KVxuICAgICAgICA6IHRva2VuLnRleHQ7XG4gICAgfVxuICAgIGNhc2UgJ3BhcmFncmFwaCc6IHtcbiAgICAgIHJldHVybiAnPHA+J1xuICAgICAgICArIGlubGluZS5sZXhlcih0b2tlbi50ZXh0KVxuICAgICAgICArICc8L3A+XFxuJztcbiAgICB9XG4gICAgY2FzZSAndGV4dCc6IHtcbiAgICAgIHJldHVybiAnPHA+J1xuICAgICAgICArIHBhcnNlVGV4dCgpXG4gICAgICAgICsgJzwvcD5cXG4nO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBwYXJzZVRleHQoKSB7XG4gIHZhciBib2R5ID0gdG9rZW4udGV4dFxuICAgICwgdG9wO1xuXG4gIHdoaWxlICgodG9wID0gdG9rZW5zW3Rva2Vucy5sZW5ndGgtMV0pXG4gICAgICAgICAmJiB0b3AudHlwZSA9PT0gJ3RleHQnKSB7XG4gICAgYm9keSArPSAnXFxuJyArIG5leHQoKS50ZXh0O1xuICB9XG5cbiAgcmV0dXJuIGlubGluZS5sZXhlcihib2R5KTtcbn1cblxuZnVuY3Rpb24gcGFyc2Uoc3JjKSB7XG4gIHRva2VucyA9IHNyYy5yZXZlcnNlKCk7XG5cbiAgdmFyIG91dCA9ICcnO1xuICB3aGlsZSAobmV4dCgpKSB7XG4gICAgb3V0ICs9IHRvaygpO1xuICB9XG5cbiAgdG9rZW5zID0gbnVsbDtcbiAgdG9rZW4gPSBudWxsO1xuXG4gIHJldHVybiBvdXQ7XG59XG5cbi8qKlxuICogSGVscGVyc1xuICovXG5cbmZ1bmN0aW9uIGVzY2FwZShodG1sLCBlbmNvZGUpIHtcbiAgcmV0dXJuIGh0bWxcbiAgICAucmVwbGFjZSghZW5jb2RlID8gLyYoPyEjP1xcdys7KS9nIDogLyYvZywgJyZhbXA7JylcbiAgICAucmVwbGFjZSgvPC9nLCAnJmx0OycpXG4gICAgLnJlcGxhY2UoLz4vZywgJyZndDsnKVxuICAgIC5yZXBsYWNlKC9cIi9nLCAnJnF1b3Q7JylcbiAgICAucmVwbGFjZSgvJy9nLCAnJiMzOTsnKTtcbn1cblxuZnVuY3Rpb24gbWFuZ2xlKHRleHQpIHtcbiAgdmFyIG91dCA9ICcnXG4gICAgLCBsID0gdGV4dC5sZW5ndGhcbiAgICAsIGkgPSAwXG4gICAgLCBjaDtcblxuICBmb3IgKDsgaSA8IGw7IGkrKykge1xuICAgIGNoID0gdGV4dC5jaGFyQ29kZUF0KGkpO1xuICAgIGlmIChNYXRoLnJhbmRvbSgpID4gMC41KSB7XG4gICAgICBjaCA9ICd4JyArIGNoLnRvU3RyaW5nKDE2KTtcbiAgICB9XG4gICAgb3V0ICs9ICcmIycgKyBjaCArICc7JztcbiAgfVxuXG4gIHJldHVybiBvdXQ7XG59XG5cbmZ1bmN0aW9uIHRhZygpIHtcbiAgdmFyIHRhZyA9ICcoPyEoPzonXG4gICAgKyAnYXxlbXxzdHJvbmd8c21hbGx8c3xjaXRlfHF8ZGZufGFiYnJ8ZGF0YXx0aW1lfGNvZGUnXG4gICAgKyAnfHZhcnxzYW1wfGtiZHxzdWJ8c3VwfGl8Ynx1fG1hcmt8cnVieXxydHxycHxiZGl8YmRvJ1xuICAgICsgJ3xzcGFufGJyfHdicnxpbnN8ZGVsfGltZylcXFxcYilcXFxcdysnO1xuXG4gIHJldHVybiB0YWc7XG59XG5cbmZ1bmN0aW9uIHJlcGxhY2UocmVnZXgsIG9wdCkge1xuICByZWdleCA9IHJlZ2V4LnNvdXJjZTtcbiAgb3B0ID0gb3B0IHx8ICcnO1xuICByZXR1cm4gZnVuY3Rpb24gc2VsZihuYW1lLCB2YWwpIHtcbiAgICBpZiAoIW5hbWUpIHJldHVybiBuZXcgUmVnRXhwKHJlZ2V4LCBvcHQpO1xuICAgIHJlZ2V4ID0gcmVnZXgucmVwbGFjZShuYW1lLCB2YWwuc291cmNlIHx8IHZhbCk7XG4gICAgcmV0dXJuIHNlbGY7XG4gIH07XG59XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxubm9vcC5leGVjID0gbm9vcDtcblxuLyoqXG4gKiBNYXJrZWRcbiAqL1xuXG5mdW5jdGlvbiBtYXJrZWQoc3JjLCBvcHQpIHtcbiAgc2V0T3B0aW9ucyhvcHQpO1xuICByZXR1cm4gcGFyc2UoYmxvY2subGV4ZXIoc3JjKSk7XG59XG5cbi8qKlxuICogT3B0aW9uc1xuICovXG5cbnZhciBvcHRpb25zXG4gICwgZGVmYXVsdHM7XG5cbmZ1bmN0aW9uIHNldE9wdGlvbnMob3B0KSB7XG4gIGlmICghb3B0KSBvcHQgPSBkZWZhdWx0cztcbiAgaWYgKG9wdGlvbnMgPT09IG9wdCkgcmV0dXJuO1xuICBvcHRpb25zID0gb3B0O1xuXG4gIGlmIChvcHRpb25zLmdmbSkge1xuICAgIGJsb2NrLmZlbmNlcyA9IGJsb2NrLmdmbS5mZW5jZXM7XG4gICAgYmxvY2sucGFyYWdyYXBoID0gYmxvY2suZ2ZtLnBhcmFncmFwaDtcbiAgICBpbmxpbmUudGV4dCA9IGlubGluZS5nZm0udGV4dDtcbiAgICBpbmxpbmUudXJsID0gaW5saW5lLmdmbS51cmw7XG4gIH0gZWxzZSB7XG4gICAgYmxvY2suZmVuY2VzID0gYmxvY2subm9ybWFsLmZlbmNlcztcbiAgICBibG9jay5wYXJhZ3JhcGggPSBibG9jay5ub3JtYWwucGFyYWdyYXBoO1xuICAgIGlubGluZS50ZXh0ID0gaW5saW5lLm5vcm1hbC50ZXh0O1xuICAgIGlubGluZS51cmwgPSBpbmxpbmUubm9ybWFsLnVybDtcbiAgfVxuXG4gIGlmIChvcHRpb25zLnBlZGFudGljKSB7XG4gICAgaW5saW5lLmVtID0gaW5saW5lLnBlZGFudGljLmVtO1xuICAgIGlubGluZS5zdHJvbmcgPSBpbmxpbmUucGVkYW50aWMuc3Ryb25nO1xuICB9IGVsc2Uge1xuICAgIGlubGluZS5lbSA9IGlubGluZS5ub3JtYWwuZW07XG4gICAgaW5saW5lLnN0cm9uZyA9IGlubGluZS5ub3JtYWwuc3Ryb25nO1xuICB9XG59XG5cbm1hcmtlZC5vcHRpb25zID1cbm1hcmtlZC5zZXRPcHRpb25zID0gZnVuY3Rpb24ob3B0KSB7XG4gIGRlZmF1bHRzID0gb3B0O1xuICBzZXRPcHRpb25zKG9wdCk7XG4gIHJldHVybiBtYXJrZWQ7XG59O1xuXG5tYXJrZWQuc2V0T3B0aW9ucyh7XG4gIGdmbTogdHJ1ZSxcbiAgcGVkYW50aWM6IGZhbHNlLFxuICBzYW5pdGl6ZTogZmFsc2UsXG4gIGhpZ2hsaWdodDogbnVsbFxufSk7XG5cbi8qKlxuICogRXhwb3NlXG4gKi9cblxubWFya2VkLnBhcnNlciA9IGZ1bmN0aW9uKHNyYywgb3B0KSB7XG4gIHNldE9wdGlvbnMob3B0KTtcbiAgcmV0dXJuIHBhcnNlKHNyYyk7XG59O1xuXG5tYXJrZWQubGV4ZXIgPSBmdW5jdGlvbihzcmMsIG9wdCkge1xuICBzZXRPcHRpb25zKG9wdCk7XG4gIHJldHVybiBibG9jay5sZXhlcihzcmMpO1xufTtcblxubWFya2VkLnBhcnNlID0gbWFya2VkO1xuXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgbW9kdWxlLmV4cG9ydHMgPSBtYXJrZWQ7XG59IGVsc2Uge1xuICB0aGlzLm1hcmtlZCA9IG1hcmtlZDtcbn1cblxufSkuY2FsbChmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMgfHwgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDogZ2xvYmFsKTtcbn0oKSk7XG5cbn0pKHdpbmRvdykiXX0=
;