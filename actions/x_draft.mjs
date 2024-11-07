export async function draft_tweet(params) {
  const { tweet_text } = params;

  // Validate parameters
  if (!tweet_text) {
    return { error: "tweet_text parameter is required" };
  }

  if (typeof tweet_text !== 'string') {
    return { error: "tweet_text must be a string" };
  }

  const url = 'https://x.com/home';

  const script = `
    // Immediately execute using async IIFE
    (async () => {
      try {
        const TWEET_TEXT = ${JSON.stringify(tweet_text)};
        const TIMEOUT = 15000; // Increased timeout to account for slower operations
        const TYPING_DELAY = 50; // Milliseconds between each keystroke

        log("Starting Draft Tweet Automation...");

        // Step 1: Wait for the "Post" button and click it to open the compose modal
        log('Step 1: Clicking "Post" button to open compose modal...');
        const postButtonSelector = 'a[data-testid="SideNav_NewTweet_Button"]';
        const postButton = await wait_for_element(postButtonSelector, TIMEOUT);
        if (!postButton) {
          throw new Error('"Post" button not found.');
        }
        postButton.click();
        log('"Post" button clicked.');

        // Step 2: Wait for the tweet composition modal to appear
        log("Step 2: Waiting for tweet composition modal to appear...");
        const tweetTextArea = await wait_for_element('[data-testid="tweetTextarea_0"]', TIMEOUT);
        log("Tweet composition modal appeared.");

        // Step 3: Enter Tweet Text by simulating input events
        log("Step 3: Entering tweet text...");
        if (!tweetTextArea) {
          throw new Error('Tweet text area not found.');
        }

        // Try paste first for speed, fall back to type_text if paste fails
        try {
            await paste_text(tweetTextArea, TWEET_TEXT);
            log("Pasted tweet text.");
        } catch (error) {
            log(\`Paste failed: \${error.message}\`);
            log("Falling back to typing...");
            await type_text(tweetTextArea, TWEET_TEXT, 37);
            log("Typed tweet text.");
        }

        // Tab away from text area
        tweetTextArea.blur();
        const tabEvent = new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'Tab',
          code: 'Tab'
        });
        tweetTextArea.dispatchEvent(tabEvent);
        log("Tabbed away from text area.");

        // Step 4: Click "Close" (X) Button to trigger save/discard modal
        log('Step 4: Clicking "Close" (X) button...');
        const closeButton = await wait_for_element('[data-testid="app-bar-close"]', TIMEOUT);
        if (!closeButton) {
          throw new Error('"Close" button not found.');
        }

        closeButton.click();
        log('"Close" button clicked.');

        // Step 5: Wait for Save/Discard Modal to appear
        log("Step 5: Waiting for Save/Discard modal to appear...");
        const saveDiscardModal = await wait_for_element('[data-testid="confirmationSheetDialog"]', TIMEOUT);
        log("Save/Discard modal appeared.");

        // Step 6: Click "Save" button to save tweet as draft
        log('Step 6: Clicking "Save" button...');
        const saveButton = saveDiscardModal.querySelector('[data-testid="confirmationSheetConfirm"]');
        if (!saveButton) {
          throw new Error('"Save" button not found in Save/Discard modal.');
        }
        saveButton.click();
        log('"Save" button clicked.');

        // Step 7: Wait for Save/Discard Modal to disappear
        log("Step 7: Waiting for Save/Discard modal to disappear...");
        await new Promise((resolve, reject) => {
          const checkInterval = 500;
          let elapsed = 0;
          const interval = setInterval(() => {
            const modal = document.querySelector('[data-testid="confirmationSheetDialog"]');
            if (!modal || modal.offsetParent === null) {
              clearInterval(interval);
              resolve();
            } else {
              elapsed += checkInterval;
              if (elapsed >= TIMEOUT) {
                clearInterval(interval);
                reject(new Error('Save/Discard modal did not disappear within timeout period.'));
              }
            }
          }, checkInterval);
        });
        log('Save/Discard modal disappeared. Tweet saved as draft successfully!');

        return_result({ success: true, message: 'Tweet saved as draft successfully' });
      } catch (error) {
        return_result({ success: false, error: error.message });
      }

      function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }

    })();
  `;

  try {
    const result = await params.browser.open(url, {
      script
    });
    return result;
  } catch (error) {
    return { error: error.message || "Failed to save tweet as draft" };
  }
}

export const openapi = {
  "openapi": "3.1.0",
  "info": {
    "title": "Draft Tweet",
    "description": "Save a tweet as a draft for later posting",
    "version": "1.0.0"
  },
  "servers": [{"url": "UNUSED"}],
  "paths": {
    "/draft-tweet": {
      "post": {
        "operationId": "draft_tweet",
        "summary": "Save a tweet as a draft",
        "description": "Saves a tweet as a draft for later posting",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["tweet_text"],
                "properties": {
                  "tweet_text": {
                    "type": "string",
                    "description": "The text content of the tweet to be saved as a draft"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Tweet saved as draft successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "message": {
                      "type": "string",
                      "description": "Success message"
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
          return Promise.resolve("Tweet saved as draft successfully");
        }
        throw new Error('Unknown channel');
      }
    };
  },
  cases: [
    {
      name: "saves tweet as draft successfully",
      params: {
        tweet_text: "Test draft tweet"
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.message, "Tweet saved as draft successfully", 
          "Should return success message");
      }
    },
    {
      name: "handles missing tweet_text",
      params: {},
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.error, "tweet_text parameter is required",
          "Should return error for missing tweet_text");
      }
    },
    {
      name: "handles invalid tweet_text type",
      params: {
        tweet_text: 123
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.error, "tweet_text must be a string",
          "Should return error for non-string tweet_text");
      }
    },
    {
      name: "handles ipcRenderer error",
      params: {
        tweet_text: "Test draft tweet"
      },
      before: (env) => {
        // Override ipcRenderer to simulate error
        env.ipcRenderer.invoke = async () => {
          throw new Error("Failed to save draft");
        };
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.error, "Failed to save draft",
          "Should return error message from ipcRenderer");
      }
    }
  ]
};

export default draft_tweet;
