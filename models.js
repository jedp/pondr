// load settings
var fs = require('fs');
var _ = require('underscore');
eval(fs.readFileSync('./config.js', 'ascii'));

var completer = require('redis-completer');
completer.applicationPrefix(settings.appPrefix);

var mongoose = require('mongoose/');
mongoose.connect ('mongodb://localhost/' + settings.dbname);

var Schema = mongoose.Schema;

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
    this.votes += 1;
    this.save();
});

WishSchema.method('downVote', function() {
    this.rejects += 1;
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

WishSchema.static('voteForId', function(id, callback) {
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

var Wish = mongoose.model('WishModel');
var Comment = mongoose.model('CommentModel');
var Response = mongoose.model('ResponseModel');

if (typeof exports !== 'undefined') {
    exports.Wish = Wish;
    exports.Comment = Comment;
    exports.Response = Response;
}
    
