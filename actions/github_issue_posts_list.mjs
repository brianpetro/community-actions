export async function list_github_issue_posts(params) {
  let { url } = params;

  if (!url) {
    return { error: "url parameter is required" };
  }

  if (typeof url !== 'string') {
    return { error: "url must be a string" };
  }

  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }

  if (!url.includes('github.com')) {
    return { error: "url must be a valid GitHub issue URL" };
  }

  const script = `
    (async () => {
      try {
        // GitHub issues are server-rendered, so content is available immediately.
        const posts = [];
        const postElements = document.querySelectorAll('.js-comment-container');

        postElements.forEach((postEl) => {
          const authorEl = postEl.querySelector('a.author, a.Link--secondary');
          const author = authorEl ? authorEl.innerText.trim() : '';
          const authorUrl = authorEl ? authorEl.href : '';

          const avatarEl = postEl.querySelector('img.avatar-user');
          const avatarUrl = avatarEl ? avatarEl.src : '';

          const timestampEl = postEl.querySelector('relative-time');
          const timestamp = timestampEl ? timestampEl.getAttribute('datetime') : '';

          const contentEl = postEl.querySelector('.js-comment-body');
          const content = contentEl ? contentEl.innerHTML.trim() : '';

          if (author && timestamp && content) {
            posts.push({
              author,
              author_url: authorUrl,
              avatar_url: avatarUrl,
              timestamp,
              content
            });
          }
        });

        return_result({ success: true, posts });
      } catch (error) {
        return_result({ success: false, error: error.message });
      }
    })();
  `;

  try {
    const result = await params.browser.open(url, { script });
    return { ...result, source_url: url };
  } catch (error) {
    return { error: error.message || "Failed to list GitHub issue posts" };
  }
}

export const openapi = {
  "openapi": "3.1.0",
  "info": {
    "title": "List GitHub Issue Posts",
    "description": "List posts from a GitHub issue.",
    "version": "1.0.0"
  },
  "servers": [{"url": "UNUSED"}],
  "paths": {
    "/list-github-issue-posts": {
      "post": {
        "operationId": "list_github_issue_posts",
        "summary": "List posts from a GitHub issue URL",
        "description": "Retrieves a list of posts from the specified GitHub issue URL",
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
                  }
                },
                "required": ["url"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "List of posts retrieved successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "source_url": {
                      "type": "string",
                      "description": "The URL that was used to retrieve the posts."
                    },
                    "posts": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "author": {
                            "type": "string",
                            "description": "The username of the post author"
                          },
                          "author_url": {
                            "type": "string",
                            "description": "URL to the author's GitHub profile"
                          },
                          "avatar_url": {
                            "type": "string",
                            "description": "URL to the author's avatar image"
                          },
                          "timestamp": {
                            "type": "string",
                            "format": "date-time",
                            "description": "The timestamp when the post was created"
                          },
                          "content": {
                            "type": "string",
                            "description": "The HTML content of the post"
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
    // no setup needed
  },
  cases: [
    {
      name: "lists posts successfully",
      params: {
        url: "https://github.com/brianpetro/obsidian-smart-connections/issues/1"
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.success, true, "Should return success");
        assert(Array.isArray(resp.posts), "posts should be an array");
        assert(resp.posts.length > 0, "Should have at least one post");
        const post = resp.posts[0];
        assert(post.author, "Author should be present");
        assert(post.content, "Content should be present");
      }
    },
    {
      name: "handles missing url",
      params: {},
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.error, "url parameter is required", "Should return error for missing url");
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
        url: "https://invalid.com/user/repo/issues/123"
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.error, "url must be a valid GitHub issue URL", "Should return error for invalid domain");
      }
    }
  ]
};

export default list_github_issue_posts;
