var Twitter = require('twitter');
var config = require('./config');

var PHRASE = 'international men\'s day';
var PHRASE_REGEX = new RegExp(PHRASE);
var QUESTIONS_REGEX = /what|when|why|how/;
var FALSE_POSITIVES_REGEX = /guy|bro|dude|who|ask|say|nov|19/;
var QUESTION_REPLIES = [
    'Hey {{name}}, International Men\'s Day is November 19th.',
    'International Men\'s Day is November 19th. Only {{days}} sleeps to go! 💤',
    'I have great news for you, {{name}}. International Men\'s Day is November 19th.',
    'On November 19th all your dreams will come true. It\'ll be International Men\'s Day! 👬',
    'You only have to wait {{days}} days! International Men\'s Day is November 19th.',
    'International Men\'s Day is November 19th, only {{days}} days away! Get excited, {{name}}!!!',
    'Clear your schedule on November 19th, {{name}}. It\'s International Men\'s Day, and we\'re gonna party! 🎉'
];
var FALSE_POSITIVE_REPLIES = [
    'I try to tell as many people as I can, but it\'s a lot of work.',
    'It\'s not easy, {{name}}, but someone\'s gotta spread the word.',
    'Tell me about it, {{name}}.',
    'The best I can do is try to reply to as many people with the date.'
];
var ONE_DAY= 1000 * 60 * 60 * 24;
var NOOP = function () {};

var twitter = new Twitter(config);
var nextQuestionReplyIndex = 0;
var nextFalsePositiveReplyIndex = 0;

function onStream(stream) {
    stream.on('data', onTweet);
    stream.on('error', onError);
}

function onTweet(tweet) {
    var text = tweet.text.toLowerCase();

    if (text.match(PHRASE_REGEX) === null ||
        text.match(QUESTIONS_REGEX) === null ||
        tweet.retweeted_status != null) {

        return;

    }

    if (text.match(FALSE_POSITIVES_REGEX) === null) {

        setTimeout(reply, 60000, tweet, false);

    } else {

        setTimeout(reply, 60000, tweet, true);

    }

}

function reply(tweet, isFalsePositive) {
    var status = (isFalsePositive ?
        FALSE_POSITIVE_REPLIES[nextFalsePositiveReplyIndex++] :
        QUESTION_REPLIES[nextQuestionReplyIndex++])
        .replace('{{name}}', tweet.user.name.split(' ')[0])
        .replace('{{days}}', days());

    if (nextFalsePositiveReplyIndex >= FALSE_POSITIVE_REPLIES.length) {
        nextFalsePositiveReplyIndex = 0;
    }

    if (nextQuestionReplyIndex >= QUESTION_REPLIES.length) {
        nextQuestionReplyIndex = 0;
    }

    console.log(tweet);

    console.log('Tweet from @' + tweet.user.screen_name + ': "' + tweet.text + '"');
    console.log('Replying with: "' + status + '"');

    twitter.post('statuses/update', {
        in_reply_to_status_id: tweet.id_str,
        status: '@' + tweet.user.screen_name + ' ' + status
    }, NOOP);
}

function days() {
    var today = new Date();
    var imd = new Date(today.getFullYear(), 10, 19);

    if (today.getMonth() == 10 && today.getDate() > 19 || today.getMonth() > 10) {
        imd.setFullYear(imd.getFullYear() + 1);
    }

    return Math.ceil((imd.getTime() - today.getTime()) / (ONE_DAY));
}

function onError(error) {
    throw error;
}

twitter.stream('statuses/filter', {track: PHRASE}, onStream);
