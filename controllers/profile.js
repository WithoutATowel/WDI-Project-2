var express = require('express');
var db = require('../models');
var passport = require('../config/passport-config');
var request = require('request');
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
            // ADD FLASH MESSAGE HERE
            res.send("success!");
        });
    });
});

// DELETE /profile
router.delete('/', isLoggedIn, function(req, res) {
    // Use async for this
    // Delete playlists_songs for owned playlists
    // Delete playlists
    // Delete users_playlists
    // Delete users_songs
    // Delete user
    res.send('User deleted');
});

module.exports = router;