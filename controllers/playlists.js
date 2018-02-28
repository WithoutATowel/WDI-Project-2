var express = require('express');
var db = require('../models');
var Sequelize = require('sequelize');
var config = require(__dirname + '/../config/config.json')['development'];
var sequelize = new Sequelize(config.database, config.username, config.password, config);
var passport = require('../config/passport-config');
var request = require('request');
var async = require('async');
var isLoggedIn = require('../middleware/isLoggedIn');
var router = express.Router();

var query = 'SELECT songs.id, songs.popularity, count(users_songs."userId") AS user_count FROM users_songs JOIN songs ON songs.id = users_songs."songId" JOIN artists ON songs."artistId" = artists.id WHERE users_songs."userId" IN ($USER1, $USER2) GROUP BY 1,2 HAVING count(users_songs."userId") > 1';

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
            res.render('playlists/index', { playlists: playlists});
        });
    });
});

// GET /playlists/new form for creating a new playlist
router.get('/new', isLoggedIn, function(req, res) {
    db.user.findAll().then(function(data) {
        res.render('playlists/new', { users: data });
    });
});

// POST /playlists/new receive form data and create a playlist
router.post('/', isLoggedIn, function(req, res) {
    var members = req.body.members;
    members = members.map((item) => parseInt(item));
    var localQuery = query.replace('$USER1', members[0]);
    localQuery = localQuery.replace('$USER2', members[1]);
    db.playlist.create({
        name: req.body.name
    }).then(function(playlist){
        db.users_playlists.create({
            userId: req.user.id,
            playlistId: playlist.id
        }).then(function() {
                sequelize.query(localQuery).then(function(results){
                    results[0].forEach(function(song) {
                        db.playlists_songs.create({
                            playlistId: playlist.id,
                            songId: song.id
                        });
                    });
                }).then(function() {
                    res.redirect('/playlists');
                });
            }
        );
    });
});

// GET /playlists/:id view a specific playlist
router.get('/:id', isLoggedIn, function(req, res) {
    db.playlist.find({
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
            res.render('playlists/show', { playlist: playlist, artists: artists });
        });
    });
});

// PUT /playlists/:id edit the name of a playlist
router.put('/:id', isLoggedIn, function(req, res) {
    res.redirect('/playlists' + req.params.id);
});

// POST /playlists/:id/spotify save a playlist to Spotify
router.post('/:id/spotify', isLoggedIn, function(req, res) {
    var userId = req.user.id;
    var userSpotifyId = req.user.spotifyId;
    var accessToken = req.user.accessToken;
    var playlistId = req.params.id;
    var spotifyPlaylistId = '';
    var result = '';

    function createPlaylist(callback) {
        if (result === "success") {
            // The playlist has already created successfully. Call the next function.
            console.log("~~~~SECOND TIME THROUGH createPlaylist! FIRST TIME WORKED!");
            callback();
        } else {
            console.log("~~~~TRYING TO CREATE PLAYLIST");
            // Prep options and create the playlist.
            db.playlist.findById(playlistId).then(function(playlist) {
                var newSpotifyPlaylist = {
                    name: playlist.name,
                    public: false 
                };
                var playlistCreateOptions = {
                    method: "POST",
                    url: "https://api.spotify.com/v1/users/" + userSpotifyId + "/playlists",
                    headers: { 'Authorization': 'Bearer ' + accessToken }, 
                    body: newSpotifyPlaylist,
                    json: true
                };
                request(playlistCreateOptions, function(error, response, body) {
                    console.log("~~~RESPONSE TO PLAYLIST CREATE");
                    console.log(body);
                    if(body.error && body.error.status === 401) {
                        // Creation failed. Pass message so that refreshCredentials() can do its thing.
                        result = "first playlist creation attempt failed";
                        callback();
                    } else {
                        // Playlist successfully created! Store the playlist's spotifyId in the database.
                        result = "success";
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

    function refreshCredentials(callback) {
        console.log("~~~~INSIDE OF refreshCredentials");
        if (result !== "first playlist creation attempt failed") {
            // Playlist was created. No need to refresh credentials.
            console.log("~~~~IT WORKED! NO NEED TO REFRESH CREDENTIALS");
            console.log("~~~~RESULT VARIABLE IS: " + result);
            callback();
        } else {
            // Playlist was not created. Refresh credentials and try again.
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
                    db.user.findById(userId).then(function(user) {
                        req.login(user, function(err) {
                            if (err) {
                                console.log("~~~FINISHED REFRESHING. LET'S CALLBACK!");
                                callback();
                            }
                        });
                    });
                });
            });
        }
    }
    
    function addSongsToPlaylist(callback) {
        console.log("~~~~MADE IT INTO addSongsToPlaylist()!");
        // Retrieve the playlists songs from the database and prepare to send them through to the Spotify API
        db.playlist.findOne({
            where: { id: playlistId },
            include: [db.song]
        }).then(function(playlist) {
            // Use async to delay sending songs to the Spotify API until they've been groomed to the proper format.
            var accumulator = '{ "uris": [';
            async.forEach(playlist.songs, function(song, next){
                // Format songs like "spotify:track:4iV5W9uYEdYUVa79Axb7Rh"
                accumulator += '"spotify:track:' + song.spotifyId + '", ';
                next();
            }, function(error, songs){
                // Prepare options and send API request to add songs to Spotify playlist
                var body = accumulator.slice(0, -2) + '] }';
                var songsToPlaylistOptions = {
                    method: 'POST',
                    url: 'https://api.spotify.com/v1/users/' + userSpotifyId + '/playlists/' + spotifyPlaylistId + '/tracks',
                    headers: {
                        'Authorization': 'Bearer ' + accessToken,
                        'Content-Type': 'application/json'
                    },
                    body: body
                };
                request(songsToPlaylistOptions, function(error, response, body) {
                    callback();
                });
            });
        }); 
    }     
    
    async.series([createPlaylist, refreshCredentials, createPlaylist, addSongsToPlaylist], function(err, results) {
      res.send('Done!');
    });  

}); 
        

// DELETE /playlists/:id delete a playlist
router.delete('/:id', isLoggedIn, function(req, res) {
    db.playlist.find({
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


// API endpoint tester
// var options = {
//     url: 'https://api.spotify.com/v1/me/tracks?limit=50',
//     headers: {
//         'Authorization': 'Bearer ' + req.user.accessToken
//     }
// };
// console.log(options);
// request(options, function(error, response, body) {
//     res.send(body);
// })


    