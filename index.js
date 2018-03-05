// LOAD MODULES AND CREATE APP
require('dotenv').config();
var flash = require('connect-flash');
var express = require('express');
var bodyParser = require('body-parser');
var session = require('express-session');
var passport = require('./config/passport-config');
var isLoggedIn = require('./middleware/is-logged-in');
var app = express();


// CONFIGURE APP WITH MIDDLEWARE
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public/'));
app.use(require('morgan')('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));
app.use(flash());
app.use(passport.initialize()); // This has to come after the session configuration
app.use(passport.session());
app.use(function(req, res, next) {  // Before every route, attach the flash messages and current user to res.locals
  res.locals.alerts = req.flash();
  res.locals.currentUser = req.user;
  next();
});

// SET TOP LEVEL ROUTES, LOAD CONTROLLERS
app.get('/', function(req, res) {
  res.render('index');
});
app.use('/auth', require('./controllers/auth'));
app.use('/profile', require('./controllers/profile'));
app.use('/playlists', require('./controllers/playlists'));


// START + EXPORT SERVER
var server = app.listen(process.env.PORT || 3000);
module.exports = server;
