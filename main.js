var util = require('util'),
	fs = require('fs'),
	request = require('request'),
	xml2js = require('xml2js'),
	Re = require('re');


var STEAM_PROFILE_USER_FORMAT = "http://steamcommunity.com/profiles/%s?xml=1",
	STEAM_PROFILE_GAME_FORMAT = "http://steamcommunity.com/profiles/%s/games?tab=all&xml=1&l=english",
	STEAM_PROFILE_FRIENDS_FORAMT = "http://steamcommunity.com/profiles/%s/friends?tab=all&xml=1";

var TIMEOUT_DEFAULT = 10000,
	STRAT_DEFAULT = {"type": Re.STRATEGIES.EXPONENTIAL, "initial":800, "base":2, "max":3200};

var parser = new xml2js.Parser();

exports.STRATEGIES = Re.STRATEGIES;

exports.createClient = function(options){
	return new Client(options);
};

function Client(options){
	if(!(this instanceof Client)) return Client(options);

	options = options || {};

	this.timeout = (typeof options.timeout === "undefined") ? TIMEOUT_DEFAULT : options.timeout;
	if(typeof options.strategy === "undefined") options.strategy = STRAT_DEFAULT;

	this.options = options;
}

Client.prototype.user = function(steamID, callback){

	this.get(STEAM_PROFILE_USER_FORMAT, steamID, function(err, user, retries){
		if(err){ return callback(err, null, retries);}

		callback(err, user, retries);
	});
};

/* Get a list of games for the user with the specified steamID (string)
 *
 * callback: function(err, (Array) gameList)
 * 
 * each object in the list looks something like this:
 *
    { appID: '42910',
       name: 'Magicka',
       logo: 'http://media.steampowered.com/steamcommunity/public/images/apps/42910/8c59c674ef40f59c3bafde8ff0d59b7994c66477.jpg',
       storeLink: 'http://store.steampowered.com/app/42910',
       hoursOnRecord: '1.1',
       statsLink: 'http://steamcommunity.com/profiles/76561198001963676/stats/Magicka',
       globalStatsLink: 'http://steamcommunity.com/stats/Magicka/achievements/' } 
 */
Client.prototype.games = function(steamID, callback){

	this.get(STEAM_PROFILE_GAME_FORMAT, steamID, function(err, result, retries){

		var games;

		if(err){ return callback(err, null, retries);}

		games = (result.games && result.games.game) ? result.games.game : null;

		if(!games) err = new Error("Missing games object. Profile is likely private.");

		// return just the array of games
		callback(err, games, retries);

	});
};

/* This does the work of both functions (user and games). It wraps a request
 * and parsing operation in an exponential backoff retry (re.try).
 */
Client.prototype.get = function(urlFormat, steamID, callback){

	this.re = Re(this.options);

	var steamProfileGameURL = util.format(urlFormat, steamID),
		options = {
				uri : steamProfileGameURL,
				timeout : this.timeout
			};

	this.re.try(function(retryCount, done){
		request.get(options, function(err, response, xml){

			// TODO: check if we got a 503 response before trying to parse
			// if the request failed, report a failure
			if(err) return done(err, null, retryCount);

			parser.parseString(xml, function(err, result){
				done(err, result, retryCount);
			});
		});	
	}, callback);
};