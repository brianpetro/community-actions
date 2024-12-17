export async function schedule_tweet(params) {
  const { tweet_text } = params;
  
  if (!tweet_text) {
    return { error: "tweet_text parameter is required" };
  }

  if (typeof tweet_text !== 'string') {
    return { error: "tweet_text must be a string" };
  }

  const url = 'https://x.com/compose/post';

  const script = `
    // immediately execute using async IIFE
    (async () => {
      try {
        const TWEET_TEXT = ${JSON.stringify(tweet_text)};
        const TIMEOUT = 10000;

        log("Starting Tweet Scheduling Automation...");

        // Step 1: Click "Schedule post" Button
        log('Step 1: Clicking "Schedule post" button...');
        const schedulePostButton = await wait_for_element('button[aria-label="Schedule post"]', TIMEOUT);
        schedulePostButton.click();
        log('"Schedule post" button clicked.');

        // Wait for the Schedule Modal to appear
        log("Waiting for Schedule Modal to appear...");
        await wait_for_element('#SELECTOR_3', TIMEOUT);
        log("Schedule Modal appeared.");

        // Step 2: Change Year to Next Year
        log("Step 2: Changing year to next year...");
        const yearDropdown = document.querySelector('#SELECTOR_3');
        if (!yearDropdown) {
            throw new Error('Year dropdown (#SELECTOR_3) not found.');
        }

        // Click to open the dropdown
        yearDropdown.click();
        await sleep(300); // Wait for dropdown to open

        // Find and click the next year option
        const select = yearDropdown;
        const currentYear = select.value;
        const nextYear = (parseInt(currentYear) + 1).toString();
        
        const nextYearOption = Array.from(select.options).find(option => option.value === nextYear);
        if (!nextYearOption) {
            throw new Error(\`Next year option (\${nextYear}) not found in the dropdown.\`);
        }

        // Simulate clicking the next year option
        nextYearOption.selected = true;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Click outside to close dropdown
        document.body.click();
        await sleep(500); // Wait for dropdown to close and changes to settle

        log(\`Year changed from \${currentYear} to \${nextYear}.\`);

        // Step 3: Click Confirm/Update Button
        log('Step 3: Clicking "Confirm" button...');
        const confirmButton = await wait_for_element('[data-testid="scheduledConfirmationPrimaryAction"]', TIMEOUT);
        confirmButton.click();
        log('"Confirm" button clicked.');

        // Wait for tweet composition modal
        log("Waiting for tweet composition modal to appear...");
        await wait_for_element('[data-testid="tweetTextarea_0"]', TIMEOUT);
        log("Tweet composition modal appeared.");

        // Step 4: Enter Tweet Text
        log("Step 4: Entering tweet text...");
        const tweetTextArea = document.querySelector('[data-testid="tweetTextarea_0"]');
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

        // Step 5: Wait for "Schedule" Button
        log('Step 5: Waiting for "Schedule" button to become enabled...');
        await new Promise((resolve, reject) => {
            const checkInterval = 500;
            let elapsed = 0;
            const interval = setInterval(() => {
                const scheduleButton = Array.from(document.querySelectorAll('[data-testid="tweetButton"]'))
                    .find(el => el.textContent.includes("Schedule"));
                if (scheduleButton && !scheduleButton.disabled && scheduleButton.getAttribute('aria-disabled') !== 'true') {
                    clearInterval(interval);
                    resolve();
                } else {
                    elapsed += checkInterval;
                    if (elapsed >= TIMEOUT) {
                        clearInterval(interval);
                        reject(new Error('"Schedule" button did not become enabled within timeout period.'));
                    }
                }
            }, checkInterval);
        });
        log('"Schedule" button is now enabled.');

        // Step 6: Click "Schedule" Button
        log('Step 6: Clicking "Schedule" button...');
        const finalScheduleButton = Array.from(document.querySelectorAll('[data-testid="tweetButton"]'))
            .find(el => el.textContent.includes("Schedule"));
        if (!finalScheduleButton) {
            throw new Error('"Schedule" button not found.');
        }
        finalScheduleButton.click();
        log('"Schedule" button clicked.');

        // Wait for scheduling modal to disappear
        log("Waiting for scheduling modal to disappear...");
        await new Promise((resolve, reject) => {
            const checkInterval = 500;
            let elapsed = 0;
            const interval = setInterval(() => {
                const modal = document.querySelector('#schedulingModal');
                if (!modal || modal.offsetParent === null) {
                    clearInterval(interval);
                    resolve();
                } else {
                    elapsed += checkInterval;
                    if (elapsed >= TIMEOUT) {
                        clearInterval(interval);
                        reject(new Error('Scheduling modal did not disappear within timeout period.'));
                    }
                }
            }, checkInterval);
        });
        log('Scheduling modal disappeared. Tweet scheduled successfully!');

        return_result({ success: true, message: 'Tweet scheduled successfully' });
      } catch (error) {
        return_result({ success: false, error: error.message });
      }
    })();
  `;

  try {
    const result = await params.browser.open(url, {
      script
    });
    return result;
  } catch (error) {
    return { error: error.message || "Failed to schedule tweet" };
  }
}

export const openapi = {
  "openapi": "3.1.0",
  "info": {
    "title": "Schedule Tweet",
    "description": "Schedule a tweet to be posted later",
    "version": "1.0.0"
  },
  "servers": [{"url": "UNUSED"}],
  "paths": {
    "/schedule-tweet": {
      "post": {
        "operationId": "schedule_tweet",
        "summary": "Schedule a tweet",
        "description": "Schedules a tweet to be posted at a later time",
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
                    "description": "The text content of the tweet to be scheduled"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Tweet scheduled successfully",
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
      name: "schedules tweet successfully",
      params: {
        tweet_text: "Test tweet"
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.message, "Tweet scheduled successfully", 
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
        tweet_text: "Test tweet"
      },
      before: (env) => {
        // Override ipcRenderer to simulate error
        env.ipcRenderer.invoke = async () => {
          throw new Error("Failed to schedule");
        };
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.error, "Failed to schedule",
          "Should return error message from ipcRenderer");
      }
    }
  ]
};

export default schedule_tweet;
