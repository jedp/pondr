
// for template rendering in the views below
_.templateSettings = {
  interpolate : /\{\{(.+?)\}\}/g
};

var Response = Backbone.Model.extend({ });

var ResponseView = Backbone.View.extend({
  model: Response, 

  tagName: "div",

  template: _.template( $('#response-template').html() ),

  initialize: function() {
    _.bindAll(this, 'render');
    this.model.bind('change', this.render);
    this.model.view = this;
  },

  render: function() {
    $(this.el).html(this.template(this.model.toJSON()));
    return this;
  }
});

var ResponseCollection = Backbone.Collection.extend({
  model: Response
})

// ----------------------------------------------------------------------
// Comments. 
// 
// Comments are children of a Wish.
// Each comment can have a collection of Responses to it

var Comment = Backbone.Model.extend({ });

var CommentCollection = Backbone.Collection.extend({
  model: Comment
});

var CommentView = Backbone.View.extend({
  model: Comment,

  tagName: "div",

  template: _.template( $('#comment-template').html() ),

  initialize: function() {
    _.bindAll(this, 'render');
    this.model.bind('change', this.render);
    this.model.view = this;
  },

  render: function() {
    var self = this;
    $(this.el).html(this.template(this.model.toJSON()));

    var responses = new ResponseCollection;
    responses.refresh(this.model.get('responses'));

    responses.each( function(response) {
      var responseView = new ResponseView({model: response});
      self.$('.responses').append(responseView.render().el);
    });
    return this;
  }
});

// ----------------------------------------------------------------------

var Wish = Backbone.Model.extend({
  url: function() {
    if (this.id == 'random.json') {
      return 'wish/' + this.id
    } else if (this.isNew) {
      return 'wish'
    } else {
      return 'wish/' + this.id
    }
  },

  initialize: function() {
    if (! this.get('created') ) {
      this.set({created: new Date});
    }
  }

});

var WishView = Backbone.View.extend({
  model: Wish,

  tagName: "div",

  events: {
    'click .vote': 'vote'
  },

  template: _.template( $('#wish-template').html() ),

  initialize: function() {
    _.bindAll(this, 'render');
    this.model.bind('change', this.render);
    this.model.view = this;
  },

  vote: function() {
    var self = this;
    var wish = new Wish({id: 'random.json'});
    wish.fetch({
      success: function(model, resp) {
        // re-rendering self as an example
        // will want to notify other to re-render
        //
        // tell others to replace with new random model
        self.model = model;
        self.render();
      }, 
      error: function(resp) {
        console.error(resp);
      }
    });
  },

  edit: function() {
    $(this.el).addClass("editing");
    // noodly oodly oodly
    this.input.focus();
  },

  render: function() {
    var self = this;
    $(this.el).html(this.template(this.model.toJSON()));

    var comments = new CommentCollection;
    comments.refresh(this.model.get('comments'));

    comments.each( function(comment) {
      commentView = new CommentView({model: comment});
      self.$('.comments').append(commentView.render().el);
    });

    return this;
  }
});

var WishCollection = Backbone.Collection.extend({ model: Wish });

// ----------------------------------------------------------------------
// the view for the vote page - the main application view

var NewWishApplication = Backbone.Model.extend({});

var NewWishApplicationView = Backbone.View.extend({
  model: NewWishApplication,

  el: $('#application'),

  events: {
    'click .submit': 'commit'
  },

  commit: function(event) {
    var wish = new Wish();
    var comment = new Comment;
    var commentCollection = new CommentCollection;

    comment.set({
        text: this.$('.newWishComment textarea').val(),
        whose: this.model.get('username')});
    commentCollection.add(comment);
    wish.set({
        text: this.$('.newWish textarea').val(),
        whose: this.model.get('username'),
        comments: commentCollection});
            
    wish.save();
  }
});

// ----------------------------------------------------------------------
// voting for one wish over another

var VoteApplication = Backbone.Model.extend({});

var VoteApplicationView = Backbone.View.extend({
  model: VoteApplication,

  el: $("#application"),

  events: {
    'click .text a': 'choose',
    'click .more': 'more',
    'click .flag': 'flag',
    'click .like': 'like'
  },

  choose: function(e) { console.log("submit") },
  more: function(e) { console.log("more: ") },
  flag: function(e) { console.log("flag: " + e) },
  like: function(e) { console.log("like: " + e) },

  initialize: function() {
    _.bindAll(this, 'addOne', 'render');
    // we would fetch() here, except that the stuff's already in the dom
    // via the server template.
  },

  render: function() {
  },

  addOne: function(wish) {
    var view = new WishView({model: wish});
    $(this.el).append(view.render().el);
  },
});


