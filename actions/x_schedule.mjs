/********************************************************************************
 * @file x_schedule.mjs
 * @description Schedule a tweet by automating Twitter's UI to set a future time.
 * @exports schedule_tweet
 * @exports openapi
 * @exports test
 *******************************************************************************/

 /**
  * Schedule a tweet to be posted at a future time, optionally specified
  * via a 'scheduled_time' parameter in the format YYYY-MM-DD HH:MM (24-hour).
  *
  * @async
  * @function schedule_tweet
  * @param {object} params - Parameters for scheduling the tweet
  * @param {string} params.tweet_text - The text of the tweet
  * @param {string} [params.scheduled_time] - Optional date/time string (YYYY-MM-DD HH:MM)
  * @param {object} params.browser - Browser automation object with .open(url, {script})
  * @returns {Promise<object>} The result of the scheduling attempt
  */
export async function schedule_tweet(params) {
  const { tweet_text, scheduled_time } = params;

  // Validate tweet_text
  if (!tweet_text) {
    return { error: 'tweet_text parameter is required' };
  }
  if (typeof tweet_text !== 'string') {
    return { error: 'tweet_text must be a string' };
  }

  // Validate scheduled_time (if provided)
  let scheduleArgs = null;  // {year, month, day, hour, minute}
  if (scheduled_time) {
    // Expected format: "YYYY-MM-DD HH:MM"
    const pattern = /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/;
    if (!pattern.test(scheduled_time)) {
      return { error: 'scheduled_time must be in YYYY-MM-DD HH:MM format' };
    }
    const [datePart, timePart] = scheduled_time.split(' ');
    const [yearStr, monthStr, dayStr] = datePart.split('-');
    const [hourStr, minuteStr] = timePart.split(':');
    scheduleArgs = {
      year: parseInt(yearStr, 10),
      month: parseInt(monthStr, 10),
      day: parseInt(dayStr, 10),
      hour: parseInt(hourStr, 10),
      minute: parseInt(minuteStr, 10)
    };
  }

  const url = 'https://x.com/compose/post';

  /**
   * We'll inject this script into the page to manipulate the scheduling UI
   * for setting the year, month, day, hour, and minute if scheduled_time is provided.
   */
  const script = `
    (async () => {
      try {
        const TWEET_TEXT = ${JSON.stringify(tweet_text)};
        const SCHEDULE_ARGS = ${JSON.stringify(scheduleArgs)};
        const TIMEOUT = 10000;

        log("Starting Tweet Scheduling Automation...");

        // Step 1: Click "Schedule post" Button
        log('Step 1: Clicking "Schedule post" button...');
        const schedulePostButton = await wait_for_element('button[aria-label="Schedule post"]', TIMEOUT);
        schedulePostButton.click();
        log('"Schedule post" button clicked.');

        // Wait for the Schedule Modal
        log("Waiting for Schedule Modal to appear...");
        await wait_for_element('#SELECTOR_3', TIMEOUT);
        log("Schedule Modal appeared.");

        if (SCHEDULE_ARGS) {
          // We have a user-specified date/time: 
          // We'll set each part: year, month, day, hour, minute

          // We might have different UI elements, placeholders shown below.
          // *** Year ***
          const yearDropdown = document.querySelector('#SELECTOR_3');
          if (!yearDropdown) {
            throw new Error('Year dropdown (#SELECTOR_3) not found.');
          }
          yearDropdown.click();
          await sleep(300);
          const yearVal = SCHEDULE_ARGS.year.toString();
          const yearOption = Array.from(yearDropdown.options).find(opt => opt.value === yearVal);
          if (!yearOption) {
            throw new Error(\`Year option (\${yearVal}) not found.\`);
          }
          yearOption.selected = true;
          yearDropdown.dispatchEvent(new Event('change', { bubbles: true }));
          document.body.click();
          await sleep(500);
          log(\`Selected year \${yearVal}.\`);

          // *** Month ***
          const monthDropdown = document.querySelector('#SELECTOR_4');
          if (!monthDropdown) {
            throw new Error('Month dropdown (#SELECTOR_4) not found.');
          }
          monthDropdown.click();
          await sleep(300);
          // Twitter month dropdown might have 1-based or 0-based. We assume 1-based matching the dropdown values
          const monthVal = SCHEDULE_ARGS.month.toString();
          const monthOption = Array.from(monthDropdown.options).find(opt => opt.value === monthVal);
          if (!monthOption) {
            throw new Error(\`Month option (\${monthVal}) not found.\`);
          }
          monthOption.selected = true;
          monthDropdown.dispatchEvent(new Event('change', { bubbles: true }));
          document.body.click();
          await sleep(500);
          log(\`Selected month \${monthVal}.\`);

          // *** Day ***
          const dayDropdown = document.querySelector('#SELECTOR_5');
          if (!dayDropdown) {
            throw new Error('Day dropdown (#SELECTOR_5) not found.');
          }
          dayDropdown.click();
          await sleep(300);
          const dayVal = SCHEDULE_ARGS.day.toString();
          const dayOption = Array.from(dayDropdown.options).find(opt => opt.value === dayVal);
          if (!dayOption) {
            throw new Error(\`Day option (\${dayVal}) not found.\`);
          }
          dayOption.selected = true;
          dayDropdown.dispatchEvent(new Event('change', { bubbles: true }));
          document.body.click();
          await sleep(500);
          log(\`Selected day \${dayVal}.\`);

          // *** Hour ***
          const hourDropdown = document.querySelector('#SELECTOR_6');
          if (!hourDropdown) {
            throw new Error('Hour dropdown (#SELECTOR_6) not found.');
          }
          hourDropdown.click();
          await sleep(300);
          const hourVal = SCHEDULE_ARGS.hour.toString().padStart(2, '0');
          const hourOption = Array.from(hourDropdown.options).find(opt => opt.value === hourVal);
          if (!hourOption) {
            throw new Error(\`Hour option (\${hourVal}) not found.\`);
          }
          hourOption.selected = true;
          hourDropdown.dispatchEvent(new Event('change', { bubbles: true }));
          document.body.click();
          await sleep(500);
          log(\`Selected hour \${hourVal}.\`);

          // *** Minute ***
          const minuteDropdown = document.querySelector('#SELECTOR_7');
          if (!minuteDropdown) {
            throw new Error('Minute dropdown (#SELECTOR_7) not found.');
          }
          minuteDropdown.click();
          await sleep(300);
          const minuteVal = SCHEDULE_ARGS.minute.toString().padStart(2, '0');
          const minuteOption = Array.from(minuteDropdown.options).find(opt => opt.value === minuteVal);
          if (!minuteOption) {
            throw new Error(\`Minute option (\${minuteVal}) not found.\`);
          }
          minuteOption.selected = true;
          minuteDropdown.dispatchEvent(new Event('change', { bubbles: true }));
          document.body.click();
          await sleep(500);
          log(\`Selected minute \${minuteVal}.\`);
        } else {
          // No scheduled_time, do old logic (pick next year).
          log("No scheduled_time provided, using fallback approach (next year).");

          const yearDropdown = document.querySelector('#SELECTOR_3');
          if (!yearDropdown) {
            throw new Error('Year dropdown (#SELECTOR_3) not found.');
          }
          // Open
          yearDropdown.click();
          await sleep(300);
          const currentYear = yearDropdown.value;
          const nextYear = (parseInt(currentYear) + 1).toString();
          const nextYearOption = Array.from(yearDropdown.options).find(option => option.value === nextYear);
          if (!nextYearOption) {
            throw new Error(\`Next year option (\${nextYear}) not found.\`);
          }
          nextYearOption.selected = true;
          yearDropdown.dispatchEvent(new Event('change', { bubbles: true }));
          document.body.click();
          await sleep(500);
          log(\`Year changed from \${currentYear} to \${nextYear}.\`);
        }

        // Step 3: Click Confirm/Update Button
        log('Clicking "Confirm" button...');
        const confirmButton = await wait_for_element('[data-testid="scheduledConfirmationPrimaryAction"]', TIMEOUT);
        confirmButton.click();
        log('"Confirm" button clicked.');

        // Wait for tweet composition
        log("Waiting for tweet composition modal...");
        await wait_for_element('[data-testid="tweetTextarea_0"]', TIMEOUT);
        log("Tweet composition modal ready.");

        // Enter Tweet Text
        log("Entering tweet text...");
        const tweetTextArea = document.querySelector('[data-testid="tweetTextarea_0"]');
        if (!tweetTextArea) {
          throw new Error('Tweet text area not found.');
        }

        // Try paste, fallback to typing
        try {
          await paste_text(tweetTextArea, TWEET_TEXT);
          log("Pasted tweet text.");
        } catch (error) {
          log(\`Paste failed: \${error.message}\`);
          log("Falling back to typing...");
          await type_text(tweetTextArea, TWEET_TEXT, 37);
          log("Typed tweet text.");
        }

        // Wait for "Schedule" Button to be enabled
        log('Waiting for "Schedule" button...');
        await new Promise((resolve, reject) => {
          const checkInterval = 500;
          let elapsed = 0;
          const interval = setInterval(() => {
            const scheduleButton = Array.from(document.querySelectorAll('[data-testid="tweetButton"]'))
              .find(el => el.textContent.includes("Schedule"));
            if (scheduleButton &&
                !scheduleButton.disabled &&
                scheduleButton.getAttribute('aria-disabled') !== 'true') {
              clearInterval(interval);
              resolve();
            } else {
              elapsed += checkInterval;
              if (elapsed >= TIMEOUT) {
                clearInterval(interval);
                reject(new Error('"Schedule" button did not become enabled within timeout.'));
              }
            }
          }, checkInterval);
        });
        log('"Schedule" button enabled.');

        // Click "Schedule"
        log('Clicking "Schedule" button...');
        const finalScheduleButton = Array
          .from(document.querySelectorAll('[data-testid="tweetButton"]'))
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
                reject(new Error('Scheduling modal did not disappear within timeout.'));
              }
            }
          }, checkInterval);
        });
        log("Scheduling modal disappeared. Tweet scheduled successfully!");

        return { success: true, message: 'Tweet scheduled successfully' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    })();
  `;

  try {
    const result = await params.browser.open(url, { script });
    return result;
  } catch (error) {
    return { error: error.message || 'Failed to schedule tweet' };
  }
}

