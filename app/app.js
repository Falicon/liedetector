'use strict';

const {App} = require('jovo-framework');
const config = {
  logging: true
};
const app = new App(config);

app.setHandler({

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

    if (listen_for == 'button_count') {
      if (question_response < 2) {
        jovo_state.ask('Sorry. This game requires at least two buttons and two players. How many players would you like to play with?', 'How many players do you have?');

      } else {
        /********************************
        GET THE NUMBER OF BUTTONS WE SHOULD SET UP
        ********************************/
        // We want to start the setup phase, so ask the users to push a button and provide a name;
        jovo_state.setSessionAttribute('button_count', question_response);
        jovo_state.setSessionAttribute('listen_for', 'player_name');

        let buttonDownRecognizer = jovo_state.alexaSkill().gameEngine().getPatternRecognizerBuilder('buttonDownRecognizer').anchorEnd().fuzzy(false).pattern([{'action':'down'}]);
        let buttonDownEvent = jovo_state.alexaSkill().gameEngine().getEventsBuilder('buttonDownEvent').meets(['buttonDownRecognizer']).reportsMatches().shouldEndInputHandler(false).build();
        let timeoutEvent = jovo_state.alexaSkill().gameEngine().getEventsBuilder('timeoutEvent').meets(['timed out']).reportsNothing().shouldEndInputHandler(false).build();
        let proxies = ['btn1', 'btn2', 'btn3', 'btn4'];
        let timeout = 90000;
        jovo_state.alexaSkill().gameEngine().setEvents([buttonDownEvent, timeoutEvent]).setRecognizers([buttonDownRecognizer]).startInputHandler(timeout, proxies);

        jovo_state.alexaSkill().gameEngine().respond('Great! Lets get ' + question_response + ' buttons set up for the game! Player one, please press your button.');

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

        let buttonDownRecognizer = jovo_state.alexaSkill().gameEngine().getPatternRecognizerBuilder('buttonDownRecognizer').anchorEnd().fuzzy(false).pattern([{'action':'down'}]);
        let buttonDownEvent = jovo_state.alexaSkill().gameEngine().getEventsBuilder('buttonDownEvent').meets(['buttonDownRecognizer']).reportsMatches().shouldEndInputHandler(false).build();
        let timeoutEvent = jovo_state.alexaSkill().gameEngine().getEventsBuilder('timeoutEvent').meets(['timed out']).reportsNothing().shouldEndInputHandler(false).build();
        let proxies = ['btn1', 'btn2', 'btn3', 'btn4'];
        let timeout = 90000;
        jovo_state.alexaSkill().gameEngine().setEvents([buttonDownEvent, timeoutEvent]).setRecognizers([buttonDownRecognizer]).startInputHandler(timeout, proxies);

        jovo_state.alexaSkill().gameEngine().respond(speech);

      } else {
        // ask the next player to register their button
        speech.addText('Thanks! Player ' + (current_count + 1) + ', please press your button.');

        let buttonDownRecognizer = jovo_state.alexaSkill().gameEngine().getPatternRecognizerBuilder('buttonDownRecognizer').anchorEnd().fuzzy(false).pattern([{'action':'down'}]);
        let buttonDownEvent = jovo_state.alexaSkill().gameEngine().getEventsBuilder('buttonDownEvent').meets(['buttonDownRecognizer']).reportsMatches().shouldEndInputHandler(false).build();
        let timeoutEvent = jovo_state.alexaSkill().gameEngine().getEventsBuilder('timeoutEvent').meets(['timed out']).reportsNothing().shouldEndInputHandler(false).build();
        let proxies = ['btn1', 'btn2', 'btn3', 'btn4'];
        let timeout = 90000;
        jovo_state.alexaSkill().gameEngine().setEvents([buttonDownEvent, timeoutEvent]).setRecognizers([buttonDownRecognizer]).startInputHandler(timeout, proxies);

        jovo_state.alexaSkill().gameEngine().respond(speech);

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
      // TODO start at the player after current_player (and loop around list)
      if (current_turn == 0) {
        // start with player two
        awaiting_answer_from = 1;
      } else {
        // start with player one
        awaiting_answer_from = 0;
      }
      jovo_state.setSessionAttribute('awaiting_answer_from', awaiting_answer_from);
      jovo_state.setSessionAttribute('active_button', players[awaiting_answer_from]['button_id']);
      jovo_state.setSessionAttribute('listen_for', 'round_answer');

      speech.addText(players[awaiting_answer_from]['player_name'] + ' please press your button.');

      let buttonDownRecognizer = jovo_state.alexaSkill().gameEngine().getPatternRecognizerBuilder('buttonDownRecognizer').anchorEnd().fuzzy(false).pattern([{'action':'down'}]);
      let buttonDownEvent = jovo_state.alexaSkill().gameEngine().getEventsBuilder('buttonDownEvent').meets(['buttonDownRecognizer']).reportsMatches().shouldEndInputHandler(false).build();
      let timeoutEvent = jovo_state.alexaSkill().gameEngine().getEventsBuilder('timeoutEvent').meets(['timed out']).reportsNothing().shouldEndInputHandler(false).build();
      let proxies = ['btn1', 'btn2', 'btn3', 'btn4'];
      let timeout = 90000;
      jovo_state.alexaSkill().gameEngine().setEvents([buttonDownEvent, timeoutEvent]).setRecognizers([buttonDownRecognizer]).startInputHandler(timeout, proxies);

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
        if (awaiting_answer_from == current_turn) {
          // skip the player who did the counting
          awaiting_answer_from++;
        }
        jovo_state.setSessionAttribute('awaiting_answer_from', awaiting_answer_from);
        jovo_state.setSessionAttribute('active_button', players[awaiting_answer_from]['button_id']);
        jovo_state.setSessionAttribute('listen_for', 'round_answer');

        speech.addText(players[awaiting_answer_from]['player_name'] + ' please press your button.');

        let buttonDownRecognizer = jovo_state.alexaSkill().gameEngine().getPatternRecognizerBuilder('buttonDownRecognizer').anchorEnd().fuzzy(false).pattern([{'action':'down'}]);
        let buttonDownEvent = jovo_state.alexaSkill().gameEngine().getEventsBuilder('buttonDownEvent').meets(['buttonDownRecognizer']).reportsMatches().shouldEndInputHandler(false).build();
        let timeoutEvent = jovo_state.alexaSkill().gameEngine().getEventsBuilder('timeoutEvent').meets(['timed out']).reportsNothing().shouldEndInputHandler(false).build();
        let proxies = ['btn1', 'btn2', 'btn3', 'btn4'];
        let timeout = 90000;
        jovo_state.alexaSkill().gameEngine().setEvents([buttonDownEvent, timeoutEvent]).setRecognizers([buttonDownRecognizer]).startInputHandler(timeout, proxies);

        jovo_state.alexaSkill().gameEngine().respond(speech);
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
        // start next round; randomly pick which player we want to have the turn
        let current_turn = Math.floor(Math.random() * (players.length - 0) + 0);

        // TODO make sure we don't pick the same player that just went

        jovo_state.setSessionAttribute('answers', []);
        jovo_state.setSessionAttribute('current_turn', current_turn);
        jovo_state.setSessionAttribute('active_button', players[current_turn]['button_id']);
        jovo_state.setSessionAttribute('listen_for', 'lie_instructions');

        // instruct the current player to open their eyes and register that they are ready for additional instructions
        speech.addText('Moving on to the next round. All players, please close your eyes now.');
        speech.addBreak('300ms').addText(players[current_turn]['player_name'] + ' open your eyes, confirm that all other player eyes are closed, and then push your button.');

        let buttonDownRecognizer = jovo_state.alexaSkill().gameEngine().getPatternRecognizerBuilder('buttonDownRecognizer').anchorEnd().fuzzy(false).pattern([{'action':'down'}]);
        let buttonDownEvent = jovo_state.alexaSkill().gameEngine().getEventsBuilder('buttonDownEvent').meets(['buttonDownRecognizer']).reportsMatches().shouldEndInputHandler(false).build();
        let timeoutEvent = jovo_state.alexaSkill().gameEngine().getEventsBuilder('timeoutEvent').meets(['timed out']).reportsNothing().shouldEndInputHandler(false).build();
        let proxies = ['btn1', 'btn2', 'btn3', 'btn4'];
        let timeout = 90000;
        jovo_state.alexaSkill().gameEngine().setEvents([buttonDownEvent, timeoutEvent]).setRecognizers([buttonDownRecognizer]).startInputHandler(timeout, proxies);

        jovo_state.alexaSkill().gameEngine().respond(speech);

      } else {
        // END THE GAME
        jovo_state.tell('OK. Until next time, thanks for playing!');

      }

    }

  },

  'END': function() {
    let jovo_state = this;
    jovo_state.tell('Thanks for playing!');
  },

  'LAUNCH': function() {
    this.toIntent('WelcomeIntent');
  },

  'ON_GAME_ENGINE_INPUT_HANDLER_EVENT': function () {
    let jovo_state = this;

    jovo_state.alexaSkill().gameEngine().stopInputHandler();

    try {

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

      if (button_count > 1) {

        let current_count = players.length;

        let input_event = jovo_state.request().getEvents()[0];
        let input_event_name = input_event.name;

        if (input_event_name == 'timeoutEvent') {
          /********************************
          DEAL WITH BUTTON TIMEOUT
          ********************************/
          // TODO determine what instructions we should repeat;
          console.log('timedout event');
          // let speech = jovo_state.speechBuilder().addText('Beep');
          // jovo_state.alexaSkill().gameEngine().respond(speech);

        } else if (input_event_name == 'buttonDownEvent') {
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
            // assign this button to this user
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
                // ignore this button press; because not the right person
                console.log('wrong player pushed button');

                let buttonDownRecognizer = jovo_state.alexaSkill().gameEngine().getPatternRecognizerBuilder('buttonDownRecognizer').anchorEnd().fuzzy(false).pattern([{'action':'down'}]);
                let buttonDownEvent = jovo_state.alexaSkill().gameEngine().getEventsBuilder('buttonDownEvent').meets(['buttonDownRecognizer']).reportsMatches().shouldEndInputHandler(false).build();
                let timeoutEvent = jovo_state.alexaSkill().gameEngine().getEventsBuilder('timeoutEvent').meets(['timed out']).reportsNothing().shouldEndInputHandler(false).build();
                let proxies = ['btn1', 'btn2', 'btn3', 'btn4'];
                let timeout = 90000;
                jovo_state.alexaSkill().gameEngine().setEvents([buttonDownEvent, timeoutEvent]).setRecognizers([buttonDownRecognizer]).startInputHandler(timeout, proxies);

                // let speech = jovo_state.speechBuilder().addText('Beep');
                // jovo_state.alexaSkill().gameEngine().respond(speech);

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

                  let buttonDownRecognizer = jovo_state.alexaSkill().gameEngine().getPatternRecognizerBuilder('buttonDownRecognizer').anchorEnd().fuzzy(false).pattern([{'action':'down'}]);
                  let buttonDownEvent = jovo_state.alexaSkill().gameEngine().getEventsBuilder('buttonDownEvent').meets(['buttonDownRecognizer']).reportsMatches().shouldEndInputHandler(false).build();
                  let timeoutEvent = jovo_state.alexaSkill().gameEngine().getEventsBuilder('timeoutEvent').meets(['timed out']).reportsNothing().shouldEndInputHandler(false).build();
                  let proxies = ['btn1', 'btn2', 'btn3', 'btn4'];
                  let timeout = 90000;
                  jovo_state.alexaSkill().gameEngine().setEvents([buttonDownEvent, timeoutEvent]).setRecognizers([buttonDownRecognizer]).startInputHandler(timeout, proxies);

                  jovo_state.alexaSkill().gameEngine().respond(speech);

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

                  // flash the button correct truth color, then yellow flash_count times
                  jovo_state.alexaSkill().gadgetController().setNoneTriggerEvent().setAnimations(
                    [
                      {
                        "repeat": 1,
                        "targetLights":["1"],
                        "sequence": sequence
                      }
                    ]
                  ).setLight([button_id], 0, []);

                  // ask the current player to say how many times the button flashed
                  let speech = jovo_state.speechBuilder().addText('When you see the red light, please say the number of yellow flashes you counted.');
                  jovo_state.ask(speech, 'How many yellow flashes did you see?');

                } else if (listen_for == 'round_answer') {
                  /********************************
                  ROUND ANSWER - SET THE ACTIVE BUTTON
                  ********************************/
                  // set the active button
                  jovo_state.setSessionAttribute('active_button', button_id);

                  let speech = jovo_state.speechBuilder().addText(players[awaiting_answer_from]['player_name'] + ' did ' + players[current_turn]['player_name'] + ' tell the truth or a lie?');
                  jovo_state.ask(speech, speech);

                }
              }

            } else {
              // this button was already assigned to a player! Give them a buzz sound and move on.
              // let speech = jovo_state.speechBuilder().addText('It seems like we already know about this button. Please push a button that you haven\'t set up for this round yet.');

              let buttonDownRecognizer = jovo_state.alexaSkill().gameEngine().getPatternRecognizerBuilder('buttonDownRecognizer').anchorEnd().fuzzy(false).pattern([{'action':'down'}]);
              let buttonDownEvent = jovo_state.alexaSkill().gameEngine().getEventsBuilder('buttonDownEvent').meets(['buttonDownRecognizer']).reportsMatches().shouldEndInputHandler(false).build();
              let timeoutEvent = jovo_state.alexaSkill().gameEngine().getEventsBuilder('timeoutEvent').meets(['timed out']).reportsNothing().shouldEndInputHandler(false).build();
              let proxies = ['btn1', 'btn2', 'btn3', 'btn4'];
              let timeout = 90000;
              jovo_state.alexaSkill().gameEngine().setEvents([buttonDownEvent, timeoutEvent]).setRecognizers([buttonDownRecognizer]).startInputHandler(timeout, proxies);

              // jovo_state.alexaSkill().gameEngine().respond(speech);

            }
          }

        }
      }
    } catch(ex) {
      console.log('error');
    }
  },

  'WelcomeIntent': function() {
    // welcome the user; ask for button count
    let jovo_state = this;

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
