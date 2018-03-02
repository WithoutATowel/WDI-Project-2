var express = require('express');
var db = require('../models');
var passport = require('../config/passport-config');
var request = require('request');
var isLoggedIn = require('../middleware/isLoggedIn');
var router = express.Router();

// Initial call to Spotify, handled by passport
router.get('/spotify',
  passport.authenticate('spotify', {
    scope: ['user-read-email', 'user-read-private', 'user-top-read', 'user-read-recently-played', 'user-library-read', 'playlist-read-private', 'playlist-read-collaborative', 'playlist-modify-private'], 
    showDialog: false 
  }),
  function(req, res){
    // ...
});

// Callback function for Spotify to redirect to
router.get('/spotify/callback',
  passport.authenticate('spotify', { failureRedirect: '/' }),
  function(req, res) {
    // Successful authentication, redirect home.
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








// function + var for old code
// var generateRandomString = function(length) {
//   var text = '';
//   var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
//   for (var i = 0; i < length; i++) {
//   text += possible.charAt(Math.floor(Math.random() * possible.length));
//   }
//   return text;
// };

// var client_secret = '5195005cad1943a9b7f6f3e09a3f2e8c'; // Your secret

// Old /login 
// // Generate a random 16 character alphanumeric string as the "state" value
// var state = generateRandomString(16);
// // Store the random "state" in a cookie, 'spotify_auth_state'
// res.cookie('spotify_auth_state', state); 
// // Set a redirect to request authorization from Spotify
// var url = 'https://accounts.spotify.com/authorize?' +
// querystring.stringify({
//   response_type: 'code',
//   client_id: '8988a8e433564117b7501ca6eb954233',
//   scope: 'user-read-private user-read-email',
//   redirect_uri: 'http://localhost:3000/auth/callback',
//   state: state
// });
// res.redirect(url);


// Old /spotify/callback code
// function(req, res) {
//  var access_token;
//  var refresh_token;
//  var authCode = req.query.code || null; // This is the authorization code sent back by Spotify
//  var state = req.query.state || null; // Spotify also passes back the 16 character random 'state' string
//  var storedState = req.cookies ? req.cookies.spotify_auth_state : null;
//  var redirect_uri = 'http://localhost:3000/auth/callback';
//  var client_id = '8988a8e433564117b7501ca6eb954233';

//  // Make sure the authorization code we got back is for this specific user by confirming that the "state" code
//  // Spotify passes back matches the state value we stored in the 'spotify_auth_state' cookie
//  if (state !== null && state === storedState) { 
//        // Now that we've confirmed that the authorization code is for the right user, clear the state cookie 
//    res.clearCookie('spotify_auth_state');

//     // Give Spotify: (1) authorization code, (2) client_id, (3) client_secret. Get back 'access_token' + 'refresh_token'.
//     var authOptions = {
//       url: 'https://accounts.spotify.com/api/token',
//       form: {
//         code: authCode,
//         redirect_uri: redirect_uri,
//         grant_type: 'authorization_code'
//       },
//       headers: {
//         'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
//       },
//       json: true
//     };
//     request.post(authOptions, function(error, response, body) {
//       if (!error && response.statusCode === 200) {
//         access_token = body.access_token;
//         refresh_token = body.refresh_token;

//         // Call for user information, setting 'Authorization' header with the access token
//         var options = {
//           url: 'https://api.spotify.com/v1/me',
//           headers: { 'Authorization': 'Bearer ' + access_token },
//           json: true
//         };
//         request.get(options, function(error, response, body) {
//           db.user.findOrCreate({
//             where: { email: body.email },
//             default: {
//               name: body.display_name,
//               password: 'password'
//             }
//           }).then(function() {
//           });
//       });

//       } else {
//         console.log(error);
//         res.redirect('/#' +
//           querystring.stringify({
//             error: 'invalid_token'
//           })
//         );
//       }
//     });

//   } else {
//     res.redirect('/#' +
//       querystring.stringify({
//       error: 'state_mismatch'
//     }));
//   }
// });



// We can also pass the access_token to the browser to make requests from there.
// And might as well send the refresh_token along with it.
// res.redirect('/#' +
//   querystring.stringify({
//   access_token: access_token,
//   refresh_token: refresh_token
//   }));

// How to use the refresh_token to get a new access_token
// $.ajax({
//     url: '/refresh_token',
//     data: {
//       'refresh_token': refresh_token
//     }
//   }).done(function(data) {
//     access_token = data.access_token;
//     oauthPlaceholder.innerHTML = oauthTemplate({
//       access_token: access_token,
//       refresh_token: refresh_token
//     });
//   });
