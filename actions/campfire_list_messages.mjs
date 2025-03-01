/**
 * @file campfire_list_messages.js
 * @description Browser action to list messages from a Campfire-style chat page.
 *              Accepts a URL as a parameter and returns a list of messages with author, timestamp, and content.
 */

export async function campfire_list_messages(params) {
  const { url, limit = 50 } = params;

  // Validate parameters
  if (!url) {
    return { error: "url parameter is required" };
  }

  if (typeof url !== 'string') {
    return { error: "url must be a string" };
  }

  if (typeof limit !== 'number' || limit <= 0) {
    return { error: "limit must be a positive integer" };
  }
  
  const script = `
    (async () => {
      try {
        const MESSAGE_SELECTOR = 'div.message[data-message-id]';
        const TIMEOUT = 10000;
        const SCROLL_DELAY = 500;
        const MAX_SCROLL_ATTEMPTS = 20;

        log("Starting Campfire Messages Listing Automation...");

        // Wait for messages to load
        log("Waiting for messages to load...");
        await wait_for_element(MESSAGE_SELECTOR, TIMEOUT);
        log("Initial messages loaded.");

        let messages = [];
        let processedIds = new Set();
        let scrollAttempts = 0;

        const get_messages = () => {
          const msgEls = document.querySelectorAll(MESSAGE_SELECTOR);
          const results = [];
          for (let msgEl of msgEls) {
            if (messages.length >= ${limit}) break;

            try {
              const message_id = msgEl.getAttribute('data-message-id');
              if (processedIds.has(message_id)) continue;

              processedIds.add(message_id);

              const user_id = msgEl.getAttribute('data-user-id');
              const timestamp = msgEl.getAttribute('data-message-timestamp');
              
              // Author
              const authorEl = msgEl.querySelector('.message__author');
              const author = authorEl ? authorEl.innerText.trim() : "";

              // Timestamp detail (formatted time if available)
              const timeEl = msgEl.querySelector('.message__timestamp[datetime]');
              const datetime = timeEl ? timeEl.getAttribute('datetime') : "";

              // Content
              const contentEl = msgEl.querySelector('.trix-content');
              const content = contentEl ? contentEl.innerText.trim() : "";

              const result = {
                message_id,
                user_id,
                author,
                timestamp: timestamp || datetime,
                content
              };

              results.push(result);
            } catch (error) {
              console.error("Failed to extract a message:", error);
            }
          }
          return results;
        };

        while (messages.length < ${limit} && scrollAttempts < MAX_SCROLL_ATTEMPTS) {
          const batch = get_messages();
          for (let b of batch) {
            if (messages.length < ${limit}) {
              messages.push(b);
            } else {
              break;
            }
          }

          if (messages.length >= ${limit}) break;

          // Attempt to scroll to load more messages if applicable
          log("Scrolling up to load older messages...");
          window.scrollBy({ top: -window.innerHeight, behavior: 'smooth' });
          await sleep(SCROLL_DELAY);

          // Check if new messages loaded after scroll
          const currentCount = document.querySelectorAll(MESSAGE_SELECTOR).length;
          if (currentCount <= messages.length && scrollAttempts > 0) {
            // No new messages after scrolling, possibly all loaded
            break;
          }

          scrollAttempts++;
        }

        log(\`Extracted \${messages.length} messages after \${scrollAttempts} scroll attempts.\`);
        return { success: true, messages: messages.slice(0, ${limit}) };
      } catch (error) {
        return { success: false, error: error.message };
      }
    })();
  `;

  try {
    const result = await params.browser.open(url, { script });
    return { ...result, source_url: url };
  } catch (error) {
    return { error: error.message || "Failed to list messages" };
  }
}

export const openapi = {
  "openapi": "3.1.0",
  "info": {
    "title": "List Campfire Messages",
    "description": "List messages from a Campfire-style chat using the provided URL.",
    "version": "1.0.0"
  },
  "servers": [{"url": "UNUSED"}],
  "paths": {
    "/campfire-list-messages": {
      "post": {
        "operationId": "campfire_list_messages",
        "summary": "List campfire messages from a URL",
        "description": "Retrieves a list of messages from the specified campfire chat page.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "url": {
                    "type": "string",
                    "description": "The URL of the campfire chat page."
                  },
                  "limit": {
                    "type": "integer",
                    "description": "The maximum number of messages to retrieve.",
                    "default": 50
                  }
                },
                "required": ["url"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "List of messages retrieved successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "source_url": {
                      "type": "string",
                      "description": "The URL that was used to retrieve the messages."
                    },
                    "messages": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "message_id": {
                            "type": "string",
                            "description": "The unique ID of the message"
                          },
                          "user_id": {
                            "type": "string",
                            "description": "The ID of the user who posted the message"
                          },
                          "author": {
                            "type": "string",
                            "description": "The display name or handle of the author"
                          },
                          "timestamp": {
                            "type": "string",
                            "description": "The timestamp when the message was posted"
                          },
                          "content": {
                            "type": "string",
                            "description": "The text content of the message"
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
      name: "lists messages successfully",
      params: {
        url: "https://chat.smartconnections.app/rooms/21",
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.success, true, "Should return success");
        assert(Array.isArray(resp.messages), "messages should be an array");
        assert(resp.messages.length > 0, "Should have messages");
        const msg1 = resp.messages[0];
        // should have a message_id
        assert(msg1.message_id, "message_id should be present");
        // should have a user_id
        assert(msg1.user_id, "user_id should be present");
        // should have an author
        assert(msg1.author, "author should be present");
        // should have a timestamp
        assert(msg1.timestamp, "timestamp should be present");
        // should have content
        assert(msg1.content, "content should be present");
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
      name: "handles invalid limit type",
      params: {
        url: "https://chat.smartconnections.app/rooms/21",
        limit: "fifty"
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.error, "limit must be a positive integer", "Should return error for invalid limit type");
      }
    },
  ]
};
