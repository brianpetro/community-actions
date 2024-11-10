export async function list_issue_posts(params) {
  let { url, search, limit = 10 } = params;
  console.log('list_issue_posts', params);

  if (search) {
    // Note: GitHub's web interface doesn't support searching within issue comments directly.
    // For advanced search, GitHub's API should be used.
    console.warn('Search within issue comments is not supported via web scraping. Ignoring search parameter.');
  }

  if (!url) {
    url = params.action_settings.default_url || 'https://github.com/github/hub/issues';
  }

  if (typeof url !== 'string') {
    return { error: "url must be a string" };
  }

  const github_issue_regex = /^https?:\/\/github\.com\/[^\/]+\/[^\/]+\/issues\/\d+$/;
  if (!github_issue_regex.test(url)) {
    return { error: "url must be a valid GitHub issue URL" };
  }

  if (typeof limit !== 'number' || limit <= 0) {
    limit = params.action_settings.default_limit || 10;
  }

  const script = `
    (async () => {
      try {
        const COMMENT_SELECTOR = 'div.js-comment-container';
        const USERNAME_SELECTOR = 'a.author';
        const AVATAR_SELECTOR = 'img.avatar-user';
        const COMMENT_TEXT_SELECTOR = 'td.comment-body > div > p';
        const TIMESTAMP_SELECTOR = 'relative-time';
        const REACTIONS_SELECTOR = 'div.reactions';
        const MAX_SCROLL_ATTEMPTS = 20;
        const SCROLL_DELAY = 1000;

        const waitForElement = (selector, timeout = 15000) => {
          return new Promise((resolve, reject) => {
            const interval = 100;
            let elapsed = 0;
            const timer = setInterval(() => {
              const element = document.querySelector(selector);
              if (element) {
                clearInterval(timer);
                resolve(element);
              }
              elapsed += interval;
              if (elapsed >= timeout) {
                clearInterval(timer);
                reject(new Error('Timeout waiting for ' + selector));
              }
            }, interval);
          });
        };

        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        const log = console.log;

        log("Starting Issue Comment Extraction...");

        // Wait for comments to load
        await waitForElement(COMMENT_SELECTOR);
        log("Comments loaded.");

        let comments = [];
        let scrollAttempts = 0;

        while (comments.length < ${limit} && scrollAttempts < MAX_SCROLL_ATTEMPTS) {
          const commentElements = document.querySelectorAll(COMMENT_SELECTOR);
          log(\`Found \${commentElements.length} comments.\`);

          commentElements.forEach(commentEl => {
            if (comments.length >= ${limit}) return;

            const usernameEl = commentEl.querySelector(USERNAME_SELECTOR);
            const avatarEl = commentEl.querySelector(AVATAR_SELECTOR);
            const commentTextEl = commentEl.querySelector(COMMENT_TEXT_SELECTOR);
            const timestampEl = commentEl.querySelector(TIMESTAMP_SELECTOR);
            const reactionsEl = commentEl.querySelector(REACTIONS_SELECTOR);

            const username = usernameEl ? usernameEl.innerText.trim() : "Unknown";
            const avatar = avatarEl ? avatarEl.getAttribute('src') : "";
            const comment_text = commentTextEl ? commentTextEl.innerText.trim() : "";
            const timestamp = timestampEl ? timestampEl.getAttribute('datetime') : "";

            // Extract reactions
            let reactions = {};
            if (reactionsEl) {
              const reactionButtons = reactionsEl.querySelectorAll('button');
              reactionButtons.forEach(btn => {
                const emoji = btn.querySelector('g-emoji') ? btn.querySelector('g-emoji').innerText.trim() : btn.innerText.trim();
                const count = btn.querySelector('span') ? parseInt(btn.querySelector('span').innerText.trim()) || 0 : 0;
                reactions[emoji] = count;
              });
            }

            comments.push({
              username,
              avatar,
              comment_text,
              timestamp,
              reactions
            });
          });

          if (comments.length >= ${limit}) break;

          // Scroll to load more comments
          log("Scrolling to load more comments...");
          window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
          });

          await sleep(SCROLL_DELAY);
          scrollAttempts++;
        }

        log(\`Extracted \${comments.length} comments after \${scrollAttempts} scroll attempts\`);
        return_result({ success: true, comments: comments.slice(0, ${limit}) });
      } catch (error) {
        return_result({ success: false, error: error.message });
      }
    })();
  `;

  try {
    const result = await params.browser.open(url, {
      script
    });
    return { ...result, source_url: url };
  } catch (error) {
    return { error: error.message || "Failed to list issue posts" };
  }
}

export const settings_config = {
  default_url: {
    name: 'Issue Posts: Default URL',
    type: 'text',
    description: 'The default GitHub issue URL to list posts from.',
  },
  default_limit: {
    name: 'Issue Posts: Default Limit',
    type: 'number',
    description: 'The default number of issue posts to list.',
    default: 10,
  },
};

