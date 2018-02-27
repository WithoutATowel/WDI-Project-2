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
        res.render('playlists/index', { playlists: data.playlists});
    });
});

// GET /playlists/new form for creating a new playlist
router.get('/new', function(req, res) {
    db.user.findAll().then(function(data) {
        res.render('playlists/new', { users: data });
    });
});

// POST /playlists/new receive form data and create a playlist
router.post('/', function(req, res) {
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
router.get('/:id', function(req, res) {
    db.playlist.find({
        where: { id: req.params.id },
        include: [db.song]
    }).then(function(playlist) {
        res.render('playlists/show', { playlist: playlist });
    });
});

// PUT /playlists/:id edit the name of a playlist
router.put('/:id', function(req, res) {
    res.redirect('/playlists' + req.params.id);
});

// GET /playlists/:id/spotify save a playlist to Spotify
router.get('/:id/spotify', function(req, res) {
    // Call the spotify API to create the playlist under the user's account
    console.log('Hit the /:id/spotify route');
    res.send('success');
});

// DELETE /playlists/:id delete a playlist
router.delete('/:id', function(req, res) {
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


    