import http from "k6/http";
import { sleep, check } from "k6";

export const options = {
  stages: [
    { duration: "5s", target: 10 },
    { duration: "30s", target: 50 },
    { duration: "60s", target: 100 },
    { duration: "5s", target: 50 },
    { duration: "5s", target: 0 },
  ],
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
  ME_URL: `${V1_URL}/users/me`,
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

function registration(reqOptions) {
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

  const userData = {
    username,
    password,
  };

  return userData;
}
function userLogin(userData, reqOptions) {
  if (userData === null) {
    userData = {
      username: DEFAULT_USERNAME,
      password: DEFAULT_PASSWORD,
    };
  }

  let isAuthenticated = false;
  const payload = JSON.stringify({
    username: userData.username,
    password: userData.password,
  });

  sleep(0.5);
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

  return { isAuthenticated, userData };
}
function getMe(reqOptions, userData) {
  let meRes = http.get(ENDPOINTS.ME_URL, reqOptions);
  check(meRes, {
    "Get me": (r) => r.status === 200,
  });
  userData.id = meRes.json().id;

  return userData;
}
function updateUser(reqOptions) {
  const payload = JSON.stringify({
    full_name: `${randomStr(6)} ${randomStr(5)}`,
  });
  let userUpdateRes = http.patch(
    ENDPOINTS.USER_UPDATE_URL,
    payload,
    reqOptions
  );
  check(userUpdateRes, {
    "User Data Updated": (r) => r.status === 200,
  });
}

function createTopics(reqOptions) {
  const payload = JSON.stringify({
    name: randomStr(2, 3),
  });
  let topicRes = http.post(ENDPOINTS.TOPICS_URL, payload, reqOptions);
  check(topicRes, {
    "Topic Created": (r) => r.status === 201,
  });

  return topicRes.json();
}
function createPost(reqOptions) {
  let topics = [];
  for (let i = 0; i < randomInt(1, 10); i++) {
    topics.push(randomStr(2, 3));
  }

  const payload = JSON.stringify({
    title: getDescription(randomInt(2, 10)),
    publish_now: Math.random() <= 0.5,
    short_description: "Short description",
    description: { content: getDescription(randomInt(10, 50)) },
    cover_image: null,
    topics: topics,
  });

  let newPostRes = http.post(ENDPOINTS.POSTS_URL, payload, reqOptions);
  check(newPostRes, {
    "Post Created": (r) => r.status === 201,
  });
  let post = newPostRes.json();

  return post;
}
function getPosts(reqOptions) {
  let postsRes = http.get(
    `${ENDPOINTS.POSTS_URL}?limit=${DEFAULT_LIMIT}`,
    reqOptions
  );
  check(postsRes, {
    "Get Posts": (r) => r.status === 200,
  });

  return postsRes.json().results;
}
function getPostDetails(reqOptions, slug) {
  let postDetailsRes = http.get(ENDPOINTS.POST_DETAILS_URL(slug), reqOptions);
  check(postDetailsRes, {
    "Get Post Details": (r) => r.status === 200,
  });

  return postDetailsRes.json();
}
function updatePost(reqOptions, slug) {
  sleep(0.5);

  const payload = JSON.stringify({
    title: getDescription(randomInt(2, 10)),
    short_description: "Short description",
  });

  let updatePostRes = http.patch(
    ENDPOINTS.POST_DETAILS_URL(slug),
    payload,
    reqOptions
  );
  check(updatePostRes, {
    "Post Updated": (r) => r.status === 200,
  });
}
function deletePost(reqOptions, slug) {
  let delPostRes = http.del(ENDPOINTS.POST_DETAILS_URL(slug), {}, reqOptions);
  check(delPostRes, {
    "Post Deleted": (r) => r.status === 200,
  });
}
function getComments(reqOptions, slug) {
  let commentsRes = http.get(
    `${ENDPOINTS.POST_DETAILS_URL(slug)}?limit=${DEFAULT_LIMIT}`,
    reqOptions
  );
  check(commentsRes, {
    "Get Comments": (r) => r.status === 200,
  });
  let comments = commentsRes.json().results;

  return comments;
}
function createComment(reqOptions, slug) {
  const payload = JSON.stringify({
    description: getDescription(randomInt(10, 100)),
  });

  let newCommentRes = http.post(
    ENDPOINTS.COMMENTS_URL(slug),
    payload,
    reqOptions
  );
  check(newCommentRes, {
    "Comment Created": (r) => r.status === 201,
  });

  return newCommentRes.json();
}
function updateComment(reqOptions, slug, commentId) {
  const payload = JSON.stringify({
    description: "Updated --- " + getDescription(randomInt(5, 100)),
  });

  let updateCommentRes = http.put(
    ENDPOINTS.COMMENTS_DETAILS_URL(slug, commentId),
    payload,
    reqOptions
  );
  check(updateCommentRes, {
    "Comment Updated": (r) => r.status === 200,
  });

  return updateCommentRes.json();
}
function deleteComment(reqOptions, slug, commentId) {
  let delCommentRes = http.del(
    ENDPOINTS.COMMENTS_DETAILS_URL(slug, commentId),
    {},
    reqOptions
  );
  check(delCommentRes, {
    "Comment Deleted": (r) => r.status === 200,
  });
}
function getReplies(reqOptions, slug, commentId) {
  const newReplies = [];
  const payload = JSON.stringify({
    description: getDescription(randomInt(5, 50)),
  });
  for (let i = 0; i < randomInt(1, 5); i++) {
    sleep(0.5);
    let newReplyRes = http.post(
      ENDPOINTS.REPLIES_URL(slug, commentId),
      payload,
      reqOptions
    );
    check(newReplyRes, {
      "Reply Created": (r) => r.status === 201,
    });
    newReplies.push(newReplyRes.json());
  }

  return newReplies;
}
function updateReplies(reqOptions, slug, commentId, newReplies) {
  const payload = JSON.stringify({
    description: "Updated --- " + getDescription(randomInt(5, 50)),
  });
  newReplies = shuffleArray(newReplies);
  let totalDelete = randomInt(0, newReplies.length);
  for (let i = 0; i < totalDelete; i++) {
    let reply = newReplies[i];

    sleep(0.5);
    let updateReplyRes = http.put(
      ENDPOINTS.REPLIES_DETAILS_URL(slug, commentId, reply.id),
      payload,
      reqOptions
    );
    check(updateReplyRes, {
      "Reply Updated": (r) => r.status === 200,
    });
  }
}
function deleteReplies(reqOptions, slug, commentId, newReplies) {
  newReplies = shuffleArray(newReplies);
  let totalDelete = randomInt(0, newReplies.length);
  for (let i = 0; i < totalDelete; i++) {
    let reply = newReplies[i];

    // Delete replies before deleting comment
    sleep(0.5);
    let delReplyRes = http.del(
      ENDPOINTS.REPLIES_DETAILS_URL(slug, commentId, reply.id),
      {},
      reqOptions
    );
    check(delReplyRes, {
      "Reply Delete": (r) => r.status === 200,
    });
  }
}
function reactOnPost(reqOptions, slug) {
  let newReactionRes = http.post(
    ENDPOINTS.POST_REACTIONS_URL(slug),
    {},
    reqOptions
  );
  check(newReactionRes, {
    "Reaction added": (r) => r.status === 201,
  });
}
function deleteReaction(reqOptions, slug) {
  let newReactionRes = http.del(
    ENDPOINTS.POST_REACTIONS_URL(slug),
    {},
    reqOptions
  );
  check(newReactionRes, {
    "Reaction removed": (r) => r.status === 200,
  });
}

function testFunction() {
  let isAuthenticated = false;
  let userData = null;
  const reqOptions = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (Math.random() <= 0.05) {
    // User creation rate is 5%
    userData = registration(reqOptions);
  }

  if (Math.random() <= 0.5) {
    // 50% user will be authenticated user
    let data = userLogin(userData, reqOptions);
    isAuthenticated = data.isAuthenticated;
    userData = data.userData;
    sleep(1);
  }

  if (isAuthenticated === true) {
    userData = getMe(reqOptions, userData);

    if (Math.random() <= 0.2) {
      // 20% of authenticated user will update there profile
      sleep(0.5);
      updateUser(reqOptions);
    }
  }

  let posts = getPosts(reqOptions);
  let postObj = getRandomObj(posts);

  if (!isEmpty(postObj)) {
    sleep(0.5);
    let post = getPostDetails(reqOptions, postObj.slug);

    const comments = getComments(reqOptions, post.slug);
    if (isAuthenticated && Math.random() <= 0.5) {
      // 50% of authenticated user will add comment and reply

      sleep(0.5);
      const comment = createComment(reqOptions, post.slug);
      sleep(0.5);

      let newReplies = getReplies(reqOptions, post.slug, comment.id);

      if (Math.random() <= 0.5) {
        // 50% of comment and reply will be update after creation.

        sleep(0.5);
        updateComment(reqOptions, post.slug, comment.id);

        updateReplies(reqOptions, post.slug, comment.id, newReplies);
      }

      if (Math.random() <= 0.5) {
        // 50% of comment and reply will be deleted after creation.

        deleteReplies(reqOptions, post.slug, comment.id, newReplies);

        sleep(0.5);
        deleteComment(reqOptions, post.slug, comment.id);
      }
    }

    if (isAuthenticated && Math.random() <= 0.8) {
      // 80% of authenticated user will react on post
      sleep(0.5);
      reactOnPost(reqOptions, post.slug);

      if (Math.random() <= 0.3) {
        // 30% of reaction will be deleted
        sleep(0.5);
        deleteReaction(reqOptions, post.slug);
      }
    }
  }

  if (isAuthenticated === true && Math.random() <= 0.3) {
    // 30% of user will create new posts
    sleep(0.5);

    if (Math.random() <= 0.1) {
      // 10% of user will create new topics
      createTopics(reqOptions);
    }

    sleep(0.5);
    let post = createPost(reqOptions);

    if (Math.random() <= 0.5) {
      // 50% of created posts will be updated
      sleep(0.5);
      updatePost(reqOptions, post.slug);
    }

    if (Math.random() <= 0.1) {
      // 10% of created posts will be deleted

      sleep(0.5);
      deletePost(reqOptions, post.slug);
    }
  }

  sleep(0.1);
}