export const openapi = {
  "openapi": "3.1.0",
  "info": {
    "title": "List Issue Posts",
    "description": "List posts (comments) from a GitHub issue.",
    "version": "1.0.0"
  },
  "servers": [{"url": "UNUSED"}],
  "paths": {
    "/list-issue-posts": {
      "post": {
        "operationId": "list_issue_posts",
        "summary": "List posts from a GitHub issue",
        "description": "Retrieves a list of comments from the specified GitHub issue URL with an optional limit",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "url": {
                    "type": "string",
                    "description": "The GitHub issue URL to list posts from."
                  },
                  "search": {
                    "type": "string",
                    "description": "Search query to filter comments. (Note: Not supported via web scraping)"
                  },
                  "limit": {
                    "type": "integer", 
                    "description": "The maximum number of comments to retrieve (default is 10)",
                    "default": 10
                  }
                },
                "required": ["url"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "List of issue posts retrieved successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "source_url": {
                      "type": "string",
                      "description": "The URL that was used to retrieve the issue posts."
                    },
                    "comments": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "username": {
                            "type": "string",
                            "description": "The username of the comment author"
                          },
                          "avatar": {
                            "type": "string",
                            "description": "URL to the comment author's avatar image"
                          },
                          "comment_text": {
                            "type": "string",
                            "description": "The text content of the comment"
                          },
                          "timestamp": {
                            "type": "string",
                            "format": "date-time",
                            "description": "The timestamp when the comment was posted"
                          },
                          "reactions": {
                            "type": "object",
                            "additionalProperties": {
                              "type": "integer"
                            },
                            "description": "Reactions to the comment"
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object", 
                  "properties": {
                    "error": {
                      "type": "string",
                      "description": "Error message"
                    }
                  }
                }
              }
            }
          },
          "500": {
            "description": "Internal server error",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object", 
                  "properties": {
                    "error": {
                      "type": "string",
                      "description": "Error message"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

export const test = {
  setup: async (env) => {
    // Mock ipcRenderer
    env.ipcRenderer = {
      invoke: async (channel, ...args) => {
        if (channel === 'browser-open') {
          // Mock comments based on the limit
          const [url, { script }] = args;
          const mockComments = [];
          for (let i = 1; i <= 25; i++) {
            mockComments.push({
              username: `user${i}`,
              avatar: `https://avatars.githubusercontent.com/u/${1000 + i}?v=4`,
              comment_text: `This is a test comment number ${i} with a [link](https://github.com).`,
              timestamp: "2024-11-10T12:34:56Z",
              reactions: {
                "👍": i,
                "👎": Math.floor(i / 2),
                "❤️": Math.floor(i / 3)
              }
            });
          }
          return Promise.resolve({
            success: true,
            comments: mockComments
          });
        }
        throw new Error('Unknown channel');
      }
    };
  },
  cases: [
    {
      name: "lists issue posts successfully with default limit",
      params: {
        url: "https://github.com/github/hub/issues/1234"
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.success, true, "Should return success");
        assert(Array.isArray(resp.comments), "comments should be an array");
        assert.strictEqual(resp.comments.length, 10, "Should have 10 comments by default");
        const comment = resp.comments[0];
        assert.strictEqual(comment.username, "user1", "Username should match");
        assert.strictEqual(comment.avatar, "https://avatars.githubusercontent.com/u/1001?v=4", "Avatar URL should match");
        assert.strictEqual(comment.comment_text, "This is a test comment number 1 with a [link](https://github.com).", "Comment text should match");
        assert.strictEqual(comment.reactions["👍"], 1, "Reactions should match");
      }
    },
    {
      name: "lists issue posts successfully with custom limit",
      params: {
        url: "https://github.com/github/hub/issues/1234",
        limit: 5
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.success, true, "Should return success");
        assert(Array.isArray(resp.comments), "comments should be an array");
        assert.strictEqual(resp.comments.length, 5, "Should have 5 comments as per limit");
        const comment = resp.comments[4];
        assert.strictEqual(comment.username, "user5", "Username should match the 5th comment");
        assert.strictEqual(comment.avatar, "https://avatars.githubusercontent.com/u/1005?v=4", "Avatar URL should match the 5th comment");
      }
    },
    {
      name: "handles missing url",
      params: {},
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.error, "url must be a valid GitHub issue URL", "Should return error for missing or invalid url");
      }
    },
    {
      name: "handles invalid url type",
      params: {
        url: 12345
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.error, "url must be a string", "Should return error for non-string url");
      }
    },
    {
      name: "handles invalid url domain",
      params: {
        url: "https://invalid.com/user/repo/issues/1234"
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.error, "url must be a valid GitHub issue URL", "Should return error for invalid domain");
      }
    },
    {
      name: "handles invalid limit type",
      params: {
        url: "https://github.com/github/hub/issues/1234",
        limit: "five"
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.success, true, "Should default to default limit when invalid limit type");
        assert.strictEqual(resp.comments.length, 10, "Should have 10 comments by default");
      }
    },
    {
      name: "handles invalid limit value",
      params: {
        url: "https://github.com/github/hub/issues/1234",
        limit: -5
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.success, true, "Should default to default limit when invalid limit value");
        assert.strictEqual(resp.comments.length, 10, "Should have 10 comments by default");
      }
    },
    {
      name: "handles ipcRenderer error",
      params: {
        url: "https://github.com/github/hub/issues/1234",
        limit: 5
      },
      before: (env) => {
        // Override ipcRenderer to simulate error
        env.ipcRenderer.invoke = async () => {
          throw new Error("Failed to list issue posts");
        };
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.success, false, "Should return failure");
        assert.strictEqual(resp.error, "Failed to list issue posts", "Should return ipcRenderer error message");
      }
    }
  ]
};

export default list_issue_posts;