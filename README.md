# Steam Community 

Easily access information about yourself and your friends on the Steam community website.
Given a 64bit Steam ID, this module retrieves a user's XML from the Steam Community
site and returns a parsed JSON object. Awesome!

Includes configurable timeouts and retry, provided by the [Re](https://npmjs.org/package/re) package.

## Install

<pre>
  npm install steam-community
</pre>

## Usage

Get your 64bit steam ID and plug it in. You'll get back an object with all the infos.

```javascript
var steam = require('steam-community'),
    client = steam();

client.user("12345678901234567", function(err, user){
		console.log(util.inspect(user, false, 4, true));
});
```

There's also a `games` function. You use it like this:

```javascript
var steam = require('steam-community'),
    client = steam();

client.games("12345678901234567", function(err, games){
		console.log(util.inspect(games, false, 4, true));
});	
```

Where `games` is a JSON array of objects that look something like this:

```json
{ 
   "appID": "42910",
   "name": "Magicka",
   "logo": "http://media.steampowered.com/steamcommunity/public/images/apps/42910/8c59c674ef40f59c3bafde8ff0d59b7994c66477.jpg",
   "storeLink": "http://store.steampowered.com/app/42910",
   "hoursOnRecord": "1.1",
   "statsLink": "http://steamcommunity.com/profiles/12345678901234567/stats/Magicka",
   "globalStatsLink": "http://steamcommunity.com/stats/Magicka/achievements/"
} 
```

## Options

The default options look like this:

```javascript
var options = {
	timeout : 10000,
	retries : 10,
	strategy : {
	    "type": steam.STRATEGIES.EXPONENTIAL,
	    "initial":800,
	    "base":2,
	    "max":3200
	}
}
```

everything except `timeout` is documented in [Re](https://npmjs.org/package/re), (and get's passed to it).


