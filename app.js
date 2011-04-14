
/**
 * Module dependencies.
 */

var fs = require('fs');
eval(fs.readFileSync('./config.js', 'ascii'));

var express = require('express');
var connect = require('connect');
var RedisStore = require('connect-redis');

var models = require('./models');
var auth = require('./lib/auth');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');

  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.methodOverride());
  app.use(express.session({store:new RedisStore(), secret: settings.secret}));

  // serve css and js
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes

app.get('/login', function getLogin(req, res) {
  res.render('login')
});

app.post('/login', function postLogin(req, res) {
  return auth.authenticateUser(req.body.username, req.body.password, function userAuthd(err, user) {
    if (user) {
      req.session.regenerate(function regenerateSession() {
        req.session.cookie.maxAge = 100 * 24 * 24 * 60 * 60 * 1000;
        req.session.cookie.httpOnly = false;
        req.session.user = user;
        res.redirect('/');
      });

    } else if (err) { 
      return res.render('login');

    } else {
      req.session.error('Computer says no');
      return res.redirect('back');
    }
  });
});

function loginRequired(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        req.session.error = 'Computer says no';
        res.redirect('/login');
    }
}

//app.get('/*.(js|css)', function renderJsCss (req, res) {
//    // security?  ../../.. check?
//    res.sendfile('./public'+req.url);
//});

app.get('/wish', loginRequired, function getRoot(req, res) {
  res.render('wish', {
    locals: {
      username: req.session.user
    }
  });
});

app.post('/wish', loginRequired, function postWish(req, res) {
  var wish = new models.Wish(req.body);
  return wish.save(function(err) {
    console.log("new " + wish);
    if (err) {
      console.error(err);
      res.redirect('/wish');
    } else {
      console.log('vote now!');
      res.redirect('/vote/'+wish._id);
    }
  });
});

app.get('/', function(req, res) {
  res.redirect('wish');
});


app.get('/signup', function getSignup(req, res) {
  res.render('signup');
});

app.post('/signup', function postSignup(req, res) {
  var b = req.body;
  // create new if user doesn't exist
  auth.createNewUserAccount(b.username, b.password1, b.password2, b.email, function(err, user) {
    if (err) {
      req.session.error = err;
      return res.redirect('/signup');
    }

    else if ( !user ) {
      return res.redirect('/signup');
    } 

    else {
      console.log("ok, moving on");
      return res.redirect('/login');
    }
  });
});

app.get('/forgot', function(req, res) {
  res.render('forgot', {
    locals:
        {username: req.session.user.username}
  });    
});

app.post('/forgot', function sendReminder(req, res) {
  var b = req.body;
  auth.sendPasswordReminder(b.username, function(err) {
    if (err) {
      req.session.error = err;
      return res.redirect('/forgot');
    } else {
      return res.redirect('/reminded');
    }
  });
});

app.get('/password', function getPassword(req, res) {
  res.render('password', {
    locals:
        {username: req.session.user.username}
  });
});

app.get('/password/:secretSauce', function getPassword(req, res) {
});

app.post('/password', function postPassword(req, res) {
  var b = req.body;
  auth.changePassword(b.username, b.oldPassword, b.password1, b.password2, function(err, user) {
    if ( err ) {
      req.session.error = 'Computer says no.';
      res.redirect('back');
    } else {
      res.render('wish', {message: "Password changed"});
    }
  });
});

app.get('/logout', function getLogout(req, res) {
  req.session.destroy(function destroySession() {
    res.redirect('home');
  });
});

app.get('/wish/random.:format', function getWishes(req, res) {
  var format = req.params.format
  models.Wish.findRandom(null, function(err, wish) {
    console.log('got wish: '  + wish);
    switch (format) {
      case 'json': 
        res.write(JSON.stringify(wish));
        break;
      default:
        res.write("unknown format: " + format);
        break;
    }
    res.end();
  });
});

app.get('/vote/:id', loginRequired, function voteOn(req, res) {
  models.Wish.findOne({_id:req.params.id}, function(err, wish1) {
    if (err || ! wish1) {
      res.redirect('vote')
    } else {
      models.Wish.findRandom(wish1._id, function(err, wish2) {
        res.render('vote', {
          locals: {
            username: req.session.user,
            wishes: [wish1, wish2]
          }
        });
      });
    }
  });
});

app.get('/vote', loginRequired, function vote(req, res) {
  // get two random wishes and return them
  // the interface will go from there
  models.Wish.findRandom(null, function(err, wish1) {
    models.Wish.findRandom(wish1._id, function(err, wish2) {
      res.render('vote', {
        locals: {
          username: req.session.user.username,
          wishes: [wish1, wish2]
        }
      });
    });
  });
});


app.get('/find', function find(req, res) {
  res.render('find');  
});

app.get('/list', function list(req, res) {
  res.render('list');
});

// Only listen on $ node app.js

if (!module.parent) {
  app.listen(settings.port);
  console.log("Express server listening on port %d", app.address().port)
}