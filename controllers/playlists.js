var express = require('express');
var router = express.Router();
var db = require('../models');
var passport = require('../config/passport-config');
var request = require('request');
var async = require('async');
var isLoggedIn = require('../middleware/is-logged-in');

var query = 'SELECT songs.id, ' + 
                'songs.popularity, ' +
                'count(users_songs."userId") AS user_count ' + 
            'FROM users_songs ' + 
            'JOIN songs ON songs.id = users_songs."songId" ' + 
            'WHERE users_songs."userId" IN ($USERS) ' + 
            'GROUP BY 1,2 ' + 
            'HAVING count(users_songs."userId") > 1';

// GET /playlists view all playlists 
router.get('/', isLoggedIn, function(req, res) {
    db.user.findOne({
        where: { id: req.user.id },
        include: [db.playlist]
    }).then(function(data) {
        // Use async to delay rendering the page until database lookups can
        // be performed to find the songs for each playlist
         async.map(data.playlists, function(playlist, next) {
            db.playlist.findOne({
                where: { id: playlist.dataValues.id},
                include: [db.song]
            }).then(function(playlist) {
                next(false, playlist);
            });
        }, function(error, playlists) {
            res.render('playlists/index', { playlists: playlists });
        });
    });
});

// GET /playlists/new form for creating a new playlist
router.get('/new', isLoggedIn, function(req, res) {
    db.user.findAll().then(function(data) {
        res.render('playlists/new', { users: data });
    });
});

// POST /playlists receive form data and create a playlist
router.post('/', isLoggedIn, function(req, res) {
    var members = '';
    req.body.members.forEach((item) => members += item + ',');
    members = members.slice(0,-1);
    var localQuery = query.replace('$USERS', members);
    // Create playlist object
    db.playlist.create({
        name: req.body.name
    }).then(function(playlist){
        // Associate the playlist with the user
        db.users_playlists.create({
            userId: req.user.id,
            playlistId: playlist.id
        }).then(function() {
                // Find songs that all included users like using the query defined earlier, 
                // and associate songs with the playlist
                db.sequelize.query(localQuery).then(function(results){
                    results[0].forEach(function(song) {
                        db.playlists_songs.create({
                            playlistId: playlist.id,
                            songId: song.id
                        });
                    });
                }).then(function() {
                    // This is a POST route, so update the method before redirecting
                    req.method = 'GET';
                    res.redirect('/playlists/' + playlist.id);
                });
            }
        );
    });
});

// GET /playlists/:id view a specific playlist
router.get('/:id', isLoggedIn, function(req, res) {
    db.playlist.findOne({
        where: { id: req.params.id },
        include: [db.song]
    }).then(function(playlist) {
        // Use async to delay rendering the page until we can look up the artists
        async.map(playlist.songs, function(song, next){
            db.artist.findOne({
                where: { id: song.artistId }
            }).then(function(artist) {
                next(false, artist);
            });
        }, function(error, artists){
            res.render('playlists/show', { playlist: playlist, artists: artists, user: req.user });
        });
    });
});

