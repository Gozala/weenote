*Hacking* Firefox
made *easy*

Irakli Gozalishvili
[@gozala](https://twitter.com/gozala)

I *⚒* jetpack

I *<3* simplicity

Firefox technology
stack *is...*

similar to
*web* stack

![we-can-do-html5](http://pingv.com/f/styles/scale-638-blog/public/presentation/we-can-do-html5.jpg)

just enough to
be *confusing :(*

but *not enough*
to feel *~/*

What you need
to *know*
to *hack* on Firefox

or traditional
*add-ons*

[&lt;XUL&gt;](https://developer.mozilla.org/en/docs/XUL)

is like
*&lt;html&gt;*

but not quite
*:(*

[CSS](https://developer.mozilla.org/en-US/docs/CSS)

*+* mozilla
[-moz-extensions](https://developer.mozilla.org/en-US/docs/CSS/CSS_Reference/Mozilla_Extensions)

[&lt;XBL&gt;](https://developer.mozilla.org/en-US/docs/XBL)

Like HTML5
[Web Components](http://dvcs.w3.org/hg/webcomponents/raw-file/tip/explainer/index.html)

JS

# +

for each*,* yield*,*
__iterator__*,* let*,* E4X*,*
destructuring*,*
comprehensions*...*

[XPCOM](https://developer.mozilla.org/en/docs/XPCOM)

*&*
the best part

![compiling](http://imgs.xkcd.com/comics/compiling.png)

!*simple*

This is a steep
*learning* curve

☹

*What if*
we could

Hack
*Firefox*

*Jetpack* way

*=&gt;*

just a

*web* stack

JS


    var widget = require("sdk/widget").Widget({
        id: "mozilla-icon",
        label: "My Mozilla Widget",
        contentURL: "http://www.mozilla.org/favicon.ico"
    })



HTML *+* CSS



    var html = "<h1><span style='color:red'>Hello</span> world</h1>"
    var panel = require("sdk/panel").Panel({
      contentURL: "data:text/html," + html
    })

    panel.show()



♻


    widget.on("click", function() {
      panel.show()
    })


![jetpack](https://raw.github.com/ZER0/dzslides/asia-2012/assets/jetpack.png)

TODO*:*

➀

*CommonJS* modules
*&gt;&gt;* Firefox

    var other = require("other/lib")

    exports.stuff = function(options) {
      // Do things...
    }


Yet another
*module* system,
seriously *?*

Yes

*Why?*

![node](./slides/fosdem-2013/nodejs.png)
![npm](./slides/fosdem-2013/npm.png)

*&gt; 1700*
published modules

*☑*

You can

load *loader*
as
*JSM*


    var Cu = Components.utils
    Cu.import("resource://gre/modules/commonjs/toolkit/loader.js")


Or as
*&lt;script/&gt;*

    <script src="resource://gre/modules/commonjs/toolkit/loader.js"/>


Define module
*locations*


    {
      "": "resource:///modules/commonjs/",
      "devtools/": "resource:///modules/devtools/"
    }

Define module
*globals*

    {
      console: {
        log: dump
        // ...
      }
    }

Even expose *old* style
*modules*



    {
      "devtools/gcli": Cu.import("resource:///modules/devtools/gcli.jsm").gcli
    }


Make your
*loader*



    var Cu = Components.utils
    var { Loader, Require } = Cu.import("resource://gre/modules/commonjs/toolkit/loader.js").Loader

    var loader = Loader({
      paths: {  // Provide module locations
        "": "resource:///modules/commonjs/",
        "devtools/": "resource:///modules/devtools/"
      },
      globals: { // Provide module globals
        console: { log: dump /* ... */ }
      },
      modules: { // Provide module globals
        "devtools/gcli": Cu.import("resource:///modules/devtools/gcli.jsm").gcli
      }
    })

    var require = Require(loader, { id: "main" })


*&* load your
*modules*

    var gcli = require("devtools/gcli")
    var promise = require("toolkit/promise/core")

➁

Ship *SDK* modules
with Firefox

Why*?*

Smaller
*Add-ons*

Better
availability

For *traditional*
Add-ons

*Firefox*
code

⚒

Some of it is
*already there*

![modules](./slides/fosdem-2013/modules.png)

*&* is already
*used*

by background thread
[OS.File](https://developer.mozilla.org/en-US/docs/JavaScript_OS.File)

by Firefox's
[Developer Toolbar](https://developer.mozilla.org/en-US/docs/Tools/GCLI)

Rest is coming
[Bug 731779](https://bugzilla.mozilla.org/show_bug.cgi?id=731779)

⇢
