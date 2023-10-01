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
const CHARACTERS =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const TOTAL_POST = 100;
const DEFAULT_LIMIT = 20;

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

    let regRes = http.post(
      `${API_URL}/api/v1/registration`,
      payload,
      reqOptions
    );
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
        username: __ENV.USERNAME,
        password: __ENV.PASSWORD,
      };
    }

    payload = JSON.stringify({
      username: userData.username,
      password: userData.password,
    });

    sleep(1);
    let tokenRes = http.post(`${API_URL}/api/v1/token`, payload, reqOptions);
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
    let meRes = http.get(`${API_URL}/api/v1/me`, reqOptions);
    userData.id = meRes.json().id;

    if (Math.random() <= 0.2) {
      // 20% of authenticated user will update there profile
      payload = JSON.stringify({
        full_name: `${randomStr(6)} ${randomStr(5)}`,
      });
      sleep(1);
      let userUpdateRes = http.patch(
        `${API_URL}/api/v1/update-me`,
        payload,
        reqOptions
      );
      check(userUpdateRes, {
        "Update User Data": (r) => r.status === 200,
      });
    }
  }

  let postsRes = http.get(
    `${API_URL}/api/v1/posts?limit=${DEFAULT_LIMIT}`,
    reqOptions
  );
  let postObj = getRandomObj(postsRes.json().results);

  if (!isEmpty(postObj)) {
    sleep(1);
    let postDetailsRes = http.get(
      `${API_URL}/api/v1/posts/${postObj.slug}`,
      reqOptions
    );
    let post = postDetailsRes.json();

    let commentsRes = http.get(
      `${API_URL}/api/v1/posts/${post.slug}/comments?limit=${DEFAULT_LIMIT}`,
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
        `${API_URL}/api/v1/posts/${post.slug}/comments`,
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
          `${API_URL}/api/v1/posts/${post.slug}/comments/${comment.id}/replies`,
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
          `${API_URL}/api/v1/posts/${post.slug}/comments/${comment.id}`,
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
            `${API_URL}/api/v1/posts/${post.slug}/comments/${comment.id}/replies/${reply.id}`,
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
            `${API_URL}/api/v1/posts/${post.slug}/comments/${comment.id}/replies/${reply.id}`,
            {},
            reqOptions
          );
          check(delReplyRes, {
            "Reply Delete": (r) => r.status === 200,
          });
        }

        sleep(1);
        let delCommentRes = http.del(
          `${API_URL}/api/v1/posts/${post.slug}/comments/${comment.id}`,
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
        `${API_URL}/api/v1/posts/${post.slug}/reactions`,
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
          `${API_URL}/api/v1/posts/${post.slug}/reactions`,
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
      let topicRes = http.post(`${API_URL}/api/v1/topics`, payload, reqOptions);
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
      short_description: null,
      description: getDescription(randomInt(10, 50)),
      cover_image: null,
      topics: topics,
    });

    sleep(1);
    let newPostRes = http.post(`${API_URL}/api/v1/posts`, payload, reqOptions);
    check(newPostRes, {
      "Post Created": (r) => r.status === 201,
    });
    let post = newPostRes.json();

    if (Math.random() <= 0.5) {
      // 50% of created posts will be updated
      for (let i = 0; i < randomInt(0, 3); i++) {
        payload = JSON.stringify({
          title: getDescription(randomInt(2, 10)),
        });

        sleep(1);
        let updatePostRes = http.patch(
          `${API_URL}/api/v1/posts/${post.slug}`,
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
        `${API_URL}/api/v1/posts/${post.slug}`,
        {},
        reqOptions
      );
      check(delPostRes, {
        "Post Deleted": (r) => r.status === 200,
      });
    }
  }

  sleep(1);
}
