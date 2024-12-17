// github_reply_to_issue.mjs

export async function reply_to_github_issue(params) {
  const { url, message, send = false } = params;

  // Validation
  if (!url) {
    return { error: "url parameter is required" };
  }

  if (typeof url !== 'string') {
    return { error: "url must be a string" };
  }

  if (!url.startsWith('http')) {
    return { error: "url must start with http or https" };
  }

  if (!url.includes('github.com') || !url.includes('/issues/')) {
    return { error: "url must be a valid GitHub issue URL" };
  }

  if (!message || typeof message !== 'string') {
    return { error: "message parameter must be a non-empty string" };
  }

  // Extract repository and issue number from URL
  const issueUrlPattern = /https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/;
  const match = url.match(issueUrlPattern);
  if (!match) {
    return { error: "url must be a valid GitHub issue URL" };
  }

  const [, owner, repo, issue_number] = match;

  // Construct the script to be injected
  const script = `
    (async () => {
      try {
        // Find the textarea for the comment
        const textarea = document.querySelector('textarea[name="comment[body]"]');
        if (!textarea) {
          return_result({ success: false, error: "Comment textarea not found." });
        }

        // Set the comment message
        textarea.value = \`${message.replace(/`/g, '\\`')}\`;

        // Trigger input events to ensure GitHub recognizes the change
        textarea.dispatchEvent(new Event('input', { bubbles: true }));

        if (${send}) {
          // Find and click the "Comment" button
          const commentButton = document.querySelector('button[type="submit"][data-disable-with]');
          if (commentButton) {
            commentButton.click();
            return_result({ success: true, message: "Comment submitted successfully." });
          } else {
            return_result({ success: false, error: "Comment button not found." });
          }
        } else {
          return_result({ success: true, message: "Comment added to the textarea." });
        }
      } catch (error) {
        return_result({ success: false, error: error.message });
      }
    })();
  `;

  try {
    const result = await params.browser.open(url, { script, browser_key: issue_number });
    return { ...result, source_url: url };
  } catch (error) {
    return { error: error.message || "Failed to reply to GitHub issue" };
  }
}

export const openapi = {
  "openapi": "3.1.0",
  "info": {
    "title": "Reply to GitHub Issue",
    "description": "Reply to a GitHub issue by adding a comment.",
    "version": "1.0.0"
  },
  "servers": [{"url": "UNUSED"}],
  "paths": {
    "/reply-github-issue": {
      "post": {
        "operationId": "reply_to_github_issue",
        "summary": "Reply to a GitHub issue",
        "description": "Adds a comment to the specified GitHub issue URL. Optionally submits the comment immediately.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "url": {
                    "type": "string",
                    "description": "The GitHub issue URL to reply to."
                  },
                  "message": {
                    "type": "string",
                    "description": "The content of the reply."
                  },
                  "send": {
                    "type": "boolean",
                    "description": "If true, submits the reply immediately.",
                    "default": false
                  }
                },
                "required": ["url", "message"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Reply processed successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "source_url": {
                      "type": "string",
                      "description": "The URL that was used to reply."
                    },
                    "success": {
                      "type": "boolean",
                      "description": "Indicates if the operation was successful."
                    },
                    "message": {
                      "type": "string",
                      "description": "Success message or error details."
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
      name: "replies without sending",
      params: {
        url: "https://github.com/brianpetro/obsidian-smart-connections/issues/1",
        message: "This is a test comment.",
        send: false
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.success, true, "Should return success");
        assert.strictEqual(resp.message, "Comment added to the textarea.", "Should indicate comment was added");
      }
    },
    {
      name: "replies without sending",
      params: {
        url: "https://github.com/brianpetro/obsidian-smart-connections/issues/2",
        message: "This is a test comment 2 in subsequent browser window.",
        send: false
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.success, true, "Should return success");
        assert.strictEqual(resp.message, "Comment added to the textarea.", "Should indicate comment was added");
      }
    },
    // {
    //   name: "replies and sends",
    //   params: {
    //     url: "https://github.com/brianpetro/obsidian-smart-connections/issues/1",
    //     message: "This is a sent test comment.",
    //     send: true
    //   },
    //   assert: async (assert, resp, env) => {
    //     assert.strictEqual(resp.success, true, "Should return success");
    //     assert.strictEqual(resp.message, "Comment submitted successfully.", "Should indicate comment was submitted");
    //   }
    // },
    {
      name: "handles missing url",
      params: {
        message: "Missing URL test comment.",
        send: true
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.error, "url parameter is required", "Should return error for missing url");
      }
    },
    {
      name: "handles invalid url type",
      params: {
        url: 12345,
        message: "Invalid URL type test comment.",
        send: true
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.error, "url must be a string", "Should return error for non-string url");
      }
    },
    {
      name: "handles invalid url domain",
      params: {
        url: "https://invalid.com/user/repo/issues/123",
        message: "Invalid domain test comment.",
        send: true
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.error, "url must be a valid GitHub issue URL", "Should return error for invalid domain");
      }
    },
    {
      name: "handles missing message",
      params: {
        url: "https://github.com/brianpetro/obsidian-smart-connections/issues/1",
        send: true
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.error, "message parameter must be a non-empty string", "Should return error for missing message");
      }
    }
  ]
};

export default reply_to_github_issue;
