/* 
 * twitter-scrape
 * --------------
 * Author: Tim Coppieters
 *
 * Minor functions that help you to scrape tweets and followers from twitter,
 * since the twitter api has limits on the number of tweets/followers one can request at
 * the same time.
 * It also incorporates the maximum number of requests/15min that can be made by backing off
 * and trying again later.
 */

var DELAY = 5 * 60 * 1000;


/*
 * getTweets(T, user_id, max_tweets, finish)
 * ***********************
 * Gets all tweets of given user and calls callback with the array of tweets.
 * Possibly waits until the max #requests/15min rate has passed, so can take a while.
 */
function getTweets(T, user_id, max_tweets, finish) {
  return getTweetsIt(T, user_id, [], max_tweets, finish);
}

function getTweetsIt(T, user_id, tweets, max_tweets, finish) {
  var max_id;
  // Find the smallest tweet id to get tweets starting from there.
  if (tweets.length > 0) {
    max_id = smallest_id(tweets);
  }
  // Otherwise, max_id = undefined and will start from oldest tweet

  // Request 200 tweets, starting from oldest tweet (smallest id) to older tweets.
  T.get('statuses/user_timeline', { user_id: user_id, count: 200, max_id: max_id }, function(err, data) {
    
    // Reached the 160 requests/15 min rate, suspend and try again later.
    if (err) { 
      console.log(err);
      if (err.statusCode === 429) {
        delay(function () {
          getTweets(T, user_id, tweets, max_tweets, finish);
        });
      }
      return;
    }

    // Tweets received, add them to the list.
    // console.log('tweets for ' + user.screen_name + "("+ user.id + '): ' + data.length);
    tweets = tweets.concat(data);
    
    // We are at the end of this perons's tweets or have the max number of tweets, finish.
    if (data.length < 50 || tweets.length >= max_tweets) {
      return finish(tweets);
    }

    // Otherwise, continue retrieving tweets of this user.
    getTweetsIt(T, user_id, tweets, max_tweets, finish);
  });
}


/*
 * GetFollowers(T, user_id, max_followers, finish)
 * Gets all followers of given user and calls the callback with the array of followers.
 * Possibly waits until the max #requests/15min rate has passed, so can take a while.
 */
function getFollowers(T, user_id, max_followers, finish) {
  return getFollowersIt(T, user_id, [], -1, max_followers, finish);
}

//   return getFollowersIt(user, -1, finish);
// }
//    T.get('followers/list', {user_id: user.id, count: 10}, function (err, data) {
//     if (err) {
//       console.log(err);
//       return delay(function () {
//         getFollowers(user, finish);
//       });
//     }

//     user.followers_ids = data.users.map(function (user) { 
//       return user.id;
//     });
//     finish(data.users);
//   });
// }

function getFollowersIt(T, user_id, followers, cursor, max_followers, finish) {
  if (followers.length >= max_followers) {
    return finish(followers);
  }

  T.get('followers/list', {user_id: user_id, cursor: cursor}, function (err, data) {
    if (err) {
      console.log(err);
      return delay(function () {
        getFollowersIt(T, user_id, followers, cursor, max_followers, finish);
      });
    }

    // user.followers_ids = data.users.map(function (user) { 
    //   return user.id;
    // });
    // finish(data.users);
    followers = followers.concat(data.users);
    getFollowersIt(T, user_id, followers, data.next_cursor, max_followers, finish);
  });
}

/*
 * Auxiliary
 */

function smallest_id(tweets) {
  if (tweets.length === 0) {
    return undefined;
  }
  return tweets.reduce(function (min, curr) {
    return Math.min(min, curr.id);
  }, Infinity);
}

function delay(cb) {
  console.log('waiting ' + DELAY);
  setTimeout(function () {
    cb();
  }, DELAY);
}


module.exports = {
  tweets: getTweets,
  followers: getFollowers
};