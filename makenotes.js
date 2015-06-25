// Filename: makenotes.js

var Evernote = require('evernote').Evernote;
var config = require('./config.json');

function generatePrompt()
{
  var names = [['Jenny','her'],['Melissa','her'],['Billy','his'],['Johnny','his'],['Alexis','her']];

  var objects = ['dog','cat','balloon','new car'];

  var actions = ['lost','visited','played with'];

  var places = ['at the park','at home','at school','on the bus'];

  var randomName = names[Math.floor(Math.random()*names.length)];
  var randomObject = objects[Math.floor(Math.random()*objects.length)];
  var randomAction = actions[Math.floor(Math.random()*actions.length)];
  var randomPlace = places[Math.floor(Math.random()*places.length)];

  return {
    title: randomName[0]+' and '+randomName[1]+' '+randomObject,
    prompt: randomName[0]+' has a '+randomObject+'. Write about the time when '+randomName[0]+' '+randomAction+' '+randomName[1]+' '+randomObject+' '+randomPlace+'.'
  }
}

function makeNote(noteStore, noteTitle, noteBody, parentNotebookId, callback) {
  var nBody = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";
  nBody += "<!DOCTYPE en-note SYSTEM \"http://xml.evernote.com/pub/enml2.dtd\">";
  nBody += "<en-note>" + noteBody + "</en-note>";
 
  var ourNote = new Evernote.Note();
  ourNote.title = noteTitle;
  ourNote.content = nBody;
  ourNote.notebookGuid = parentNotebookId;
 
  noteStore.createNote(ourNote, function(err, note) {
    if(err) {
      console.log(err);
    } else {
      callback(note);
    }
  });
}

var mongoose = require('mongoose');
var mongooseServerAddress = config.MONGODB_ADDRESS;

mongoose.connect(mongooseServerAddress);

var Subscription = mongoose.model(config.MONGODB_MODEL, {
  userId: String,
  nextPrompt: Number,
  frequency: Number,
  token: String,
  tokenExpiration: Number,
  noteStore: String,
  notebookId: String,
});

setInterval(function() {
  var timeNow = new Date();
  Subscription.find().where('nextPrompt').gt(0).lt(timeNow.getTime()).where('tokenExpiration').gt(timeNow.getTime()).exec(function(err, results) {
    for(var i=0; i<results.length; i++) {
      var sub = results[i];

      var client = new Evernote.Client({
        consumerKey: config.API_CONSUMER_KEY,
        consumerSecret: config.API_CONSUMER_SECRET,
        sandbox: config.SANDBOX,
        token: sub.token
      });

      var noteStore = client.getNoteStore(sub.noteStore);

      var randomPrompt = generatePrompt();

      makeNote(noteStore, randomPrompt.title, randomPrompt.prompt, sub.notebookId, function(note) {
        Subscription.update({_id:sub._id}, {nextPrompt:timeNow.getTime()+sub.frequency});
      });
    }
  });
}, config.SERVER_CHECK_FREQUENCY);