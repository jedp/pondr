// load settings
var fs = require('fs');
var _ = require('underscore');
eval(fs.readFileSync('./config.js', 'ascii'));

if (typeof settings.dbname === 'undefined') {
// don't proceed unless dbname is specified
  settings.dbname = 'pondr';
}

function nocallback() {}

var completer = require('redis-completer');
completer.applicationPrefix(settings.appPrefix);

var mongoose = require('mongoose/');
mongoose.connect ('mongodb://localhost/' + settings.dbname);

var Schema = mongoose.Schema;

var UserSchema = new Schema({
  username: { type: String, index: true },
  email: String,
  pwhash: String,
  karma: { type: Number, default: 0 },
  reportsTo: [UserSchema]
});

var ResponseSchema = new Schema({
  text: String,
  updated: {type: Date, default: Date.now },
  whose: {type: String, index: true},
  score: {type: Number, default: 0}
});

var CommentSchema = new Schema({
  text: String, 
  updated: {type: Date, default: Date.now },
  whose: {type: String, index: true},
  score: {type: Number, default: 0},
  approved: {type: Boolean, default: false},
  responses: [ResponseSchema],
});

var WishSchema = new Schema({
  text: String,
  slug: String,
  anonymous: {type: Boolean, default: false},
  created: Date,
  updated: {type: Date, default: Date.now },

  whose: {type: String, index: true},
  comments: [CommentSchema],

  random: {type: Number, index: true},
  votes: {type: Number, default: 0},
  rejects: {type: Number, default: 0}

});

UserSchema.method('addKarma', function(amount) {
  this.karma.increment(amount);
  this.save();
});

UserSchema.static('addKarma', function(username, karma, callback) {
  callback = callback || nocallback;
  this.findOne( {username: username} , function(err, user) {
    if (err) { 
      return callback(err);
    } else if (! user) {
      return callback(new Error ("user not found: " + username));
    } else {
      user.addKarma(karma);
      return callback(null, user.karma.valueOf());
    }
  }); 
  return new Error("User not found");
});

WishSchema.pre('save', function(next) {
  this.random = Math.random();
  this.updated = new Date();
  next();
});

WishSchema.post('save', function(next) {
  // after saving a new wish, add title to completions db
  completer.addCompletions(this.text, this._id, this.votes);
});

WishSchema.method('upVote', function() {
  this.votes.increment(1);
  this.save();
  console.log(this.text + " - votes: " + this.votes.valueOf());
});

WishSchema.method('downVote', function() {
  this.rejects.increment(1);
  this.save();
});

WishSchema.static('findRandom', function(otherThanTheseIds, callback) {
  // callback with a random Wish.
  // if otherThanThisId is provided, the wish will not have that id.
  rand = Math.random();

  if (otherThanTheseIds) {
      skip_ids = otherThanTheseIds;
  } else {
      skip_ids = []
  }

  this.findOne( {_id: {'$nin': skip_ids},
               '$or': [ {'random': {'$gte': rand}},
                        {'random': {'$lte': rand}}  ]}, callback);
});

WishSchema.static('upVote', function(id, callback) {
  this.findOne({_id: id}, function(err, model) {
    model.upVote();
    callback(err, model.votes);
  });
});

WishSchema.static('addAllCompletions', function() {
  this.find({}, function(err, docs) {
    if (!err) {
      _.each(docs, function(doc) {
        completer.addCompletions(doc.text, doc._id, doc.votes);
      });
    }
  });
});

mongoose.model('ResponseModel', ResponseSchema);
mongoose.model('CommentModel', CommentSchema);
mongoose.model('WishModel', WishSchema);
mongoose.model('UserModel', UserSchema);

var Wish = mongoose.model('WishModel');
var Comment = mongoose.model('CommentModel');
var Response = mongoose.model('ResponseModel');
var User = mongoose.model('UserModel');

if (typeof exports !== 'undefined') {
    exports.Wish = Wish;
    exports.Comment = Comment;
    exports.Response = Response;
    exports.User = User;
}
    
