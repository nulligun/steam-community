var util = require('util'),
	request = require('request'),
	xml2js = require('xml2js'),
	Re = require('re');


var STEAM_PROFILE_USER_FORMAT = "http://steamcommunity.com/profiles/%s?xml=1",
	STEAM_PROFILE_GAME_FORMAT = "http://steamcommunity.com/profiles/%s/games?tab=all&xml=1",
	STEAM_PROFILE_FRIENDS_FORAMT = "http://steamcommunity.com/profiles/%s/friends?tab=all&xml=1";

var PRIVATE_STATUS_CODE = 403, // http status code to use for private profiles
	TIMEOUT_DEFAULT = 25600,
	STRAT_DEFAULT = {"type": Re.STRATEGIES.EXPONENTIAL, "initial":800, "base":2, "max":25600};

var parser = new xml2js.Parser();

function Client(options){
	if(!(this instanceof Client)) return new Client(options);

	options = options || {};

	this.timeout = (typeof options.timeout === "undefined") ? TIMEOUT_DEFAULT : options.timeout;
	if(typeof options.strategy === "undefined") options.strategy = STRAT_DEFAULT;

	this.options = options;
}



module.exports = Client;

Client.STRATEGIES = Re.STRATEGIES;

Client.prototype.user = function(steamID, callback){

	this.get(STEAM_PROFILE_USER_FORMAT, steamID, function(err, user, retries){
		if(err){ return callback(err, null, retries);}

		callback(err, user, retries);
	});
};

/* Get a list of games for the user with the specified 64bit Steam ID.
 * steamID: stringified 17 digit number that identies a user profile.
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

		if(!games) err = {"code":PRIVATE_STATUS_CODE, "message":"Missing games object. Profile is empty."};

		// return just the array of games
		callback(err, games, retries);

	});
};

/* return whether or not the profile is private
 */
function isPrivate(xml){
	// as of 2014-04-27 valid documents start with:
	/* <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
	 * <gamesList>
	 */
	// private profiles start with:
	/* <!DOCTYPE html>
		<html>
		<head>
	 */
	// this is our indicator that the profile is private
	// check to see if document starts with html DOCTYPE
	return (xml.trim().lastIndexOf("<!DOCTYPE html>", 0) === 0);
}

/* This does the work of both functions (user and games). It wraps a request
 * and parsing operation in an exponential backoff retry (re.try).
 */
Client.prototype.get = function(urlFormat, steamID, callback){

	var self = this;
	self.re = Re(this.options);


	var steamProfileGameURL = util.format(urlFormat, steamID),
		options = {
				uri : steamProfileGameURL,
				timeout : this.timeout
			};

	self.re.try(function(retryCount, done){
		var retryInterval = self.re.retryInterval(retryCount);


		if(retryInterval > options.timeout) options.timeout = retryInterval;

		request.get(options, function(err, response, xml){

			// if the request failed, report a failure
			if(err) return done(err, null, retryCount);
			if(response.statusCode == 503) return done(new Error("Service Unavailable"), null, retryCount);
			if(!xml) return done(new Error("Unknown Error, Empty XML."), null, retryCount);

			// convert Steam's ghetto private profile page into a RESTful status code
			if(isPrivate(xml)) return callback({"code":PRIVATE_STATUS_CODE, "message":"Profile is private."}, null, retryCount);


			parser.parseString(xml, function(err, result){
				done(err, result, retryCount);
			});
		});	
	}, callback);
};