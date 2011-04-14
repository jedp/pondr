var mongoose = require('mongoose/');
mongoose.connect ('mongodb://localhost/sparrow');

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
    created: Date,
    updated: {type: Date, default: Date.now },

    whose: {type: String, index: true},
    comments: [CommentSchema],

    random: {type: Number, index: true},
    votes: Number,
    rejects: Number,

});

WishSchema.pre('save', function(next) {
    this.random = Math.random();
    this.updated = new Date();
    next();
});

WishSchema.method('voteFor', function() {
    this.votes += 1;
    this.save();
});

WishSchema.method('voteAgainst', function() {
    this.rejects += 1;
    this.save();
});

WishSchema.static('findRandom', function(otherThanThisId, callback) {
    // callback with a random Wish.
    // if otherThanThisId is provided, the wish will not have that id.
    rand = Math.random();

    if (otherThanThisId) {
        skip_id = otherThanThisId;
    } else {
        skip_id = null
    }

    this.findOne( {_id: {'$ne': skip_id},
                 '$or': [ {'random': {'$gte': rand}},
                         {'random': {'$lte': rand}}   ]}, callback);
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
    
