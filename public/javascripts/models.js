
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
  },

  voteFor: function() {
    now.voteForId(this.get('_id'));
  }

});

var WishView = Backbone.View.extend({
  model: Wish,

  tagName: "div",

  template: _.template( $('#wish-template').html() ),

  initialize: function() {
    _.bindAll(this, 'render');
    this.model.bind('change', this.render);
    this.model.view = this;
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
  model: Wish,

  el: $('#application'),

  events: {
    'click .submit': 'commit'
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
    'click .more': 'more',
    'click .flag': 'flag',
  },

  initialize: function() {
    this.views = [];
    _.bindAll(this, 'addOne', 'render');
    // we would fetch() here, except that the stuff's already in the dom
    // via the server template.
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

  more: function(e) { console.log("more: ") },
  flag: function(e) { console.log("flag: " + e) },

  removeView: function(view) {
    this.views.splice(this.views.indexOf(view), 1);
    view.remove();
  },

  addOne: function(wish) {
    var view = new WishView({model: wish});
    $(this.el).append(view.render().el);
    this.views.unshift(view);
  },
});


