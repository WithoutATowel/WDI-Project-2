var passport = require('passport');
var SpotifyStrategy = require('passport-spotify').Strategy;
var db = require('../models');
var request = require('request');

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

function storeTracks(array, user) {
    array.forEach(function(track){
        // Generalize function to handle return values from different spotify calls
        if (!track.artists) {
            track = track.track;
        }
        // If not already present, store each artist in the database
        db.artist.findOrCreate({
            where: { spotifyId: track.artists[0].id},
            defaults: {
                name: track.artists[0].name,
                popularity: 0 
            }
        }).spread(function(artist, created) {
            // If not already present, store each song in the database
            db.song.findOrCreate({
                where: { spotifyId: track.id},
                defaults: {
                    artistId: artist.id,
                    name: track.name,
                    popularity: track.popularity,
                    previewUrl: track.preview_url
                }
            }).spread(function(song, created) {
                // Associate the song with the user
                db.users_songs.findOrCreate({
                    where: { userId: user.id, songId: song.id}
                });
            });
        });
    });
}


passport.use(new SpotifyStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/spotify/callback"
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
                refreshToken: refreshToken
            }
        }).spread(function(user, created) {
            if (created) {
                // NEED TO FLATTEN THIS WHOLE THING OUT WITH ASYNC
                request('http://api.wordnik.com:80/v4/words.json/randomWords?hasDictionaryDef=false&minCorpusCount=0&maxCorpusCount=-1&minDictionaryCount=1&maxDictionaryCount=-1&minLength=5&maxLength=-1&limit=2&api_key=a2a73e7b926c924fad7001ca3111acd55af2ffabf50eb4ae5',
                    function(error, response, body) {
                        if (!error && response.statusCode == 200) {
                            words = JSON.parse(body);
                            displayName = words[0].word + '-' + words[1].word
                            displayName = displayName.replace(/\s/g, '-');
                            db.user.update({
                                displayName: displayName
                            }, {
                                where: { id: user.id }
                            }).then(function() {
                                // Call the spotify API to find the users favorite songs
                                var options = {
                                  url: 'https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=long_term',
                                  headers: {
                                    'Authorization': 'Bearer ' + user.accessToken
                                  }
                                };
                                // Get favorite songs from the past several years
                                request(options, function(error,response,body) {
                                    var topTracks = JSON.parse(body);
                                    storeTracks(topTracks.items, user);
                                });
                                // Get favorite songs from the past 6 months
                                options.url = 'https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=medium_term'
                                request(options, function(error,response,body) {
                                    var topTracks = JSON.parse(body);
                                    storeTracks(topTracks.items, user);   
                                });
                                // Get favorite songs from the past 4 weeks
                                options.url = 'https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=short_term'
                                request(options, function(error,response,body) {
                                    var topTracks = JSON.parse(body);
                                    storeTracks(topTracks.items, user);   
                                });
                                // Get most recent saved songs (max 50)
                                options.url = 'https://api.spotify.com/v1/me/tracks?limit=50'
                                request(options, function(error,response,body) {
                                    var topTracks = JSON.parse(body);
                                    storeTracks(topTracks.items, user);   
                                });
                                return done(null, user);
                            })
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















