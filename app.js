// Filename: app.js

var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var app = express();
var Evernote = require('evernote').Evernote;
var config = require('./config.json');
var mongoose = require('mongoose');

app.use(express.cookieParser('secret'));
app.use(express.session());
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));

mongoose.connect(config.MONGODB_ADDRESS);

var Subscription = mongoose.model(config.MONGODB_MODEL, {
  userId: String,
  nextPrompt: Number,
  frequency: Number,
  token: String,
  tokenExpiration: Number,
  noteStore: String,
  notebookId: String,
});

app.get('/oauth', function(req, res) {
  var client = new Evernote.Client({
    consumerKey: config.API_CONSUMER_KEY,
    consumerSecret: config.API_CONSUMER_SECRET,
    sandbox: config.SANDBOX
  });

  client.getRequestToken(config.CALLBACK_URL, function(error, oauthToken, oauthTokenSecret, results) {
    if(error) {
      req.session.error = JSON.stringify(error);

      res.redirect('/');
    } else { 
      req.session.oauthToken = oauthToken;
      req.session.oauthTokenSecret = oauthTokenSecret;

      res.redirect(client.getAuthorizeUrl(oauthToken));
    }
  });
});

app.get('/oauth_callback', function(req, res) {
  var client = new Evernote.Client({
    consumerKey: config.API_CONSUMER_KEY,
    consumerSecret: config.API_CONSUMER_SECRET,
    sandbox: config.SANDBOX
  });

  client.getAccessToken(
    req.session.oauthToken, 
    req.session.oauthTokenSecret, 
    req.param('oauth_verifier'), 
    function(error, oauthAccessToken, oauthAccessTokenSecret, results) {
      if(error) {
        console.log('error');
        console.log(error);
        res.redirect('/');
      } else {
        // store the access token in the session
        req.session.oauthAccessToken = oauthAccessToken;
        req.session.oauthAccessTtokenSecret = oauthAccessTokenSecret;
        req.session.edamShard = results.edam_shard;
        req.session.edamUserId = results.edam_userId;
        req.session.edamExpires = results.edam_expires;
        req.session.edamNoteStoreUrl = results.edam_noteStoreUrl;
        req.session.edamWebApiUrlPrefix = results.edam_webApiUrlPrefix;
        res.redirect('/');
      }
    });
});

app.get('/api/logout', function(req, res) {
  req.session.destroy();
});

app.get('/api/notebooks', function(req, res)
{
  if(!req.session.edamUserId)
    return res.send(401, {error:'Not logged in'});

  var client = new Evernote.Client({
    consumerKey: config.API_CONSUMER_KEY,
    consumerSecret: config.API_CONSUMER_SECRET,
    sandbox: config.SANDBOX,
    token:req.session.oauthAccessToken
  });

  var noteStore = client.getNoteStore(req.session.edamNoteStoreUrl);
  var response = [];
  
  var notebooks = noteStore.listNotebooks(function(err, notebooks) {
    for(var i in notebooks) {
      response.push({
        'notebookid': notebooks[i].guid, 
        'title': notebooks[i].name
      });
    }

    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(response));
  });
});

app.get('/api/subscriptions', function(req, res) {
  if(!req.session.edamUserId)
    return res.send(401, {error:'Not logged in'});

  Subscription.find({'userId': req.session.edamUserId}, function(err, docs) {
    var results = [];

    for(var i in docs) {
      results.push({subscriptionid: docs[i]._id, notebookid:docs[i].notebookId});
    }

    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(results));
  });
});

app.post('/api/subscribe', function(req, res) {
  if(!req.session.edamUserId)
    return res.send(401, {error:'Not logged in'});

  Subscription.create({
    userId: req.session.edamUserId,
    nextPrompt: req.body.start,
    frequency: req.body.frequency,
    token: req.session.oauthAccessToken,
    tokenExpiration: req.session.edamExpires,
    noteStore: req.session.edamNoteStoreUrl,
    notebookId: req.body.notebookid
  }, function(err, doc) {
      if(err) 
        return res.send(500, {error:err});

      return res.send(JSON.stringify({
        subscriptionid: doc._id, 
        notebookid:doc.notebookId
      }));
  });
});

app.post('/api/unsubscribe', function(req, res) {
  if(!req.session.edamUserId)
    return res.send(401, {error:'Not logged in'});

  Subscription.remove({_id: req.body.subscriptionid}, function(err, doc) {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({subscriptionid: req.body.subscriptionid}));
  });
});

app.listen(config.PORT);

console.log('Application listening on port '+config.PORT);