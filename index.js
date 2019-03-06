const Twitter = require('twitter');
const config = require('./config');

const IS_DEV = process.env.NODE_ENV === 'development';
const FATHER = 'Herring1967';
const PHRASE = "international men's day";
const PHRASE_REGEX = new RegExp(PHRASE);
const QUESTIONS_REGEX = /when|why/;
const FALSE_POSITIVES_REGEX = /"|guy|bro|dude|who|was|ask|tweet|tell|say|know|nov|19|richard|herring/;
const REPEAT_REGEX = /international|day/g;
const TEMPLATES = [
  "Hey {{name}}, International Men's Day is November 19th.",
  "International Men's Day is November 19th. Only {{days}} sleeps to go! 💤",
  "I have great news for you, {{name}}. International Men's Day is November 19th.",
  "On November 19th all your dreams will come true. It'll be International Men's Day! 👬",
  "You only have to wait {{days}} days! International Men's Day is November 19th.",
  "International Men's Day is November 19th, only {{days}} days away! Get excited, {{name}}!!!",
  "Clear your schedule on November 19th, {{name}}. It's International Men's Day, and we're gonna party! 🎉"
];
const IWD_FOOTER = ' #IWD2019 #BalanceForBetter';
const ONE_DAY = 1000 * 60 * 60 * 24;
const NOOP = function() {};

let nextTemplateIndex = 0;

const twitter = new Twitter(config.twitter);

twitter.stream('statuses/filter', { track: PHRASE }, onStream);

function onStream(stream) {
  stream.on('data', onTweet);
  stream.on('error', NOOP);
}

function onTweet(tweet) {
  const text = (tweet.truncated || tweet.text).toLowerCase();

  if (
    tweet.retweeted_status != null ||
    tweet.user.screen_name === FATHER ||
    text.match(PHRASE_REGEX) === null ||
    text.match(QUESTIONS_REGEX) === null ||
    text.match(FALSE_POSITIVES_REGEX) !== null ||
    checkRepeated(text) ||
    checkLinks(tweet) ||
    checkWhitelist(tweet.user.screen_name)
  ) {
    return;
  }

  setTimeout(reply, IS_DEV ? 1000 : 60000, tweet);
}

function reply(tweet) {
  const days = getDays();
  let status = getNextTemplate()
    .replace('{{name}}', tweet.user.name.split(' ')[0])
    .replace('{{days}}', days);

  // IWD is 256 days before IMD, so add IWD hashtags close to the date
  if (days < 264 && days > 254) {
    status += IWD_FOOTER;
  }

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

function checkRepeated(text) {
  const repeats = text.match(REPEAT_REGEX);

  if (repeats && repeats.length > 1 && repeats.length > Array.from(new Set(repeats)).length) {
    return true;
  }
}

function checkLinks(tweet) {
  return tweet.entities && tweet.entities.urls.length > 0 && !tweet.quoted_status;
}
