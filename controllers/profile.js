var express = require('express');
var db = require('../models');
var passport = require('../config/passport-config');
var request = require('request');
var async = require('async');
var isLoggedIn = require('../middleware/is-logged-in');
var router = express.Router();


function storeTracks(array, user) {
    return new Promise(function(resolve, reject) {  
        async.each(array, function(track, callback){
            // Generalize function to handle return values from different spotify calls
            if (!track.artists) {
                track = track.track;
            }
            // Make sure the song has a Spotify ID. If not, go on to the next.
            if (track.id) {
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
                        }).then(function() {
                            callback();
                        });
                    });
                });
            } else {
                callback();
            }
        }, function() {
            resolve('Stuff worked!');
        });
    });
}

// GET /fake
router.get('/fake', function(req, res) {
    res.render('profile/loading');
});

// GET /profile 
router.get('/', isLoggedIn, function(req, res) {
    res.render('profile/index', { user: req.user });
});

// GET /download
router.get('/download', isLoggedIn, function(req,res) {
    res.render('profile/loading');
    var user = req.user;
    var options = {
        url: 'https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=long_term',
        headers: {
            'Authorization': 'Bearer ' + user.accessToken
        }
    };
    async.waterfall(
        [
            function(callback) {
                // Get and store favorite songs from the past several years
                request(options, function(error,response,body) {
                    var topTracks = JSON.parse(body);
                    storeTracks(topTracks.items, user).then(function(){
                        callback();
                    });
                });
            }, function(callback) {
                // Get and store favorite songs from the past 6 months
                options.url = 'https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=medium_term';
                request(options, function(error,response,body) {
                    var topTracks = JSON.parse(body);
                    storeTracks(topTracks.items, user).then(function(){
                        callback();
                    });   
                });  
            }, function(callback) {
                // Get and store favorite songs from the past 4 weeks
                options.url = 'https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=short_term';
                request(options, function(error,response,body) {
                    var topTracks = JSON.parse(body);
                    storeTracks(topTracks.items, user).then(function(){
                        callback();
                    });   
                });
            }, function(callback) {
                // Get ALL saved songs. Max 50 per request, so loop through songs using async.
                options.url = 'https://api.spotify.com/v1/me/tracks?limit=50';
                var moreToDownload = true;
                async.whilst(function() {
                        return moreToDownload;
                    }, function(cb) {
                        request(options, function(error,response,body) {
                            var topTracks = JSON.parse(body);
                            storeTracks(topTracks.items, user, true).then(function() {
                                moreToDownload = (topTracks.next === null) ? false : true; 
                                options.url = moreToDownload ? topTracks.next : null;
                                cb();
                            });   
                        });
                    }, function(err, n) {
                        callback();
                    }
                );
            }, function(callback) {
                // Get URLs for all of a user's playlists. Max 50 per request and user may have more, 
                // so we're going to need a loop. And a bigger boat.
                options.url = 'https://api.spotify.com/v1/me/playlists';
                var moreToDownload = true;
                var playlistUris = [];
                async.whilst(function() {
                        return moreToDownload;
                    }, function(cb) {
                        request(options, function(error,response,body) {
                            var results = JSON.parse(body);
                            playlistUris = playlistUris.concat(results.items.map((aPlaylist) => aPlaylist.tracks.href));
                            moreToDownload = (results.next === null) ? false : true; 
                            options.url = moreToDownload ? results.next : null;
                            cb(); // next iteration of whilst loop  
                        });
                    }, function(err, n) {
                        callback(null, playlistUris); // finishes waterfall item
                    }
                );
            }, function(playlistUris, callback) {
                // Download and store songs from each of the user's playlists. So. We're going to start by 
                // looping through the playlistUri array... BUT each playlist can have more than 50 songs,
                // So we're going to need a nested loop. FML.
                var count = 0;
                async.whilst(function() {
                        return (count < (playlistUris.length - 1));
                    }, function(cb) {
                        options.url = playlistUris[count];
                        // We now have the URI for a single playlist. Download playlist's songs, looping 
                        // as necessary.
                        var moreToDownload = true;
                        async.whilst(function() {
                                return moreToDownload;
                            }, function(callB) {
                                request(options, function(error,response,body) {
                                    var trackList = JSON.parse(body);
                                    storeTracks(trackList.items, user, true).then(function() {
                                        moreToDownload = (trackList.next === null) ? false : true; 
                                        options.url = moreToDownload ? trackList.next : null;
                                        callB(); // next iteration of inner whilst
                                    });
                                });
                            }, function() {
                                count++;
                                cb(); // next iteration of outer whilst... next playlist
                            }
                        );
                    }, function(err, n) {
                        callback(); // finishes waterfall item
                    }
                );
            }
        ], function(err, results) {
            db.user.update({
                songDataDownloaded: true
            }, {
                where: { id: user.id }
            });
        }
    );
});

// GET /profile/ready
router.get('/ready', isLoggedIn, function(req, res) {
    db.user.findById(req.user.id).then(function(user) {
        if (user.songDataDownloaded) {
            res.send('Download complete');
        } else {
            res.send('Naw dawg');
        }
    });
});

// GET /profile/welcome
router.get('/welcome', isLoggedIn, function(req, res) {
    res.render('profile/welcome', { user: req.user });
});

// PUT /profile
router.put('/', isLoggedIn, function(req, res) {
    db.user.update({
        displayName: req.body.publicName
    }, {
        where: { id: req.user.id }
    }).then(function(data) {
        db.user.findById(req.user.id).then(function(user) {
            req.login(user, function(err) {
                if (err) {
                    console.log(err);
                }
            });
            req.flash('success', 'Public name updated');
            res.send('success');
        });
    });
});

// DELETE /profile
router.delete('/', isLoggedIn, function(req, res) {
    var userId = req.user.id;
    async.series([
        function(callback) {
            // Delete records from playlists_songs for owned playlists
            var query = 'DELETE FROM playlists_songs ' +
                        'WHERE "playlistId" in (' + 
                          'SELECT "playlistId" ' + 
                          'FROM users_playlists ' + 
                          'WHERE "userId" = ' + userId + ');';
            db.sequelize.query(query).then(function(results) {
                callback();
            });
        }, function(callback) {
            // Delete the playlists themselves
            var query = 'DELETE FROM playlists ' +
                        'WHERE id in (' + 
                          'SELECT "playlistId" ' + 
                          'FROM users_playlists ' + 
                          'WHERE "userId" = ' + userId + ');';
            db.sequelize.query(query).then(function(results) {
                callback();
            });
        }, function(callback) {
            // Delete records from users_playlists
            var query = 'DELETE FROM users_playlists ' + 
                        'WHERE "userId" = ' + userId + ';';
            db.sequelize.query(query).then(function(results) {
                callback();
            });
        }, function(callback) {
            // Delete records from users_songs
            var query = 'DELETE FROM users_songs ' + 
                        'WHERE "userId" = ' + userId + ';';
            db.sequelize.query(query).then(function(results) {
                callback();
            });
        }, function(callback) {
            // Delete user
            var query = 'DELETE FROM users ' + 
                        'WHERE id = ' + userId + ';';
            db.sequelize.query(query).then(function(results) {
                callback();
            });
        }], function(err, results) {
            res.send('Profile deleted.');
        }
    );
});

module.exports = router;