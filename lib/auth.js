var fs = require('fs');
// get settings
eval(fs.readFileSync('config.js', 'ascii'));

var redis = require('redis');
var rc = redis.createClient();
var crypto = require('crypto');

var Model = require('backbone').Model;

var User = Model.extend({
  validate: function(attrs) {
    if (! attrs.username || ! attrs.username.match(/.+/)) return new Error("Username must contain at least SOME text");
  }
});

// private functions

var makeHash = function(s) {
  // return a hash of s
  return new crypto.Hash("md5")
    .update(settings.secret)
    .update(JSON.stringify(s))
    .digest("hex");
};

var verifyUserAccount = function(username, password, fn) {
  var hashkey = 'auth:user:'+username+':pwhash';
  rc.get(hashkey, function(err, data) {
    // does this username exist?
    if (err) return fn(new Error("No password for user: " + username));

    pwhash = makeHash(password);
    // is the password correct?
    if (data) {
      if (data === pwhash) {
        return fn(null, username);
      } else {
        return fn(new Error("password incorrect for " + username));
      }
    } else {
      fn (new Error("redis returned nothing"));
    }
  });
};

var userExists = function (username, fn) {
  // callback true if user already exists, else false
  var userkey = 'auth:user:' + username;
  return rc.get(userkey, function(err, data) {
    if (err) { 
      return fn(err);
    }

    if (data == username) {
      fn(null, true);
    } else {
      fn(null, false);
    }
  });
}

// public methods

exports.authenticateUser = function authenticateUser(username, password, fn) {
  var userkey = 'auth:user:' + username;
  rc.get(userkey, function(err, data) {
    if (err) {
      console.error(err);
      return fn(new Error('get() failed for key ' + userkey));
    }

    if (data) {
      console.dir(data);
      return verifyUserAccount(data, password, fn);

    } else {
      return fn(new Error('invalid password'));
    }
  });
};

function setPasswordForUsername(username, p1, p2, fn) {
  if (p1 !== p2) return fn(new Error("Passwords do not match"));

  var pwhash = makeHash(p1);
  var hashkey = 'auth:user:'+username+':pwhash';
  rc.set(hashkey, pwhash, function(err, data) {
    if (err) return fn(new Error("Failed to set password: " + err));
    return fn(null, pwhash);
  });
}

exports.createNewUserAccount = function(username, p1, p2, email, fn) {
  userExists(username, function(err, exists) {
    if (exists) {
      return fn (new Error("User " + username + " exists"));

    } else {
      var userkey = 'auth:user:'+username;
      var emailkey = 'auth:user:'+username+':email';

      // set up the username key
      rc.set(userkey, username, function(err) {
        if (err) return fn(new Error("Error setting user key: " + err));

        setPasswordForUsername(username, p1, p2, function(err, pwhash) {
          if (err) return fn(new Error("Error setting password key: " + err));

          rc.set(emailkey, email, function(err) {
            if (err) return fn(new Error("Error setting emial key: " + err));

            var user = new User({
              username: username,
              pwhash: pwhash,
              email: email
            });

            return fn(null, user);

          });
        });

      });
    }
  });
};

exports.changePassword = function(username, p0, p1, p2, fn) {
  verifyUserAccount(username, p0, function(err) {
    if (err) {
      return fn(new Error("Password incorrect"));
    }

    setPasswordForUsername(username, p1, p2, function(err, pwhash) {
      if (err) return fn(new Error("Error setting password: " + err));
      return fn(null, pwhash);
    })
  });
};

