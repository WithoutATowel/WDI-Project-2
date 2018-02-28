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

// GET /profile 
router.get('/', isLoggedIn, function(req, res) {
    res.render('profile/index', { user: req.user });
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
            sequelize.query(query).then(function(results) {
                callback();
            });
        }, function(callback) {
            // Delete the playlists themselves
            var query = 'DELETE FROM playlists ' +
                        'WHERE id in (' + 
                          'SELECT "playlistId" ' + 
                          'FROM users_playlists ' + 
                          'WHERE "userId" = ' + userId + ');';
            sequelize.query(query).then(function(results) {
                callback();
            });
        }, function(callback) {
            // Delete users_playlists
            var query = 'DELETE FROM users_playlists ' + 
                        'WHERE "userId" = ' + userId + ';';
            sequelize.query(query).then(function(results) {
                callback();
            });
        }, function(callback) {
            // Delete records from users_songs
            var query = 'DELETE FROM users_songs ' + 
                        'WHERE "userId" = ' + userId + ';';
            sequelize.query(query).then(function(results) {
                callback();
            });
        }, function(callback) {
            // Delete user
            var query = 'DELETE FROM users ' + 
                        'WHERE id = ' + userId + ';';
            sequelize.query(query).then(function(results) {
                callback();
            });
        }], function(err, results) {
            res.send('Profile deleted.');
        }
    );
});

module.exports = router;