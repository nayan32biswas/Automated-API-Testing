import http from "k6/http";
import { sleep, check } from "k6";

export const options = {
  vus: 10,
  duration: "10s",
};

export default function () {
  testFunction();
}

const API_URL = __ENV.API_URL;
const DEFAULT_USERNAME = __ENV.USERNAME;
const DEFAULT_PASSWORD = __ENV.PASSWORD;

const CHARACTERS =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const DEFAULT_LIMIT = 20;

const V1_URL = `${API_URL}/api/v1`;
const ENDPOINTS = {
  // User
  LOGIN_URL: `${V1_URL}/token`,
  REGISTRATION_URL: `${V1_URL}/registration`,
  ME_URL: `${V1_URL}/users`,
  USER_UPDATE_URL: `${V1_URL}/users/update`,
  // Posts
  TOPICS_URL: `${V1_URL}/topics`,
  POSTS_URL: `${V1_URL}/posts`,
  POST_DETAILS_URL: (slug) => `${V1_URL}/posts/${slug}`,
  POST_REACTIONS_URL: (slug) => `${V1_URL}/posts/${slug}/reactions`,
  COMMENTS_URL: (slug) => `${V1_URL}/posts/${slug}/comments`,
  COMMENTS_DETAILS_URL: (slug, commentId) =>
    `${V1_URL}/posts/${slug}/comments/${commentId}`,
  REPLIES_URL: (slug, commentId) =>
    `${V1_URL}/posts/${slug}/comments/${commentId}/replies`,
  REPLIES_DETAILS_URL: (slug, commentId, replyId) =>
    `${V1_URL}/posts/${slug}/comments/${commentId}/replies/${replyId}`,
};

