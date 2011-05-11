
// for template rendering in the views below
_.templateSettings = {
  interpolate : /\{\{(.+?)\}\}/g
};

var Response = Backbone.Model.extend({ 
  defaults: {
    score: 0,
    parentCommentId: null
  }, 

  // When we save a comment, we let the server take care
  // of folding it into the Wish model and saving the whole
  // thing.
  url: function() {
    if (this.isNew) {
      return '/response';
    } else {
      return '/response/' + this.get('_id');
    }
  },
});

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

var Comment = Backbone.Model.extend({ 
  defaults: {
    score: 0,
    parentWishId: null
  },

  // When we save a comment, we let the server take care
  // of folding it into the Wish model and saving the whole
  // thing.
  url: function() {
    if (this.isNew) {
      return '/comment';
    } else {
      return '/comment/' + this.get('_id');
    }
  },

  initialize: function() {
    if (! this.get('created') ) {
      this.set({created: new Date});
    }

    this.responses = new ResponseCollection;
    this.responses.refresh(this.get('responses'));
  },

  voteFor: function() {
    now.voteForComment(this.get('_id'));
  }
});

var CommentView = Backbone.View.extend({
  model: Comment,

  tagName: "div",

  template: _.template( $('#comment-template').html() ),

  events: {
    'click .new-response': 'new_response'
  },

  initialize: function() {
    _.bindAll(this, 'render');
    this.model.bind('change', this.render);
    this.model.view = this;
  },

  new_response: function(event) {
    event.stopPropagation();
    event.preventDefault();

    var textarea = $(event.currentTarget).closest('.addResponse').find('textarea');
    var text = textarea.val();
    textarea.val("");
    console.log("got text: " + text);

    text = text.trim();
    if (! text) { 
      return; 
    }

    var response = new Response({ 
      parentWishId: this.model.get('parentWishId'),
      parentCommentId: this.model.get('_id'),
      text: text,
      whose: this.model.get('whose')});
    this.model.responses.add(response);
    console.log("adding: " + response);
    response.save();
    this.render();
  },

  render: function() {
    var self = this;
    $(this.el).html(this.template(this.model.toJSON()));

    this.model.responses.each( function(response) {
      var responseView = new ResponseView({model: response});
      self.$('.responses').append(responseView.render().el);
    });
    return this;
  }
});

var CommentCollection = Backbone.Collection.extend({
  model: Comment
});

// ----------------------------------------------------------------------

var Wish = Backbone.Model.extend({
  url: function() {
    if (this.id && this.id.match(/random.json.*/)) {
      return '/wish/' + this.id;
    } else if (this.isNew) {
      return '/wish';
    } else {
      return '/wish/' + this.get('_id');
    }
  },

  initialize: function() {
    if (! this.get('created') ) {
      this.set({created: new Date});
    } 

    this.comments = new CommentCollection;
    this.comments.refresh(this.get('comments'));
  },

  voteFor: function() {
    now.voteForId(this.get('_id'));
  }

});

var WishView = Backbone.View.extend({
  model: Wish,

  tagName: "div",

  template: _.template( $('#wish-template').html() ),

  events: {
    'click .new-comment': 'new_comment',
    'click .more': 'more',
    'click .flag': 'flag'
  },

  initialize: function() {
    _.bindAll(this, 'render');
    this.model.bind('change', this.render);
    this.model.view = this;
    this.viewer = null;
  },

  setViewer: function(username) { 
    this.viewer = username;
  },

  more: function(event) {
    // open and display comments          
    this.$('.comments-container').toggle();
  },

  flag: function(event) {
    // flag as inappropriate
    console.log('flagged by ' + this.viewer);
  },

  new_comment: function(event) {
    event.stopPropagation();
    event.preventDefault();

    // refactor w/ new_response
    var textarea = $(event.currentTarget).closest('.addComment').find('textarea');
    var text = textarea.val();
    textarea.val("");

    text = text.trim();
    if (! text) { 
      return; 
    }

    var comment = new Comment({
      parentWishId: this.model.get('_id'),
      text: text,
      whose: this.model.get('whose')});
    this.model.comments.add(comment);
    comment.save();
    // add a view
    commentView = new CommentView({model: comment});
    self.$('.comments').append(commentView.render().el);
  },


  edit: function() {
    $(this.el).addClass("editing");
    // noodly oodly oodly
    this.input.focus();
  },

  render: function() {
    var self = this;
    $(this.el).html(this.template(this.model.toJSON()));

    this.model.comments.each( function(comment) {
      comment.set({'parentWishId': self.model.get('_id')});
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
  model: Wish,

  el: $('#application'),

  events: {
    'click .submit': 'commit',
  },

  commit: function(event) {
    //var wish = new Wish();
    var comment = new Comment;
    var commentCollection = new CommentCollection;

    comment.set({
        text: this.$('.newWishComment textarea').val(),
        whose: this.model.get('whose')});
    commentCollection.add(comment);

    this.model.set({
        text: this.$('.newWish textarea').val(),
        comments: commentCollection});
            
    this.model.save();
    this.el.fadeOut(200);

    // having made a wish, go compare with others
    location.replace('/vote/'+this.model.get('_id'))
  }
});

var ListApplication = Backbone.Model.extend({});
var ListApplicationView = Backbone.View.extend({
  model: ListApplication,

  el: $("#application"),

  initialize: function() {
    _.bindAll(this, 'addOne', 'render');
  },

  addOne: function(wish) {
    var view = new WishView({model: wish});
    $(this.el).append(view.render().el);
  }
});

// ----------------------------------------------------------------------
// voting for one wish over another

var VoteApplication = Backbone.Model.extend({});

var VoteApplicationView = Backbone.View.extend({
  model: VoteApplication,

  el: $("#application"),

  events: {
    'click .vote': 'vote',
    'click .more': 'more'
  },

  initialize: function() {
    this.views = [];
    _.bindAll(this, 'addOne', 'render');
    // we would fetch() here, except that the stuff's already in the dom
    // via the server template.
  },

  more: function(event) {
    // When somebody clicks the 'more' button on an item,
    // hide all the other items.  (The view for the clicked
    // item itself deals with toggling itself open/closed.)
    var wishElem = $(event.currentTarget).closest('.wish');
    $('#application .wish').not(wishElem).toggle();
  },

  vote: function(event) {
    var self = this;
    var notIds = _.map(self.views, function(view) { return view.model.get('_id')} ).join(',');

    var toRemove = [];
    _.each(this.views, function(view) { 
      if (!view.el.contains(event.currentTarget)) {
        // mark me for removal
        toRemove.unshift(view);
      } else {
        // vote for me!
        view.model.voteFor();
      }
    });

    // remove views that weren't voted for
    _.each(toRemove, function(r) { self.removeView(r)});

    var wish = new Wish({id: 'random.json/not/'+notIds});
    wish.fetch({
      error: function(resp) { 
        console.error(resp);
      },
      success: function(model, resp) {
        self.addOne(wish);
      }
    });
  },

  removeView: function(view) {
    this.views.splice(this.views.indexOf(view), 1);
    view.remove();
  },

  addOne: function(wish) {
    var view = new WishView({model: wish});
    view.setViewer(this.model.get('username'));
    $(this.el).append(view.render().el);
    this.views.unshift(view);
  },
});


