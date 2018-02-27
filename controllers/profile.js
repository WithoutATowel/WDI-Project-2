var express = require('express');
var db = require('../models');
var passport = require('../config/passport-config');
var request = require('request');
var isLoggedIn = require('../middleware/isLoggedIn');
var router = express.Router();

// GET /profile 
router.get('/', function(req, res) {
    db.user.findById(req.user.id).then(function(user) {
        res.render('profile/index', { user: user });
    });
});

// PUT /profile
router.put('/', function(req, res) {
    db.user.update({
        displayName: req.body.publicName
    }, {
        where: { id: req.user.id }
    }).then(function() {
        res.send("success!");
    });
});

// DELETE /profile
router.delete('/', function(req, res) {
    // Use async for this
    // Delete playlists_songs for owned playlists
    // Delete playlists
    // Delete users_playlists
    // Delete users_songs
    // Delete user
    res.send('User deleted');
});

module.exports = router;