function randomStr(length) {
  let result = "";

  let counter = 0;
  while (counter < length) {
    result += CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERS.length));
    counter += 1;
  }
  return result;
}
function randomInt(start, end) {
  return Math.floor(Math.random() * (end - start + 1) + start);
}
function isEmpty(obj) {
  if (obj === null) return true;
  if (obj === undefined) return true;

  if (Array.isArray(obj) && obj.length > 0) return false;
  if (Object.keys(obj).length === 0) return true;
  return false;
}
function getRandomObj(arr) {
  if (isEmpty(arr) === true) return null;
  return arr[randomInt(0, arr.length - 1)];
}
function getDescription(wordCount) {
  let words = [];
  for (let i = 0; i < wordCount; i++) {
    words.push(randomStr(randomInt(1, 10)));
  }
  return words.join(" ");
}
function shuffleArray(array) {
  let currentIndex = array.length;
  let randomIndex;

  while (currentIndex != 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

function testFunction() {
  let isAuthenticated = false;
  let userData = null;
  let payload = null;
  const reqOptions = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (Math.random() <= 0.05) {
    // User creation rate is 5%
    let username = randomStr(32);
    let password = randomStr(10);

    let payload = JSON.stringify({
      username,
      password,
      full_name: `${randomStr(6)} ${randomStr(5)}`,
    });

    let regRes = http.post(ENDPOINTS.REGISTRATION_URL, payload, reqOptions);
    check(regRes, {
      "User Created": (r) => r.status === 201,
    });
    userData = {
      username,
      password,
    };
  }

  if (Math.random() <= 0.5) {
    // 50% user will be authenticated user
    if (userData === null) {
      userData = {
        username: DEFAULT_USERNAME,
        password: DEFAULT_PASSWORD,
      };
    }

    payload = JSON.stringify({
      username: userData.username,
      password: userData.password,
    });

    sleep(1);
    let tokenRes = http.post(ENDPOINTS.LOGIN_URL, payload, reqOptions);
    check(tokenRes, {
      "Get token": (r) => r.status === 200,
    });
    if (tokenRes.status === 200) {
      isAuthenticated = true;
      userData.access_token = tokenRes.json().access_token;
      userData.refresh_token = tokenRes.json().refresh_token;
      reqOptions.headers["Authorization"] = `Bearer ${userData.access_token}`;
    } else {
      throw `Error to create username:${userData.username} status:${tokenRes.status}`;
    }
  }

  if (isAuthenticated === true) {
    let meRes = http.get(ENDPOINTS.ME_URL, reqOptions);
    userData.id = meRes.json().id;

    if (Math.random() <= 0.2) {
      // 20% of authenticated user will update there profile
      payload = JSON.stringify({
        full_name: `${randomStr(6)} ${randomStr(5)}`,
      });
      sleep(1);
      let userUpdateRes = http.patch(
        ENDPOINTS.USER_UPDATE_URL,
        payload,
        reqOptions
      );
      check(userUpdateRes, {
        "Update User Data": (r) => r.status === 200,
      });
    }
  }

  let postsRes = http.get(
    `${ENDPOINTS.POSTS_URL}?limit=${DEFAULT_LIMIT}`,
    reqOptions
  );
  let postObj = getRandomObj(postsRes.json().results);

  if (!isEmpty(postObj)) {
    sleep(1);
    let postDetailsRes = http.get(
      ENDPOINTS.POST_DETAILS_URL(postObj.slug),
      reqOptions
    );
    let post = postDetailsRes.json();

    let commentsRes = http.get(
      `${ENDPOINTS.POST_DETAILS_URL(post.slug)}?limit=${DEFAULT_LIMIT}`,
      reqOptions
    );
    let comments = commentsRes.json().results;
    if (isAuthenticated && Math.random() <= 0.5) {
      // 50% of authenticated user will add comment and reply
      payload = JSON.stringify({
        description: getDescription(randomInt(10, 100)),
      });

      sleep(1);
      let newCommentRes = http.post(
        ENDPOINTS.COMMENTS_URL(post.slug),
        payload,
        reqOptions
      );
      check(newCommentRes, {
        "Comment Created": (r) => r.status === 201,
      });
      sleep(1);

      let comment = newCommentRes.json();
      // if (isEmpty(comments) === false) {
      //   comment = getRandomObj(comments);
      // }

      let newReplies = [];

      payload = JSON.stringify({
        description: getDescription(randomInt(5, 50)),
      });
      for (let i = 0; i < randomInt(1, 5); i++) {
        sleep(1);
        let newReplyRes = http.post(
          ENDPOINTS.REPLIES_URL(post.slug, comment.id),
          payload,
          reqOptions
        );
        check(newReplyRes, {
          "Reply Created": (r) => r.status === 201,
        });
        newReplies.push(newReplyRes.json());
      }
      if (Math.random() <= 0.5) {
        // 50% of comment and reply will be update after creation.
        payload = JSON.stringify({
          description: "Updated --- " + getDescription(randomInt(5, 100)),
        });

        sleep(1);
        let updateCommentRes = http.put(
          ENDPOINTS.COMMENTS_DETAILS_URL(post.slug, comment.id),
          payload,
          reqOptions
        );
        check(updateCommentRes, {
          "Comment Updated": (r) => r.status === 200,
        });

        payload = JSON.stringify({
          description: "Updated --- " + getDescription(randomInt(5, 50)),
        });
        newReplies = shuffleArray(newReplies);
        let totalDelete = randomInt(0, newReplies.length);
        for (let i = 0; i < totalDelete; i++) {
          let reply = newReplies[i];

          sleep(0.5);
          let updateReplyRes = http.put(
            ENDPOINTS.REPLIES_DETAILS_URL(post.slug, comment.id, reply.id),
            payload,
            reqOptions
          );
          check(updateReplyRes, {
            "Reply Updated": (r) => r.status === 200,
          });
        }
      }

      if (Math.random() <= 0.5) {
        // 50% of comment and reply will be deleted after creation.

        newReplies = shuffleArray(newReplies);
        let totalDelete = randomInt(0, newReplies.length);
        for (let i = 0; i < totalDelete; i++) {
          let reply = newReplies[i];

          // Delete replies before deleting comment
          sleep(0.5);
          let delReplyRes = http.del(
            ENDPOINTS.REPLIES_DETAILS_URL(post.slug, comment.id, reply.id),
            {},
            reqOptions
          );
          check(delReplyRes, {
            "Reply Delete": (r) => r.status === 200,
          });
        }

        sleep(1);
        let delCommentRes = http.del(
          ENDPOINTS.COMMENTS_DETAILS_URL(post.slug, comment.id),
          {},
          reqOptions
        );
        check(delCommentRes, {
          "Comment Deleted": (r) => r.status === 200,
        });
      }
    }

    if (isAuthenticated && Math.random() <= 0.8) {
      // 80% of authenticated user will react on post
      sleep(1);
      let newReactionRes = http.post(
        ENDPOINTS.POST_REACTIONS_URL(post.slug),
        {},
        reqOptions
      );
      check(newReactionRes, {
        "Reaction added": (r) => r.status === 201,
      });

      if (Math.random() <= 0.3) {
        // 30% of reaction will be deleted
        sleep(1);
        let newReactionRes = http.del(
          ENDPOINTS.POST_REACTIONS_URL(post.slug),
          {},
          reqOptions
        );
        check(newReactionRes, {
          "Reaction removed": (r) => r.status === 200,
        });
      }
    }
  }

  if (isAuthenticated === true && Math.random() <= 0.3) {
    // 30% of user will create new posts

    sleep(1);

    if (Math.random() <= 0.1) {
      // 10% of user will create new posts
      payload = JSON.stringify({
        name: randomStr(2, 3),
      });
      let topicRes = http.post(ENDPOINTS.TOPICS_URL, payload, reqOptions);
      check(topicRes, {
        "Topic Created": (r) => r.status === 201,
      });
    }

    let topics = [];
    for (let i = 0; i < randomInt(1, 10); i++) {
      topics.push(randomStr(2, 3));
    }

    payload = JSON.stringify({
      title: getDescription(randomInt(2, 10)),
      publish_now: Math.random() <= 0.5,
      short_description: "Short description",
      description: { content: getDescription(randomInt(10, 50)) },
      cover_image: null,
      topics: topics,
    });

    sleep(1);
    let newPostRes = http.post(ENDPOINTS.POSTS_URL, payload, reqOptions);
    check(newPostRes, {
      "Post Created": (r) => r.status === 201,
    });
    let post = newPostRes.json();

    if (Math.random() <= 0.5) {
      // 50% of created posts will be updated
      for (let i = 0; i < randomInt(0, 3); i++) {
        payload = JSON.stringify({
          title: getDescription(randomInt(2, 10)),
          short_description: "Short description",
        });

        sleep(1);
        let updatePostRes = http.patch(
          ENDPOINTS.POST_DETAILS_URL(post.slug),
          payload,
          reqOptions
        );
        check(updatePostRes, {
          "Post Update": (r) => r.status === 200,
        });
      }
    }

    if (Math.random() <= 0.1) {
      // 10% of created posts will be deleted

      sleep(1);
      let delPostRes = http.del(
        ENDPOINTS.POST_DETAILS_URL(post.slug),
        {},
        reqOptions
      );
      check(delPostRes, {
        "Post Deleted": (r) => r.status === 200,
      });
    }
  }

  sleep(0.1);
}