// POST /playlists/:id/spotify save a playlist to Spotify
router.post('/:id/spotify', isLoggedIn, function(req, res) {
    var userId = req.user.id;
    var userSpotifyId = req.user.spotifyId;
    var accessToken = req.user.accessToken;
    var playlistId = req.params.id;
    var spotifyPlaylistId = '';
    var result = '';

    // This function attempts to create a playlist, then fires a callback (to async) so the next task can 
    // be handled. This function will be called a second time to account for cases where the user's Spotify access token
    // has expired and the first playlist creation attempt failed. Hence it checks the "result" variable before proceeding.
    function createPlaylist(callback) {
        if (result === 'success') {
            // The playlist has already created successfully. Call the next function.
            callback();
        } else {
            // Prep options and create the playlist.
            db.playlist.findByPk(playlistId).then(function(playlist) {
                var newSpotifyPlaylist = {
                    name: playlist.name,
                    public: false 
                };
                var playlistCreateOptions = {
                    method: 'POST',
                    url: 'https://api.spotify.com/v1/users/' + userSpotifyId + '/playlists',
                    headers: { 'Authorization': 'Bearer ' + accessToken }, 
                    body: newSpotifyPlaylist,
                    json: true
                };
                request(playlistCreateOptions, function(error, response, body) {
                    if(body.error && body.error.status === 401) {
                        // Creation failed. Pass message so that refreshCredentials() can do its thing.
                        result = 'first playlist creation attempt failed';
                        callback();
                    } else {
                        // Playlist successfully created! Store the playlist's spotifyId in the database.
                        result = 'success';
                        spotifyPlaylistId = body.id;
                        db.playlist.update({
                            spotifyId: spotifyPlaylistId
                        },{
                            where: { id: playlistId }
                        });
                        // This gets called on first execution if successful, or second execution.
                        callback(); 
                    }
                });
            });
        }
    }

    // If playlist creation failed, we need to refresh the user's credentials. This gets called after the first
    // playlist creation attempt, and only refreshes credentials if the attempt failed.
    function refreshCredentials(callback) {
        if (result !== 'first playlist creation attempt failed') {
            // Playlist was created. No need to refresh credentials.
            callback();
        } else {
            // Playlist was not created. Refresh credentials and fire callback to try again.
            var userAuth = 'grant_type=refresh_token&refresh_token=' + req.user.refreshToken;
            var appAuth = Buffer.from(process.env.CLIENT_ID + ':' + process.env.CLIENT_SECRET).toString('base64');
            var authRefreshOptions = {
                method: 'POST',
                url: 'https://accounts.spotify.com/api/token',
                headers: { 
                    'Authorization': 'Basic ' + appAuth,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: userAuth
            };
            request(authRefreshOptions, function(error, response, body) {
                var newAccessData = JSON.parse(body);
                accessToken = newAccessData.access_token;
                db.user.update({
                    accessToken: accessToken
                }, {
                    where: { id: userId }
                }).then(function(data) {
                    db.user.findByPk(userId).then(function(user) {
                        req.login(user, function(err) {
                            callback();
                        });
                    });
                });
            });
        }
    }
    
    // Playlist has now been created in the user's Spotify account. This function adds the relevant songs
    // to that playlist.
    function addSongsToPlaylist(callback) {
        // Retrieve the playlist's songs from the database and prepare to send them through to the Spotify API
        db.playlist.findOne({
            where: { id: playlistId },
            include: [db.song]
        }).then(function(playlist) {
            // Groom songs to the proper format and send to Spotify via the API.
            // Spotify only accepts groups of 100 songs at max, so string formatting and API calls are different
            // depending on whether or not the songs need to be grouped or can be sent with a single call.
            var songs = playlist.songs.map((song) => song.spotifyId);
            var songGroups = [];
            var grouped = false;
            if (songs.length > 100) {
                grouped = true;
                // Split song list into groups of 100
                for (var i = 0; i < Math.ceil(songs.length / 100); i++) {
                    songGroups[i] = songs.slice(i * 100, ((i + 1) * 100));
                }
            }
            // Prepare options and send API request to add songs to Spotify playlist
            var songsToPlaylistOptions = {
                method: 'POST',
                url: 'https://api.spotify.com/v1/users/' + userSpotifyId + '/playlists/' + spotifyPlaylistId + '/tracks',
                headers: {
                    'Authorization': 'Bearer ' + accessToken,
                    'Content-Type': 'application/json'
                },
                body: ''
            };
            // Next steps depend on whether or not we've had to group the songs into batches
            if (grouped) {
                // Format song groups like '{ "uris": ["spotify:track:4iV5W9uYEdYUVa79Axb7Rh"]}'
                for (var j = 0; j < songGroups.length; j++) {
                    songGroups[j] = '{ "uris": ["spotify:track:' + songGroups[j].join('", "spotify:track:') + '"] }';
                }
                // I only want to fire the callback (for the async.series call below) after all the API calls have been executed,
                // so use an async.forEach to hold off on that until ready.
                async.forEach(songGroups, function(group, cb) {
                    songsToPlaylistOptions.body = group;
                    request(songsToPlaylistOptions, function(error, response, body) {
                        cb();
                    });
                }, function() {
                    callback();
                });  
            } else {
                // Format song list like '{ "uris": ["spotify:track:4iV5W9uYEdYUVa79Axb7Rh"]}'
                songs = '{ "uris": ["spotify:track:' + songs.join('", "spotify:track:') + '"] }';
                songsToPlaylistOptions.body = songs;
                request(songsToPlaylistOptions, function(error, response, body) {
                    callback();
                });
            }
        }); 
    }     
    
    // Try to create a playlist. If failed, refresh credentials and try again. Then add songs to playlist.
    async.series([createPlaylist, refreshCredentials, createPlaylist, addSongsToPlaylist], function(err, results) {
        req.flash('success', 'Playlist exported to Spotify!');
        res.send('success');
    });  

});   

// DELETE /playlists/:id delete a playlist
router.delete('/:id', isLoggedIn, function(req, res) {
    db.playlist.findOne({
        where: { id: req.params.id },
        include: [db.user]
    }).then(function(playlist) {
        // Loop through and delete entries in join table
        async.forEach(playlist.users, function(user, callback){
            // This is a helper function built into Sequelize for managing join tables
            playlist.removeUser(user);
            callback(); // NEED TO ADD ANOTHER FOREACH LOOP HERE TO REMOVE SONG ASSOCIATIONS
        }, function(){
            // Function that executres when all callbacks have returned
            db.playlist.destroy({
                where: { id: req.params.id }
            }).then(function(deletedPlaylist) {
                res.send('Playlist deleted');
            });
        });
    });
});

module.exports = router;


    