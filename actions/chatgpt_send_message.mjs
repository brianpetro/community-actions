/**
 * @file chatgpt_send_message.mjs
 * @description Browser action to send a message to ChatGPT and return its response.
 *
 * params:
 *  - message (string): The user message to send to ChatGPT.
 *  - url (string, optional): The URL of the chat page. Defaults to "https://chatgpt.com/".
 *
 * result:
 *  {
 *    thread_url: string, // URL of the current chat thread
 *    response: string    // The assistant's response
 *  }
 *
 * The script:
 *  - Opens the chat page
 *  - Waits for the input box
 *  - Enters the user message
 *  - Sends the message
 *  - Waits for the assistant's response to finalize
 *  - Returns the conversation thread URL and the assistant's response
 */

export async function chatgpt_send_message(params) {
  const { message, url = "https://chatgpt.com/" } = params;

  // Validate parameters
  if (!message || typeof message !== 'string') {
    return { error: "message parameter must be a non-empty string" };
  }

  const script = `
    (async () => {
      try {
        const MESSAGE = ${JSON.stringify(message)};
        const TIMEOUT = 30000; // 30s
        const CHECK_INTERVAL = 1000; // 1s
        const STABILIZE_DELAY = 2000; // Wait 2s of no changes to consider output final

        log("Starting ChatGPT send message automation...");

        // Wait for prompt textarea
        const promptSelector = '#prompt-textarea';
        await wait_for_element(promptSelector, TIMEOUT);
        const promptEl = document.querySelector(promptSelector);
        if (!promptEl) {
          throw new Error("Prompt textarea not found.");
        }

        // Clear any existing text (if needed)
        promptEl.textContent = '';

        // Type the message
        log("Typing message into the prompt...");
        await type_text(promptEl, MESSAGE, 20);
        log("Message typed.");

        // Press Enter to send the message
        const enterEvent = new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'Enter',
          code: 'Enter'
        });
        promptEl.dispatchEvent(enterEvent);
        // Simulate Enter up as well
        const enterUpEvent = new KeyboardEvent('keyup', {
          bubbles: true,
          cancelable: true,
          key: 'Enter',
          code: 'Enter'
        });
        promptEl.dispatchEvent(enterUpEvent);
        log("Message sent, now waiting for response...");

        // Wait for new assistant message
        // Assistant messages have data-message-author-role="assistant"
        // We'll wait for a new assistant message that appears after we send
        const initialAssistantCount = document.querySelectorAll('[data-message-author-role="assistant"]').length;

        // Wait until a new assistant message appears
        let newAssistantAppeared = false;
        const startTime = Date.now();
        while (!newAssistantAppeared && (Date.now() - startTime < TIMEOUT)) {
          const currentCount = document.querySelectorAll('[data-message-author-role="assistant"]').length;
          if (currentCount > initialAssistantCount) {
            newAssistantAppeared = true;
          } else {
            await sleep(CHECK_INTERVAL);
          }
        }

        if (!newAssistantAppeared) {
          throw new Error("No new assistant message appeared within timeout.");
        }

        log("New assistant message found, waiting for it to finalize...");

        // The assistant's last message
        // We'll assume the last assistant message is the newly appeared one
        const getLastAssistantMessage = () => {
          const assistantMessages = document.querySelectorAll('[data-message-author-role="assistant"]');
          return assistantMessages[assistantMessages.length - 1];
        };

        let lastContent = '';
        let stableTime = 0;
        const stableStart = Date.now();

        // Wait until content stops changing for STABILIZE_DELAY ms
        while ((Date.now() - stableStart) < TIMEOUT) {
          const lastMsgEl = getLastAssistantMessage();
          if (!lastMsgEl) {
            throw new Error("Unable to locate the assistant message element.");
          }

          // The assistant message content is often in .markdown.prose
          const markdownEl = lastMsgEl.querySelector('.markdown.prose');
          const currentContent = markdownEl ? markdownEl.innerText.trim() : lastMsgEl.innerText.trim();

          if (currentContent === lastContent && currentContent.length > 0) {
            // Content stable, increment stableTime
            stableTime += CHECK_INTERVAL;
            if (stableTime >= STABILIZE_DELAY) {
              // stable enough
              log("Assistant response finalized.");
              break;
            }
          } else {
            // content changed, reset stableTime
            stableTime = 0;
            lastContent = currentContent;
          }

          await sleep(CHECK_INTERVAL);
        }

        // Final assistant response
        const finalResponse = lastContent;

        const thread_url = window.location.href;

        return_result({
          success: true,
          thread_url: thread_url,
          response: finalResponse
        });
      } catch (error) {
        return_result({ success: false, error: error.message });
      }
    })();
  `;

  try {
    const result = await params.browser.open(url, { script });
    const { success, error } = result;
    if (!success && error) {
      return { error };
    }
    return {
      thread_url: result.thread_url,
      response: result.response
    };
  } catch (error) {
    return { error: error.message || "Failed to send message to ChatGPT" };
  }
}

export const openapi = {
  "openapi": "3.1.0",
  "info": {
    "title": "Send Message to ChatGPT",
    "description": "Sends a message to ChatGPT and returns the assistant's response.",
    "version": "1.0.0"
  },
  "servers": [{"url": "UNUSED"}],
  "paths": {
    "/chatgpt-send-message": {
      "post": {
        "operationId": "chatgpt_send_message",
        "summary": "Send a message to ChatGPT",
        "description": "Opens the ChatGPT page (or given URL), sends a provided user message, waits for the assistant response, and returns it.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "message": {
                    "type": "string",
                    "description": "The user message to send to ChatGPT."
                  },
                  "url": {
                    "type": "string",
                    "description": "The URL of the ChatGPT chat page. Defaults to 'https://chatgpt.com/'"
                  }
                },
                "required": ["message"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "ChatGPT response retrieved successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "thread_url": {
                      "type": "string",
                      "description": "The URL of the current chat thread"
                    },
                    "response": {
                      "type": "string",
                      "description": "The assistant's response"
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
      name: "sends message successfully",
      params: {
        message: "Hello, ChatGPT!",
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.thread_url.includes("chatgpt.com"), true, "Should return a thread URL");
        assert(typeof resp.response === "string" && resp.response.length > 0, "Should return a non-empty response");
      }
    },
    {
      name: "handles missing message",
      params: {},
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.error, "message parameter must be a non-empty string", "Should return error for missing message");
      }
    },
    {
      name: "handles empty message",
      params: {
        message: ""
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.error, "message parameter must be a non-empty string", "Should return error for empty message");
      }
    }
  ]
};
