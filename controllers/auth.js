var express = require('express');
var router = express.Router();
var db = require('../models');
var passport = require('../config/passport-config');
var isLoggedIn = require('../middleware/is-logged-in');


// Initial call to Spotify, handled by passport
router.get('/spotify',
    passport.authenticate('spotify', {
        scope: ['user-read-email', 'user-read-private', 'user-top-read', 'user-read-recently-played', 'user-library-read', 'playlist-read-private', 'playlist-read-collaborative', 'playlist-modify-private'], 
        showDialog: false 
    }),
    function(req, res) {
        // ...
});

// Callback function for Spotify to redirect to
router.get('/spotify/callback',
    passport.authenticate('spotify', { failureRedirect: '/' }),
    function(req, res) {
        // Successful authentication, redirect to 'download' route to retrieve song data for new users,
        // or to the playlist page for returning users.
        if(req.user.isNew) {
            res.redirect('/profile/download');
        } else {
            req.flash('success', 'Login successful');
            res.redirect('/playlists');
        }
});

// Logout route
router.get('/logout', isLoggedIn, function(req, res) {
    req.logOut();
    req.flash('success', 'You have logged out');
    res.render('index', { logout: true });
});

module.exports = router;
