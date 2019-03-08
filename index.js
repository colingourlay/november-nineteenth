const Twitter = require('twitter');
const config = require('./config');

const IS_DEV = process.env.NODE_ENV === 'development';
const FATHER = 'Herring1967';
const PHRASES = ['', "'", '’'].map(x => `international men${x}s day`).join(',');
const PHRASES_REGEX = /international men('|‘|’)?s day/;
const QUESTIONS_REGEX = /when|why/;
const FALSE_POSITIVES_REGEX = /guy|bro|dude|who|was|ask|tweet|tell|say|know|nov|19|richard|herring|find/;
const REPEAT_REGEX = /international|day/g;
const SINGLE_QUOTES_REGEX = /'|‘|’/g;
const DOUBLE_QUOTES_REGEX = /"|“|”/g;
const UPPERCASE_CHARACTERS_REGEX = /[A-Z]/g;
const TEMPLATES = [
  "International Men's Day is November 19th. Only {{days}} sleeps to go! 💤",
  "Hey {{name}}, International Men's Day is November 19th.",
  "International Men's Day is November 19th. Only {{days}} days to plan your awareness campaign! 📣",
  "I have great news for you, {{name}}. International Men's Day is November 19th.",
  "International Men's Day is November 19th. I'm counting on you to spread the word, {{name}}.",
  "On November 19th all your dreams will come true. It'll be International Men's Day!",
  "International Men's Day is November 19th. I hope you've started planning your men's charity fundraiser! 💰",
  "You only have to wait {{days}} days! International Men's Day is November 19th.",
  "International Men's Day is November 19th, only {{days}} days away! Get excited, {{name}}!!!",
  "Clear your schedule on November 19th, {{name}}. It's International Men's Day, and we're gonna party! 🎉"
];
const ONE_DAY = 1000 * 60 * 60 * 24;
const NOOP = function() {};

let nextTemplateIndex = 0;

const twitter = new Twitter(config.twitter);

twitter.stream('statuses/filter', { track: PHRASES }, onStream);

function onStream(stream) {
  stream.on('data', onTweet);
  stream.on('error', NOOP);
}

function onTweet(tweet) {
  const text = (tweet.truncated ? tweet.extended_tweet.full_text : tweet.text).toLowerCase();

  if (
    text.match(PHRASES_REGEX) === null ||
    tweet.retweeted_status != null ||
    tweet.user.screen_name === FATHER ||
    text.match(QUESTIONS_REGEX) === null ||
    text.match(FALSE_POSITIVES_REGEX) !== null ||
    checkRepeated(text) ||
    checkQuotes(text) ||
    checkSpongemock(text) ||
    checkAwareness(text) ||
    checkLinks(tweet) ||
    checkWhitelist(tweet.user.screen_name)
  ) {
    return;
  }

  setTimeout(reply, IS_DEV ? 1000 : 60000, tweet);
}

function reply(tweet) {
  const status = getNextTemplate()
    .replace('{{name}}', tweet.user.name.split(' ')[0])
    .replace('{{days}}', getDays());

  if (IS_DEV) {
    console.log('Tweet from @' + tweet.user.screen_name + ': "' + (tweet.truncated || tweet.text) + '"');
    console.log('Replying with: "' + status + '"');
  }

  twitter.post(
    'statuses/update',
    {
      in_reply_to_status_id: tweet.id_str,
      status: '@' + tweet.user.screen_name + ' ' + status
    },
    NOOP
  );
}

function getNextTemplate() {
  const template = TEMPLATES[nextTemplateIndex++];

  if (nextTemplateIndex >= TEMPLATES.length) {
    nextTemplateIndex = 0;
  }

  return template;
}

function getDays() {
  const today = new Date();
  const imd = new Date(today.getFullYear(), 10, 19);

  if ((today.getMonth() == 10 && today.getDate() > 19) || today.getMonth() > 10) {
    imd.setFullYear(imd.getFullYear() + 1);
  }

  return Math.ceil((imd.getTime() - today.getTime()) / ONE_DAY);
}

function checkWhitelist(screen_name) {
  if (!IS_DEV || !Array.isArray(config.whitelist) || !config.whitelist.length) {
    return;
  }

  return config.whitelist.indexOf(screen_name) < 0;
}

function checkSpongemock(text) {
  const openingText = text.slice(0, 48);

  return (openingText.match(UPPERCASE_CHARACTERS_REGEX) || 'A').length / openingText.length > 0.25;
}

function checkRepeated(text) {
  const repeats = text.match(REPEAT_REGEX);

  if (repeats && repeats.length > 1 && repeats.length > Array.from(new Set(repeats)).length) {
    return true;
  }
}

function checkQuotes(text) {
  const singleQuotes = text.match(SINGLE_QUOTES_REGEX) || [];
  const doubleQuotes = text.match(DOUBLE_QUOTES_REGEX) || [];

  return singleQuotes.length > 2 || doubleQuotes.length > 1;
}

function checkAwareness(text) {
  const lastIndexOfIs = text.lastIndexOf(' is ');

  return lastIndexOfIs > -1 && lastIndexOfIs > text.indexOf('day');
}

function checkLinks(tweet) {
  return (
    (tweet.media && tweet.media.length) || (tweet.entities && tweet.entities.urls.length > 0 && !tweet.quoted_status)
  );
}