export const openapi = {
  openapi: '3.1.0',
  info: {
    title: 'Schedule Tweet',
    description: 'Schedule a tweet to be posted later',
    version: '1.0.0'
  },
  servers: [{ url: 'UNUSED' }],
  paths: {
    '/schedule-tweet': {
      post: {
        operationId: 'schedule_tweet',
        summary: 'Schedule a tweet',
        description: 'Schedules a tweet to be posted at a later time',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['tweet_text'],
                properties: {
                  tweet_text: {
                    type: 'string',
                    description: 'The text content of the tweet to be scheduled'
                  },
                  scheduled_time: {
                    type: 'string',
                    description: 'Optional date/time in YYYY-MM-DD HH:MM format'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Tweet scheduled successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: {
                      type: 'string',
                      description: 'Success message'
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Bad request',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: {
                      type: 'string',
                      description: 'Error message'
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

/**
 * Basic test definitions. 
 * The user is already providing separate integration tests, so these can remain minimal or be extended.
 */
export const test = {
  setup: async (env) => {
    // no setup needed
  },
  cases: [
    {
      name: 'schedules tweet successfully (no scheduled_time)',
      params: {
        tweet_text: 'Test tweet'
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.message, 'Tweet scheduled successfully',
          'Should return success message');
      }
    },
    {
      name: 'handles missing tweet_text',
      params: {},
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.error, 'tweet_text parameter is required',
          'Should return error for missing tweet_text');
      }
    }
  ]
};

export default schedule_tweet;
