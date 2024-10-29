export async function bookmark_tweet(params) {
  const { tweet_id } = params;

  // Validate parameters
  if (!tweet_id) {
    return { error: "tweet_id parameter is required" };
  }

  if (typeof tweet_id !== 'string') {
    return { error: "tweet_id must be a string" };
  }

  // Proceed with action
  // Try to get current page URL
  let current_url;

  try {
    current_url = await params.browser.get_page_url();
    console.log("Current URL:", current_url);
  } catch (error) {
    // If error getting page URL, treat as no page open
    current_url = null;
  }

  // Script to perform the action
  const script = `
// Script to perform the bookmark action on the tweet
(async () => {
  try {
    const tweetId = ${JSON.stringify(tweet_id)};
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;

    // Function to find and bookmark tweet
    const find_and_bookmark_tweet = async () => {
      // Find the tweet element
      const tweetSelector = 'article [href*="/status/" i][href$="/' + tweetId + '" i]';
      const tweetLink = document.querySelector(tweetSelector);

      if (!tweetLink) {
        throw new Error('Tweet not found on current page');
      }

      // Get the tweet element
      const tweetEl = tweetLink.closest('article');

      if (!tweetEl) {
        throw new Error('Tweet element not found');
      }

      // Find bookmark button
      const bookmarkButton = tweetEl.querySelector('*[data-testid="bookmark"]');

      if (!bookmarkButton) {
        throw new Error('Bookmark button not found');
      }

      // Click the bookmark button
      bookmarkButton.click();
      return true;
    };

    // Try to find and bookmark tweet with retries
    let attempt = 0;
    let last_error;

    while (attempt < MAX_RETRIES) {
      try {
        await find_and_bookmark_tweet();
        return_result({ success: true, message: 'Tweet bookmarked successfully' });
        return;
      } catch (error) {
        last_error = error;
        attempt++;
        log(\`Attempt \${attempt} failed: \${error.message}\`);
        
        if (attempt < MAX_RETRIES) {
          log(\`Waiting \${RETRY_DELAY}ms before retry...\`);
          await sleep(RETRY_DELAY);
        }
      }
    }

    throw new Error(\`Failed after \${MAX_RETRIES} attempts. Last error: \${last_error.message}\`);
  } catch (error) {
    return_result({ success: false, error: error.message });
  }
})();
`;

  if (current_url && (current_url.includes('x.com') || current_url.includes('twitter.com'))) {
    try {
      const result = await params.browser.run_script(script);
      if (result.success) {
        return result;
      }
      // If script fails, proceed to open the tweet URL
    } catch (error) {
      // If run_script fails, proceed to open tweet URL
    }
  }

  // If not on x.com page, or script failed, open the tweet URL directly
  const tweet_url = `https://x.com/i/web/status/${tweet_id}`;

  try {
    const result = await params.browser.open(tweet_url, {
      script
    });
    return result;
  } catch (error) {
    return { error: error.message || "Failed to bookmark tweet" };
  }
}

export const openapi = {
  "openapi": "3.1.0",
  "info": {
    "title": "Bookmark Tweet",
    "description": "Bookmark a tweet on X (Twitter)",
    "version": "1.0.0"
  },
  "servers": [{"url": "UNUSED"}],
  "paths": {
    "/bookmark-tweet": {
      "post": {
        "operationId": "bookmark_tweet",
        "summary": "Bookmark a tweet",
        "description": "Bookmarks a tweet specified by tweet_id",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["tweet_id"],
                "properties": {
                  "tweet_id": {
                    "type": "string",
                    "description": "The ID of the tweet to bookmark"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Tweet bookmarked successfully",
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

export default bookmark_tweet;