*polymorphism*
à la carte

Irakli Gozalishvili
[@gozala](https://twitter.com/gozala)

Software is all about
taking *input*
& transforming
it to *output*

Everything else is
just an *accidental*
*complexity* we’ve
introduced

Let’s pick
on:
*Classes*

(*prototypal*
inheritance
if you like ;)

Purpose of
*Classes*:

*building blocks*
of common functionality

that can be *reused* in
multiple *abstractions*

Sounds
great*!*

but*...*

in practice

they introduce
*incidental complexity*

Bind *data* structures &
*functions* together

This is a
fundamental
*error*

*Functions* do things
with *data* structures

*Data* structures just are*!*

*Functions* are understood
as*...*

black boxes

that

transform
*inputs* to *outputs*

➟*λ*➟

If you understand *relation*
between *input* & *output*
you understand function

    let inc = (x) => x + 1

Functions *compose*!

➟*λ1*➟*λ2*➟

➟*λ1*➟*λ2*➟*λ3*➟

➟*λ1*➟*λ2*➟*λ3*➟*λ4*

I can *keep doing* it*!*

➟*λ1*➟*λ2*➟*λ3*➟*λ4*➟*λ5*➟*λ6*➟*λ7*➟*λ8*➟*λ9*➟*λ10*➟*λ11*➟*λ12*➟*λ13*➟*λ13*➟

*&* it'll stay *simple*

*Classes* complect
*data* structures
& *functions*

⍐

*&* no longer
compose

:(


They enable *reuse*
via *inheritance*

⍐*⇠*⍐⍐

every *bulding block*

⍐⍐

*inherits* from *another*

⍐*⇠*⍐⍐

Its *data* attributes

⍐*⇠*⍐⍐*⇠*⍐⍐⍐

Its *functions*

⍐*⇠*⍐⍐*⇠*⍐⍐⍐*⇠*⍐⍐⍐⍐

its *complexity*

⍐*⇠*⍐⍐*⇠*⍐⍐⍐*⇠*⍐⍐⍐⍐*⇠*⍐⍐⍐⍐⍐

gets *complex*
with *every* block

⍐*⇠*⍐⍐*⇠*⍐⍐⍐*⇠*⍐⍐⍐⍐*⇠*⍐⍐⍐⍐⍐*⇠*⍐⍐⍐⍐⍐⍐*⇠*⍐⍐⍐⍐⍐⍐⍐*⇠*⍐⍐⍐⍐⍐⍐⍐⍐*⇠*⍐⍐⍐⍐⍐⍐⍐⍐⍐


And it's no longer
about *input* & *output*

    // Begining of class definition ...
      show: function(x, y) {
        if (!this.isReady()) this.init()
        renderShape(x, y, this.width, this.height)
      }
    // Rest of the class defintion ...

*definitions* are *spread*
all over the *inheritance* chain

it's like *analyzing* human
*genome*

There are *more issues*...

Name *collisions*

*Expression* problem

...

:(


*Classes* are mechanism for
*polymorphic dispatch*

Polymorphism*?*

Way to *handle* values
of *different* data *types*
using a *uniform interface*

    "hello world".first() // => "h"
    [1, 2, 3, 4].first()  // => 1
    myType.first()        // => x

What *if?*

We had *uniform interface*
to different types *via functions*

    first("hello")     // => "h"
    first([1, 2, 3])   // => 1
    first(myType)      // => x

That would allow *reuse* via
function *composition*

➟*λ1*➟*λ2*➟*λ3*➟*λ4*

Solution exists!

Type classes
![Type classes](http://www.haskell.org/wikistatic/haskellwiki_logo.png)


Clojure protocols
![Clojure protocols](http://clojure.org/file/view/clojure-icon.gif)

method*.js*


Think in data *abstractions*

    var method = require("method")
    // Sequence abstraction
    exports.first = method()
    exports.rest = method()

Define data *types* that comply to
*abstractions*

    function List(head, tail) {
      this.head = head
      this.tail = tail
    }

    first.define(List, list => list.head)
    rest.define(List, list => list.tail)

Or extend data *types* to comply to
*abstractions*

    first.define(Array, array => array[0])
    rest.define(Array, array => array.slice(1))

    first.define(String, string => string[0])
    rest.define(String, string => string.substr(1))

Define *functions* that *operate* on
data *abstractions*

    function drop(n, sequence) {
      var x = n
      var items = sequence
      while (n-- >= 0) items = rest(items)
      return items
    }

& compose!
➟*λ1*➟*λ2*➟*λ3*➟
