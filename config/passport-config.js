var passport = require('passport');
var SpotifyStrategy = require('passport-spotify').Strategy;
var db = require('../models');
var async = require('async');
var request = require('request');

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

//http://localhost:3000

passport.use(new SpotifyStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "/auth/spotify/callback"
    },
    function (accessToken, refreshToken, expires_in, profile, done) {
        var name = profile.displayName;
        var email = profile.emails[0].value;
        db.user.findOrCreate({
            where: { spotifyId: profile.id },
            defaults: {
                name: name,
                email: email,
                displayName: 'placeholder',
                accessToken: accessToken,
                refreshToken: refreshToken,
                songDataDownloaded: false
            }
        }).spread(function(user, created) {
            if (created) {
                user.isNew = true;
                // Call the wordnik API to get two random words for the user's display name
                request('http://api.wordnik.com:80/v4/words.json/randomWords?hasDictionaryDef=false&minCorpusCount=0&maxCorpusCount=-1&minDictionaryCount=1&maxDictionaryCount=-1&minLength=5&maxLength=-1&limit=2&api_key=a2a73e7b926c924fad7001ca3111acd55af2ffabf50eb4ae5',
                    function(error, response, body) {
                        if (!error && response.statusCode == 200) {
                            // If the API call succeeded, format the words and insert into the user's displayName field
                            words = JSON.parse(body);
                            displayName = words[0].word + '-' + words[1].word
                            displayName = displayName.replace(/\s/g, '-');
                            db.user.update({
                                displayName: displayName
                            }, {
                                where: { id: user.id }
                            }).then(function() {
                                user.displayName = displayName;
                                return done(null, user); 
                            });
                        }
                    }
                );
            } else {
                return done(null, user);
            }
        });
    }
));

module.exports = passport;















