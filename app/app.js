'use strict';

const {App} = require('jovo-framework');

const config = {
  logging: true,
};

const app = new App(config);

app.setHandler({
  'LAUNCH': function() {
    this.toIntent('WelcomeIntent');
  },

  'WelcomeIntent': function() {
    this.ask('Welcome to Lie Detector! How many players would you like to play with today?', 'How many players are there?');
  },

  'MyNameIsIntent': function(name) {
    this.tell('Hey ' + name.value + ', nice to meet you!');
  },
});

module.exports.app = app;
