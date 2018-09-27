'use strict';

const {App} = require('jovo-framework');
const config = {
  logging: false,
  intentMap: {
    'AMAZON.FallbackIntent': 'AnswerIntent',
    'AMAZON.CancelIntent': 'END',
    'AMAZON.HelpIntent': 'HelpIntent',
    'AMAZON.StopIntent': 'END',
    'AMAZON.NavigateHomeIntent': 'END'
  }
};
const app = new App(config);

app.setHandler({

  /****************************************
  ANSWER INTENT
  ****************************************/
  'AnswerIntent': function(questionResponse) {
    let jovo_state = this;
    let question_response = questionResponse.value;

    let active_button = jovo_state.getSessionAttribute('active_button');
    let answers = jovo_state.getSessionAttribute('answers');
    let awaiting_answer_from = jovo_state.getSessionAttribute('awaiting_answer_from');
    let button_count = jovo_state.getSessionAttribute('button_count');
    let current_turn = jovo_state.getSessionAttribute('current_turn');
    let flash_answer = jovo_state.getSessionAttribute('flash_answer');
    let flash_count = jovo_state.getSessionAttribute('flash_count');
    let in_game = jovo_state.getSessionAttribute('in_game');
    let listen_for = jovo_state.getSessionAttribute('listen_for');
    let players = jovo_state.getSessionAttribute('players');
    let telling = jovo_state.getSessionAttribute('telling');

    let current_count = players.length;
    let speech = jovo_state.speechBuilder();
    let timeout = 90000;

    if (listen_for == 'button_count') {
      /********************************
      GET THE NUMBER OF BUTTONS WE SHOULD SET UP
      ********************************/
      if (question_response < 2) {
        jovo_state.ask('Sorry. This game requires at least two buttons and two players. How many players would you like to play with?', 'How many players do you have?');

      } else {
        // We want to start the setup phase, so ask the users to push a button and provide a name;
        jovo_state.setSessionAttribute('button_count', question_response);

        // start listening for a single button push event
        let pattern = {'action':'down'};
        let buttonDownRecognizer = jovo_state.alexaSkill().gameEngine().getPatternRecognizerBuilder('buttonDownRecognizer').anchorEnd().fuzzy(false).pattern([pattern]);
        let buttonDownEvent = jovo_state.alexaSkill().gameEngine().getEventsBuilder('buttonDownEvent').meets(['buttonDownRecognizer']).reportsMatches().shouldEndInputHandler(true).build();
        jovo_state.alexaSkill().gameEngine().setEvents([buttonDownEvent]).setRecognizers([buttonDownRecognizer]).startInputHandler(timeout);
        jovo_state.alexaSkill().gameEngine().respond('Great! Lets get ' + question_response + ' buttons set up for the game! Player one, please press your button.');

      }

    } else if (listen_for == 'continue_round') {
      /********************************
      EITHER MOVE TO THE NEXT ROUND OR END THE GAME
      ********************************/
      let continue_round = true;
      if (question_response.indexOf('no') > -1) {
        continue_round = false;
      }

      if (continue_round) {
        let skip = current_turn;

        // start next round; randomly pick which player we want to have the turn; make sure we don't pick the same player that just went
        while (skip == current_turn) {
          current_turn = Math.floor(Math.random() * (players.length - 0) + 0);
        }

        jovo_state.setSessionAttribute('answers', []);
        jovo_state.setSessionAttribute('current_turn', current_turn);
        jovo_state.setSessionAttribute('active_button', players[current_turn]['button_id']);
        jovo_state.setSessionAttribute('listen_for', 'lie_instructions');

        // instruct the current player to open their eyes and register that they are ready for additional instructions
        speech.addText('Moving on to the next round. All players, please close your eyes now.');
        speech.addBreak('300ms').addText(players[current_turn]['player_name'] + ' open your eyes, confirm that all other player eyes are closed, and then push your button.');

        // enable just the active_button input handler
        let pattern = {'action':'down', 'gadgetIds':[players[current_turn]['button_id']]};
        let buttonDownRecognizer = jovo_state.alexaSkill().gameEngine().getPatternRecognizerBuilder('buttonDownRecognizer').anchorEnd().fuzzy(false).pattern([pattern]);
        let buttonDownEvent = jovo_state.alexaSkill().gameEngine().getEventsBuilder('buttonDownEvent').meets(['buttonDownRecognizer']).reportsMatches().shouldEndInputHandler(true).build();
        jovo_state.alexaSkill().gameEngine().setEvents([buttonDownEvent]).setRecognizers([buttonDownRecognizer]).startInputHandler(timeout);
        jovo_state.alexaSkill().gameEngine().respond(speech);

      } else {
        // END THE GAME
        this.toIntent('END');

      }

    } else if (listen_for == 'flash_answer') {
      /********************************
      ANSWER HOW MANY FLASHES WERE COUNTED
      ********************************/
      // in this situation, question_response should be the count of orange flashes
      flash_answer = parseInt(question_response);
      jovo_state.setSessionAttribute('flash_answer', flash_answer);

      // determine if they were telling the truth or not
      telling = 'tell the truth';
      if (flash_answer != flash_count) {
        telling = 'lie';
      }
      jovo_state.setSessionAttribute('telling', telling);

      // tell everyone to open their eyes
      speech.addText('Everyone please open your eyes.').addBreak('100ms');

      // go around the player list (for everyone but current player; and ask them to push their button and say if they think the current player is lying or telling the truth)
      speech.addText('We are now going to ask each of you if you think ' + players[current_turn]['player_name'] + ' is lying or telling the truth.');

      // start at the player after current_player (and loop around list)
      awaiting_answer_from = current_turn + 1;
      if (awaiting_answer_from > (players.length - 1)) {
        awaiting_answer_from = 0;
      }

      jovo_state.setSessionAttribute('awaiting_answer_from', awaiting_answer_from);
      jovo_state.setSessionAttribute('active_button', players[awaiting_answer_from]['button_id']);
      jovo_state.setSessionAttribute('listen_for', 'round_answer');

      speech.addText(players[awaiting_answer_from]['player_name'] + ' please press your button.');

      // enable just the active_button input handler
      let pattern = {'action':'down', 'gadgetIds':[players[awaiting_answer_from]['button_id']]};
      let buttonDownRecognizer = jovo_state.alexaSkill().gameEngine().getPatternRecognizerBuilder('buttonDownRecognizer').anchorEnd().fuzzy(false).pattern([pattern]);
      let buttonDownEvent = jovo_state.alexaSkill().gameEngine().getEventsBuilder('buttonDownEvent').meets(['buttonDownRecognizer']).reportsMatches().shouldEndInputHandler(true).build();
      jovo_state.alexaSkill().gameEngine().setEvents([buttonDownEvent]).setRecognizers([buttonDownRecognizer]).startInputHandler(timeout);
      jovo_state.alexaSkill().gameEngine().respond(speech);

    } else if (listen_for == 'round_answer') {
      /********************************
      TAKE AN ANSWER FROM A GIVEN USER
      ********************************/
      // question_response should either be truth or lie
      let user_answer = 'tell the truth';
      if (question_response.indexOf('lie') > -1 || question_response.indexOf('lying') > -1) {
        user_answer = 'lie';
      }
      // determine if this player gets points or not;
      let rec = {'button_id':active_button, 'player_id': awaiting_answer_from, 'answer': user_answer, 'guess':'incorrect'};
      if (user_answer == telling) {
        // user got it right;
        rec['guess'] = 'correct';
        players[awaiting_answer_from]['points'] += 1;
      }
      answers.push(rec);

      // determine if we are ready to move the next round or not
      if (answers.length == (players.length - 1)) {
        // ready to award points and move to the next round
        let correct = 0;
        let incorrect = 0;
        for (var i = 0; i < answers.length; i++) {
          if (answers[i]['guess'] == 'correct') {
            correct++;
          } else {
            incorrect++;
            players[current_turn]['points'] += 1;
          }
        }

        let player_action = 'told the truth';
        if (telling == 'lie') {
          player_action = 'lied';
        }
        speech.addText('Time to reveal that ' + players[current_turn]['player_name']).addBreak('100ms');
        speech.addText(' ' + player_action + '!').addBreak('200ms');
        speech.addText('The scores are now:').addBreak('100ms');
        for (var i = 0; i < players.length; i++) {
          speech.addText(players[i]['player_name'] + ', ' + players[i]['points'] + ' points.').addBreak('100ms');
        }
        speech.addText('Would you like to play another round?');

        jovo_state.setSessionAttribute('listen_for', 'continue_round');

        jovo_state.ask(speech, 'Do you want to continue the game?');

      } else {
        // not ready for next round, ask the next player to respond
        awaiting_answer_from++;
        if (awaiting_answer_from > (players.length - 1)) {
          awaiting_answer_from = 0;
        }
        if (awaiting_answer_from == current_turn) {
          // skip the player who did the counting
          awaiting_answer_from++;
        }
        jovo_state.setSessionAttribute('awaiting_answer_from', awaiting_answer_from);
        jovo_state.setSessionAttribute('active_button', players[awaiting_answer_from]['button_id']);
        jovo_state.setSessionAttribute('listen_for', 'round_answer');

        speech.addText(players[awaiting_answer_from]['player_name'] + ' please press your button.');

        // enable just the active_button input handler
        let pattern = {'action':'down', 'gadgetIds':[players[awaiting_answer_from]['button_id']]};
        let buttonDownRecognizer = jovo_state.alexaSkill().gameEngine().getPatternRecognizerBuilder('buttonDownRecognizer').anchorEnd().fuzzy(false).pattern([pattern]);
        let buttonDownEvent = jovo_state.alexaSkill().gameEngine().getEventsBuilder('buttonDownEvent').meets(['buttonDownRecognizer']).reportsMatches().shouldEndInputHandler(true).build();
        jovo_state.alexaSkill().gameEngine().setEvents([buttonDownEvent]).setRecognizers([buttonDownRecognizer]).startInputHandler(timeout);
        jovo_state.alexaSkill().gameEngine().respond(speech);
      }

    } else if (listen_for == 'set_up') {
      /********************************
      SET UP EACH BUTTON
      ********************************/
      // update the player name for the active_button
      for (var i = 0; i < players.length; i++) {
        if (players[i]['button_id'] == active_button) {
          players[i]['player_name'] = question_response;
        }
      }
      jovo_state.setSessionAttribute('players', players);

      if (current_count == button_count) {
        // ready to start the game!
        jovo_state.setSessionAttribute('in_game', true);
        speech.addText('Great! We are ready to start the game!');

        // randomly pick which player we want to have the turn
        let current_turn = Math.floor(Math.random() * (players.length - 0) + 0);

        jovo_state.setSessionAttribute('current_turn', current_turn);
        jovo_state.setSessionAttribute('active_button', players[current_turn]['button_id']);
        jovo_state.setSessionAttribute('listen_for', 'lie_instructions');

        speech.addText('All players, please close your eyes now.');

        // instruct the current player to open their eyes and register that they are ready for additional instructions
        speech.addBreak('300ms').addText(players[current_turn.toString()]['player_name'] + ' open your eyes, confirm that all other player eyes are closed, and then push your button.');

        // enable just the active_button input handler
        let pattern = {'action':'down', 'gadgetIds':[players[current_turn]['button_id']]};
        let buttonDownRecognizer = jovo_state.alexaSkill().gameEngine().getPatternRecognizerBuilder('buttonDownRecognizer').anchorEnd().fuzzy(false).pattern([pattern]);
        let buttonDownEvent = jovo_state.alexaSkill().gameEngine().getEventsBuilder('buttonDownEvent').meets(['buttonDownRecognizer']).reportsMatches().shouldEndInputHandler(true).build();
        jovo_state.alexaSkill().gameEngine().setEvents([buttonDownEvent]).setRecognizers([buttonDownRecognizer]).startInputHandler(timeout);
        jovo_state.alexaSkill().gameEngine().respond(speech);

      } else {
        // ask the next player to register their button
        speech.addText('Thanks! Player ' + (current_count + 1) + ', please press your button.');

        // enable the next input handler
        let pattern = {'action':'down'};
        let buttonDownRecognizer = jovo_state.alexaSkill().gameEngine().getPatternRecognizerBuilder('buttonDownRecognizer').anchorEnd().fuzzy(false).pattern([pattern]);
        let buttonDownEvent = jovo_state.alexaSkill().gameEngine().getEventsBuilder('buttonDownEvent').meets(['buttonDownRecognizer']).reportsMatches().shouldEndInputHandler(true).build();
        jovo_state.alexaSkill().gameEngine().setEvents([buttonDownEvent]).setRecognizers([buttonDownRecognizer]).startInputHandler(timeout);
        jovo_state.alexaSkill().gameEngine().respond(speech);

      }

    }

  },

  /****************************************
  END
  ****************************************/
  'END': function() {
    let jovo_state = this;
    jovo_state.tell('Thanks for playing!');
  },

  /****************************************
  HELP INTENT
  ****************************************/
  'HelpIntent': function() {
    let jovo_state = this;
    let listen_for = jovo_state.getSessionAttribute('listen_for');

    let reprompt = jovo_state.speechBuilder();
    let speech = jovo_state.speechBuilder();

    speech.addText('Lie Detector is a simple game you play with your friends and Alexa Buttons.');
    speech.addBreak('100ms').addText('Each round, one player will be picked to be the counter.');
    speech.addText('All other players will close their eyes. The alexa will then flash the counter\'s button yellow a random number of times and ask them to say the number they counted.');
    speech.addBreak('100ms').addText('The counter can choose to say the real number, the truth, or they can choose to say a different number, a lie.');
    speech.addBreak('100ms').addText('We\'ll then ask all players to open their eyes and each give a guess to if the counter was telling the thruth or lying.');
    speech.addText('Correct guesses will earn the guesser one point. Each incorrect guess will earn the counter a point.');

    // TODO determine what to prompt, and reprompt the user with at the end of help
    if (listen_for == 'button_count') {
    } else if (listen_for == 'continue_round') {
    } else if (listen_for == 'flash_answer') {
    } else if (listen_for == 'lie_instructions') {
    } else if (listen_for == 'round_answer') {
    } else if (listen_for == 'set_up') {
    } else if (listen_for == 'start_flash') {
    }
    reprompt.addText('What should we do next?');

    jovo_state.ask(speech, reprompot);

  },

  /****************************************
  LAUNCH
  ****************************************/
  'LAUNCH': function() {
    this.toIntent('WelcomeIntent');
  },

  /****************************************
  ON GAME ENGINE INPUT HANDLER EVENT
  ****************************************/
  'ON_GAME_ENGINE_INPUT_HANDLER_EVENT': function () {
    let jovo_state = this;

    let active_button = jovo_state.getSessionAttribute('active_button');
    let answers = jovo_state.getSessionAttribute('answers');
    let awaiting_answer_from = jovo_state.getSessionAttribute('awaiting_answer_from');
    let button_count = jovo_state.getSessionAttribute('button_count');
    let current_turn = jovo_state.getSessionAttribute('current_turn');
    let flash_answer = jovo_state.getSessionAttribute('flash_answer');
    let flash_count = jovo_state.getSessionAttribute('flash_count');
    let in_game = jovo_state.getSessionAttribute('in_game');
    let listen_for = jovo_state.getSessionAttribute('listen_for');
    let players = jovo_state.getSessionAttribute('players');
    let telling = jovo_state.getSessionAttribute('telling');

    let current_count = players.length;
    let timeout = 90000;

    let input_event = jovo_state.request().getEvents()[0];
    let input_event_name = input_event.name;

    if (input_event_name == 'buttonDownEvent') {
      /********************************
      DEAL WITH BUTTON CLICK
      ********************************/
      // user pushed a button; so register it (if need be)
      let button_id = input_event.inputEvents[0].gadgetId;
      let known_button = false;

      for (var i = 0; i < players.length; i++) {
        if (players[i]['button_id'] == button_id) {
          known_button = true;
        }
      }

      if (!known_button) {
        /********************************
        UNKNOWN BUTTON - ATTEMPT TO REGISTER
        ********************************/
        // seems to be the first time we are seeing this button; let's try to set it up
        current_count += 1;
        players.push({
          'player_id': current_count,
          'button_id': button_id,
          'player_name': 'Player ' + current_count,
          'request_id': jovo_state.request.id,
          'points': 0
        });

        // save the updated player details to our session
        jovo_state.setSessionAttribute('players', players);
        jovo_state.setSessionAttribute('active_button', button_id);
        jovo_state.setSessionAttribute('listen_for', 'set_up');

        // ask the user what name they want to use for this game
        jovo_state.ask('And what name would you like to play as?', 'What should we call you?');

      } else {
        /********************************
        KNOWN BUTTON
        ********************************/
        if (in_game) {
          /********************************
          IN GAME
          ********************************/
          // we are in game; so this means the user is potentially ready/responding to a game play command

          // make sure the person pressing the button is the current_turn
          var correct_person = false;
          if (active_button == button_id) {
            correct_person = true;
          }

          if (!correct_person) {
            /********************************
            WRONG PLAYER PUSHED BUTTON
            ********************************/
            // ignore this button press; because not the right person
            console.log('wrong player pushed button');

          } else {
            if (listen_for == 'lie_instructions') {
              /********************************
              LIE INSTRUCTIONS
              ********************************/
              // give the current player with their eyes open instructions on what we want
              let speech = jovo_state.speechBuilder().addText('We are going to flash your button yellow a number of times.');
              speech.addBreak('100ms').addText('Then we are going to ask you to tell everyone how many yellow flashes you saw, and each of the other players will guess if you are telling the truth or lying.');
              speech.addBreak('100ms').addText('Correct guesses each earn that player a point, incorrect guesses each earn YOU a point!').addBreak('100ms');
              speech.addBreak('100ms').addText('Press your button when you are ready for us to start.');
              jovo_state.setSessionAttribute('listen_for', 'start_flash');

              // enable just the current_turn input handler
              let pattern = {'action':'down', 'gadgetIds':[players[current_turn]['button_id']]};
              let buttonDownRecognizer = jovo_state.alexaSkill().gameEngine().getPatternRecognizerBuilder('buttonDownRecognizer').anchorEnd().fuzzy(false).pattern([pattern]);
              let buttonDownEvent = jovo_state.alexaSkill().gameEngine().getEventsBuilder('buttonDownEvent').meets(['buttonDownRecognizer']).reportsMatches().shouldEndInputHandler(true).build();
              jovo_state.alexaSkill().gameEngine().setEvents([buttonDownEvent]).setRecognizers([buttonDownRecognizer]).startInputHandler(timeout);
              jovo_state.alexaSkill().gameEngine().respond(speech);

            } else if (listen_for == 'round_answer') {
              /********************************
              ROUND ANSWER - SET THE ACTIVE BUTTON
              ********************************/
              // set the active button
              jovo_state.setSessionAttribute('active_button', button_id);

              let speech = jovo_state.speechBuilder().addText(players[awaiting_answer_from]['player_name'] + ' did ' + players[current_turn]['player_name'] + ' tell the truth or a lie?');
              jovo_state.ask(speech, speech);

            } else if (listen_for == 'start_flash') {
              /********************************
              START FLASHING
              ********************************/
              jovo_state.setSessionAttribute('listen_for', 'flash_answer');

              // randomly determine how many times we want to flash the button (1 to 4 times right now)
              let flash_count = Math.floor(Math.random() * (5 - 1) + 1);
              jovo_state.setSessionAttribute('flash_count', flash_count);

              let sequence = [];
              for (var i = 0; i < flash_count; i++) {
                sequence.push({'durationMs': 500, 'color': 'FFFF00', 'blend': false});
                sequence.push({'durationMs': 500, 'color': '000000', 'blend': false});
              }
              sequence.push({'durationMs': 1000, 'color': 'FF0000', 'blend': false});

              // flash the button yellow flash_count times
              jovo_state.alexaSkill().gadgetController().setNoneTriggerEvent().setAnimations([ { "repeat": 1, "targetLights":["1"], "sequence": sequence } ]).setLight([button_id], 0, []);

              // ask the current player to say how many times the button flashed
              let speech = jovo_state.speechBuilder().addText('When you see the red light, please say the number of yellow flashes you counted.');
              jovo_state.ask(speech, 'How many yellow flashes did you see?');

            }

          }

        } else {
          /********************************
          BUTTON ALREADY ASSIGNED
          ********************************/
          let pattern = {'action':'down'};
          let buttonDownRecognizer = jovo_state.alexaSkill().gameEngine().getPatternRecognizerBuilder('buttonDownRecognizer').anchorEnd().fuzzy(false).pattern([pattern]);
          let buttonDownEvent = jovo_state.alexaSkill().gameEngine().getEventsBuilder('buttonDownEvent').meets(['buttonDownRecognizer']).reportsMatches().shouldEndInputHandler(true).build();
          jovo_state.alexaSkill().gameEngine().setEvents([buttonDownEvent]).setRecognizers([buttonDownRecognizer]).startInputHandler(timeout);
          jovo_state.alexaSkill().gameEngine().respond('That button seems to already be registered, please try one that you haven\'t set up for the game yet.');

        }

      }
    }
  },

  /****************************************
  WELCOME INTENT
  ****************************************/
  'WelcomeIntent': function() {
    // welcome the user; ask for button count
    let jovo_state = this;

    // initialize all our session variables
    jovo_state.setSessionAttribute('active_button', '');
    jovo_state.setSessionAttribute('answers', []);
    jovo_state.setSessionAttribute('awaiting_answer_from', 0);
    jovo_state.setSessionAttribute('button_count', 0);
    jovo_state.setSessionAttribute('current_turn', 0);
    jovo_state.setSessionAttribute('flash_answer', 0);
    jovo_state.setSessionAttribute('flash_count', 0);
    jovo_state.setSessionAttribute('in_game', false);
    jovo_state.setSessionAttribute('listen_for', 'button_count');
    jovo_state.setSessionAttribute('players', []);
    jovo_state.setSessionAttribute('telling', 'tell the truth');

    jovo_state.ask(
      'Welcome to Lie Detector! This game requires Alexa buttons. Each player should have their own button. How many players will there be?',
      'How many players do you want to play with?'
    );
  },

});

module.exports.app = app;
