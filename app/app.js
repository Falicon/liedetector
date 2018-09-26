'use strict';

const {App} = require('jovo-framework');
const config = {
  logging: false
};
const app = new App(config);

app.setHandler({

  'AnswerIntent': function(questionResponse) {
    let jovo_state = this;
    let question_response = questionResponse.value;

    let active_button = jovo_state.getSessionAttribute('active_button');
    let awaiting_answer_from = jovo_state.getSessionAttribute('awaiting_answer_from');
    let button_count = jovo_state.getSessionAttribute('button_count');
    let current_turn = jovo_state.getSessionAttribute('current_turn');
    let flash_answer = jovo_state.getSessionAttribute('flash_answer');
    let flash_count = jovo_state.getSessionAttribute('flash_count');
    let in_game = jovo_state.getSessionAttribute('in_game');
    let listen_for = jovo_state.getSessionAttribute('listen_for');
    let players = jovo_state.getSessionAttribute('players');
    let telling = jovo_state.getSessionAttribute('telling');

    // console.log('----------------------------------');
    // console.log(active_button);
    // console.log(awaiting_answer_from);
    // console.log(button_count);
    // console.log(current_turn);
    // console.log(flash_answer);
    // console.log(flash_count);
    // console.log(in_game);
    // console.log(listen_for);
    // console.log(players);
    // console.log(telling);
    // console.log('----------------------------------');

    let current_count = players.length;

    if (listen_for == 'button_count') {
      /********************************
      GET THE NUMBER OF BUTTONS WE SHOULD SET UP
      ********************************/
      // We want to start the setup phase, so ask the users to push a button and provide a name;
      jovo_state.setSessionAttribute('button_count', question_response);
      jovo_state.setSessionAttribute('listen_for', 'player_name');
      jovo_state.ask('Great! Lets get ' + question_response + ' buttons set up! Player one, please press your button.');

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
        let speech = jovo_state.speechBuilder().addText('Great! We are ready to start the game!');

        // randomly pick which player we want to have the turn
        let current_turn = Math.floor(Math.random() * (players.length - 0) + 0);
        jovo_state.setSessionAttribute('current_turn', current_turn);
        speech.addText('All players, please close your eyes now.');

        // instruct the current player to open their eyes and register that they are ready for additional instructions
        jovo_state.setSessionAttribute('listen_for', 'lie_instructions');
        speech.addBreak('300ms').addText(players[current_turn.toString()]['player_name'] + ' open your eyes, confirm that all other player eyes are closed, and then push your button.');

        jovo_state.alexaSkill().gameEngine().respond(speech);

      } else {
        // ask the next player to register their button
        let speech = jovo_state.speechBuilder().addText('Thanks! Player ' + current_count + 1 + ', please press your button.');
        jovo_state.alexaSkill().gameEngine().respond(speech);

      }

    } else if (listen_for == 'flash_answer') {
      /********************************
      ANSWER HOW MANY FLASHES WERE COUNTED
      ********************************/
      // in this situation, question_response should be the count of blue flashes
      flash_answer = parseInt(question_response);
      jovo_state.setSessionAttribute('flash_answer', flash_answer);
      let speech = jovo_state.speechBuilder();

      // check if the current player followed instructions (either lied or told the truth properly)
      let followed_instructions = false;
      if (telling == 'tell the truth' && flash_answer == flash_count) {
        followed_instructions = true;
      } else if (telling == 'lie' && flash_answer != flash_count) {
        followed_instructions = true;
      }

      // if they didn't follow instructions, the automatically lose this round!
      if (!followed_instructions) {
        // didn't follow instructions; automatically lose this round!
        // tell everyone to open their eyes
        speech.addText('Everyone please open your eyes and look sternly at ' + players[current_player.toString()]['player_name'] + ' as they can\'t seem to follow simple instructions!').addBreak('100ms');

        // award points and reveal results
        speech.addText('We flashed the button blue ' + flash_count + ' times. They were supposed to ' + telling + ' but didn\'t.').addBreak('100ms');
        speech.addText('Everyone but ' + players[current_player.toString()]['player_name'] + ' earns one point').addBreak('100ms');
        for (var i = 0; i < players.length; i++) {
          if (i != current_player) {
            players[i.toString()]['points'] += 1;
          }
        }
        jovo_state.setSessionAttribute('players', players);

        // TODO determine if we should continue the game or not (hit round count limit)

        // start next round; randomly pick which player we want to have the turn
        let current_turn = Math.floor(Math.random() * (players.length - 0) + 0);
        jovo_state.setSessionAttribute('current_turn', current_turn);
        speech.addText('Moving on to the next round. All players, please close your eyes now.');

        // instruct the current player to open their eyes and register that they are ready for additional instructions
        jovo_state.setSessionAttribute('listen_for', 'lie_instructions');
        speech.addBreak('300ms').addText(players[current_turn]['player_name'] + ' open your eyes, confirm that all other player eyes are closed, and then push your button.');

        jovo_state.alexaSkill().gameEngine().respond(speech);

      } else {
        // tell everyone to open their eyes
        speech.addText('Everyone please open your eyes.').addBreak('100ms');

        // go around the player list (for everyone but current player; and ask them to push their button and say if they think the current player is lying or telling the truth)
        speech.addText('We are now going to ask each of you if you think ' + players[current_player]['player_name'] + ' is lying or telling the truth.');
        if (current_player == 0) {
          // start with player two
          awaiting_answer_from = 1;
        } else {
          // start with player one
          awaiting_answer_from = 0;
        }
        jovo_state.setSessionAttribute('awaiting_answer_from', awaiting_answer_from);
        jovo_state.setSessionAttribute('listen_for', 'round_answer');

        speech.addText(players[awaiting_answer_from.toString()]['player_name'] + ' please press your button and then say either truth or lie.');

        jovo_state.alexaSkill().gameEngine().respond(speech);

      }

    } else if (listen_for == 'round_answer') {
      /********************************
      TAKE AN ANSWER FROM A GIVEN USER
      ********************************/
      // question_response should either be truth or lie
      // TODO determine if this player gets points or not;
      // TODO determine if we are ready to move the next round or not
      // TODO if not ready for next round, ask the next player to respond
      // TODO determine if we should continue the game or not (hit round count limit)
      // TODO if ready for next round; start next round; randomly pick which player we want to have the turn

    }

  },

  'END': function() {
    // let jovo_state = this;
    // jovo_state.tell('Thanks for playing!');
  },

  'LAUNCH': function() {
    this.toIntent('WelcomeIntent');
  },

  'ON_GAME_ENGINE_INPUT_HANDLER_EVENT': function () {
    let jovo_state = this;

    let active_button = jovo_state.getSessionAttribute('active_button');
    let awaiting_answer_from = jovo_state.getSessionAttribute('awaiting_answer_from');
    let button_count = jovo_state.getSessionAttribute('button_count');
    let current_turn = jovo_state.getSessionAttribute('current_turn');
    let flash_answer = jovo_state.getSessionAttribute('flash_answer');
    let flash_count = jovo_state.getSessionAttribute('flash_count');
    let in_game = jovo_state.getSessionAttribute('in_game');
    let listen_for = jovo_state.getSessionAttribute('listen_for');
    let players = jovo_state.getSessionAttribute('players');
    let telling = jovo_state.getSessionAttribute('telling');

    // console.log('----------------------------------');
    // console.log(active_button);
    // console.log(awaiting_answer_from);
    // console.log(button_count);
    // console.log(current_turn);
    // console.log(flash_answer);
    // console.log(flash_count);
    // console.log(in_game);
    // console.log(listen_for);
    // console.log(players);
    // console.log(telling);
    // console.log('----------------------------------');

    let current_count = players.length;

    let input_event = jovo_state.request().getEvents()[0];
    let input_event_name = input_event.name;

    if (input_event_name == 'timeoutEvent') {
      /********************************
      DEAL WITH BUTTON TIMEOUT
      ********************************/
      // TODO determine what instructions we should repeat;
      console.log('timedout event');

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
          // TODO make sure the person pressing the button is the current_player

          if (listen_for == 'lie_instructions') {
            /********************************
            LIE INSTRUCTIONS
            ********************************/
            // give the current player with their eyes open instructions on what we want
            let speech = jovo_state.speechBuilder().addText('We are going to first flash your button either green or red followed by a set of blue flashes that you should count.');
            speech.addBreak('100ms').addText('If we start with a green flash, you should tell the truth about the number of blue flashes. If we start with a red flash, you should lie about the number of blue flashes you count.');
            speech.addBreak('100ms').addText('Press your button when you are ready for us to start.');
            jovo_state.setSessionAttribute('listen_for', 'start_flash');
            jovo_state.alexaSkill().gameEngine().respond(speech);

          } else if (listen_for == 'start_flash') {
            /********************************
            START FLASHING
            ********************************/
            // randomly determine if we want them to lie or tell the truth here
            jovo_state.setSessionAttribute('listen_for', 'flash_answer');

            let truth_slot = Math.floor(Math.random() * (2 - 0) + 0);
            let telling = 'tell the truth';
            let flash_color = '00FF00';
            if (truth_slot == 1) {
              telling = 'lie';
              flash_color = 'FF0000';
            }
            jovo_state.setSessionAttribute('telling', telling);

            // randomly determine how many times we want to flash the button
            let flash_count = Math.floor(Math.random() * (8 - 1) + 1);
            jovo_state.setSessionAttribute('flash_count', flash_count);

            console.log('telling ' + telling);
            console.log('flashing ' + flash_count);

            let sequence = [
              {'durationMs': 1000, 'color': flash_color, 'blend': true},
              {'durationMs': 1000, 'color': 'FFFFFF', 'blend': true}
            ];
            for (var i = 0; i < flash_count; i++) {
              sequence.push({'durationMs': 1000, 'color': '0000FF', 'blend': true});
              sequence.push({'durationMs': 1000, 'color': 'FFFFFF', 'blend': true});
            }
            sequence.push({'durationMs': 1000, 'color': 'FFA500', 'blend': true});

            // flash the button correct truth color, then blue flash_count times
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
            let speech = jovo_state.speechBuilder().addText('When you see the orange light, please say the number of blue flashes you counted. But remember to either lie or tell the truth as you were instructed!');
            jovo_state.alexaSkill().gameEngine().respond(speech);

          } else if (listen_for == 'round_answer') {
            /********************************
            ROUND ANSWER - SET THE ACTIVE BUTTON
            ********************************/
            // set the active button
            jovo_state.setSessionAttribute('active_button', button_id);

          }

        } else {
          // this button was already assigned to a player! Give them a buzz sound and move on.
          let speech = jovo_state.speechBuilder().addText('It seems like we already know about this button. Please push a button that you haven\'t set up for this round yet.');
          jovo_state.alexaSkill().gameEngine().response(speech);
        }
      }

    }
  },

  'WelcomeIntent': function() {
    // welcome the user; ask for button count
    let jovo_state = this;

    const buttonDownRecognizer = jovo_state.alexaSkill().gameEngine().getPatternRecognizerBuilder('buttonDownRecognizer').anchorEnd().fuzzy(false).pattern([{'action':'down'}]);
    const buttonDownEvent = jovo_state.alexaSkill().gameEngine().getEventsBuilder('buttonDownEvent').meets(['buttonDownRecognizer']).reportsMatches().shouldEndInputHandler(false).build();
    const timeoutEvent = jovo_state.alexaSkill().gameEngine().getEventsBuilder('timeoutEvent').meets(['timed out']).reportsNothing().shouldEndInputHandler(true).build();
    const proxies = ['btn1', 'btn2', 'btn3', 'btn4'];
    const timeout = 90000;

    jovo_state.alexaSkill().gameEngine().setEvents([buttonDownEvent, timeoutEvent]).setRecognizers([buttonDownRecognizer]).startInputHandler(timeout, proxies);

    jovo_state.setSessionAttribute('active_button', '');
    jovo_state.setSessionAttribute('awaiting_answer_from', 0);
    jovo_state.setSessionAttribute('button_count', 2);
    jovo_state.setSessionAttribute('current_turn', 0);
    jovo_state.setSessionAttribute('flash_answer', 0);
    jovo_state.setSessionAttribute('flash_count', 0);
    jovo_state.setSessionAttribute('in_game', false);
    jovo_state.setSessionAttribute('listen_for', 'button_count');
    jovo_state.setSessionAttribute('players', []);
    jovo_state.setSessionAttribute('telling', 'tell the truth');

    jovo_state.ask(
      'Welcome to Lie Detector! This game requires Alexa buttons. Each player should have their own button, so how many players will there be?',
      'How many players do you want to play with?'
    );
  },

});

module.exports.app = app;
