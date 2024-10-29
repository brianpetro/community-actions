export async function list_tweets(params) {
  let { url, search, limit = 10 } = params;
  console.log('list_tweets', params);

  if (search) {
    const encoded_search = encodeURIComponent(search);
    url = `https://x.com/search?q=${encoded_search}&f=live`;
  } else if (!url) {
    url = params.action_settings.default_url || 'https://x.com/home';
  }

  if(!url.startsWith('http')) url = 'https://' + url;
  if(url.includes('twitter.com')) url = url.replace('twitter.com', 'x.com');

  if (typeof url !== 'string') {
    return { error: "url must be a string" };
  }

  if (!url.startsWith('https://x.com') && !url.startsWith('https://twitter.com')) {
    return { error: "url must be a valid X (Twitter) URL" };
  }

  if (typeof limit !== 'number' || limit <= 0) {
    limit = params.action_settings.default_limit || 10;
  }

  const script = `
    (async () => {
      try {
        const TWEET_SELECTOR = 'article[role="article"]';
        const TWEET_TEXT_SELECTOR = '[data-testid="tweetText"]';
        const USERNAME_SELECTOR = 'div[data-testid="User-Name"] a[href*="/"]';
        const TWEET_TIMESTAMP_SELECTOR = 'time';
        const ENGAGEMENT_SELECTOR = 'div[data-testid="reply"] button, div[data-testid="retweet"] button, div[data-testid="like"] button, div[data-testid="bookmark"] button, a[href*="/analytics"]';
        const VERIFIED_ICON_SELECTOR = 'svg[aria-label="Verified account"]';
        const IMAGE_SELECTOR = 'img[src*="pbs.twimg.com"]';
        const IMAGE_ALT_SELECTOR = 'img[alt]';

        const TIMEOUT = 15000;
        const MAX_SCROLL_ATTEMPTS = 50;
        const SCROLL_DELAY = 500;
        const NEW_TWEETS_CHECK_INTERVAL = 300;
        const NEW_TWEETS_CHECK_TIMEOUT = 7000;

        log("Starting Tweet Listing Automation...");

        // Step 1: Wait for initial tweets to load
        log("Waiting for tweets to load...");
        await wait_for_element(TWEET_SELECTOR, TIMEOUT);
        log("Initial tweets loaded.");

        let tweets = [];
        let scrollAttempts = 0;
        let lastTweetCount = 0;

        // Helper function to wait for new tweets after scrolling
        const wait_for_new_tweets = async (currentCount) => {
          const start_time = Date.now();
          
          while (Date.now() - start_time < NEW_TWEETS_CHECK_TIMEOUT) {
            const current_tweets = document.querySelectorAll(TWEET_SELECTOR);
            if (current_tweets.length > currentCount) {
              log(\`New tweets loaded: \${current_tweets.length - currentCount} tweets\`);
              return true;
            }
            await sleep(NEW_TWEETS_CHECK_INTERVAL);
          }
          return false;
        };

        // Helper function to get tweet height for smooth scrolling
        const get_tweet_height = () => {
          const tweet = document.querySelector(TWEET_SELECTOR);
          return tweet ? tweet.offsetHeight : 0;
        };

        while (tweets.length < ${limit} && scrollAttempts < MAX_SCROLL_ATTEMPTS) {
          log(\`Current tweet count: \${tweets.length}. Target: ${limit}\`);

          // Get current tweets before scrolling
          const current_tweets = document.querySelectorAll(TWEET_SELECTOR);
          lastTweetCount = current_tweets.length;

          // Extract tweets from current view
          for (let tweetEl of current_tweets) {
            if (tweets.length >= ${limit}) break;

            try {
              const tweetURL = tweetEl.querySelector('a[href*="/status/"]')?.getAttribute('href');
              const tweetID = tweetURL ? tweetURL.split('/').pop() : "";

              // Skip if we've already processed this tweet
              if (tweets.find(t => t.tweet_id === tweetID)) continue;

              // Extract Tweet Text
              const tweetTextEl = tweetEl.querySelector(TWEET_TEXT_SELECTOR);
              const tweetText = tweetTextEl ? tweetTextEl.innerText : "";

              // Extract Username and Display Name
              const userEl = tweetEl.querySelector(USERNAME_SELECTOR);
              const displayName = userEl ? userEl.querySelector('span').innerText : "";
              const username = userEl ? userEl.getAttribute('href').split('/').pop() : "";

              // Check Verified Status
              const isVerified = tweetEl.querySelector(VERIFIED_ICON_SELECTOR) ? true : false;

              // Extract Timestamp
              const timeEl = tweetEl.querySelector(TWEET_TIMESTAMP_SELECTOR);
              const timestamp = timeEl ? timeEl.getAttribute('datetime') : "";

              // Extract Engagement Metrics
              const repliesEl = tweetEl.querySelector('div[data-testid="reply"] span');
              const repostsEl = tweetEl.querySelector('div[data-testid="retweet"] span');
              const likesEl = tweetEl.querySelector('div[data-testid="like"] span');
              const bookmarksEl = tweetEl.querySelector('div[data-testid="bookmark"] span');
              const viewsEl = tweetEl.querySelector('a[href*="/analytics"] span');

              const replies = repliesEl ? parseInt(repliesEl.innerText.replace(/,/g, '')) : 0;
              const reposts = repostsEl ? parseInt(repostsEl.innerText.replace(/,/g, '')) : 0;
              const likes = likesEl ? parseInt(likesEl.innerText.replace(/,/g, '')) : 0;
              const bookmarks = bookmarksEl ? parseInt(bookmarksEl.innerText.replace(/,/g, '')) : 0;
              const views = viewsEl ? parseInt(viewsEl.innerText.replace(/,/g, '')) : 0;

              // Extract Images and Alt Text
              const images = [];
              const imageElements = tweetEl.querySelectorAll(IMAGE_SELECTOR);
              imageElements.forEach(imgEl => {
                const src = imgEl.getAttribute('src');
                const alt = imgEl.getAttribute('alt') || "";
                images.push({ src, alt });
              });

              // Compile Tweet Object
              const tweet = images.length > 0
                ? (tweetText + "\\n" + images.map(img => "![" + img.alt + "](" + img.src + ")").join('\\n'))
                : tweetText
              ;

              const tweetObj = {
                tweet: tweet,
                username: username,
                display_name: displayName,
                tweet_id: tweetID,
                tweet_url: tweetURL.startsWith('https://x.com') ? tweetURL : 'https://x.com' + tweetURL,
                timestamp: timestamp,
                replies: replies,
                reposts: reposts,
                likes: likes,
                bookmarks: bookmarks,
                views: views,
                verified: isVerified,
                images: images
              };

              tweets.push(tweetObj);
            } catch (innerError) {
              log("Failed to extract a tweet: " + innerError.message);
              continue;
            }
          }

          if (tweets.length >= ${limit}) break;

          // Smooth scroll implementation
          const tweet_height = get_tweet_height();
          const scroll_amount = Math.max(tweet_height * 10, 800); // Scroll 3 tweets or minimum 800px
          
          log("Scrolling down to load more tweets...");
          window.scrollBy({
            top: scroll_amount,
            behavior: 'smooth'
          });

          // Wait for scroll animation
          await sleep(Math.min(SCROLL_DELAY, 1000));

          // Wait for new tweets to load
          const new_tweets_loaded = await wait_for_new_tweets(lastTweetCount);
          
          if (!new_tweets_loaded) {
            log("No new tweets loaded after scroll, attempting retry...");
            // Try an additional aggressive scroll if smooth scroll didn't work
            window.scrollTo(0, document.body.scrollHeight);
            await sleep(SCROLL_DELAY);
            
            // Check again for new tweets
            const retry_success = await wait_for_new_tweets(lastTweetCount);
            if (!retry_success) {
              log("Still no new tweets after retry, might have reached the end");
              scrollAttempts = MAX_SCROLL_ATTEMPTS; // Force exit if we can't load more
              break;
            }
          }

          scrollAttempts++;
        }

        log(\`Extracted \${tweets.length} tweets after \${scrollAttempts} scroll attempts\`);
        return_result({ success: true, tweets: tweets.slice(0, ${limit}) });
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
    return { error: error.message || "Failed to list tweets" };
  }
}

export const settings_config = {
  default_url: {
    name: 'Tweet list: Default URL',
    type: 'text',
    description: 'The default URL to list tweets from.',
  },
  default_limit: {
    name: 'Tweet list: Default Limit',
    type: 'number',
    description: 'The default number of tweets to list.',
    default: 10,
  },
};

export const openapi = {
  "openapi": "3.1.0",
  "info": {
    "title": "List Tweets",
    "description": "List tweets from X (Twitter).",
    "version": "1.1.0" // Updated version
  },
  "servers": [{"url": "UNUSED"}],
  "paths": {
    "/list-tweets": {
      "post": {
        "operationId": "list_tweets",
        "summary": "List tweets from a URL",
        "description": "Retrieves a list of tweets from the specified X (Twitter) URL with an optional limit",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "url": {
                    "type": "string",
                    "description": "The X (Twitter) URL to list tweets from. If not provided and no search query, uses default from settings or else uses home timeline."
                  },
                  "search": {
                    "type": "string",
                    "description": "Search query to find tweets. If provided, overrides the URL parameter."
                  },
                  "limit": {
                    "type": "integer", 
                    "description": "The maximum number of tweets to retrieve (default is 10)",
                    "default": 10
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "List of tweets retrieved successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "source_url": {
                      "type": "string",
                      "description": "The URL that was used to retrieve the tweets."
                    },
                    "tweets": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "tweet": {
                            "type": "string",
                            "description": "The text content of the tweet, including markdown for links and images"
                          },
                          "username": {
                            "type": "string",
                            "description": "The username of the tweet author"
                          },
                          "display_name": {
                            "type": "string",
                            "description": "The display name of the tweet author"
                          },
                          "tweet_id": {
                            "type": "string",
                            "description": "The unique ID of the tweet"
                          },
                          "tweet_url": {
                            "type": "string",
                            "description": "The URL of the tweet"
                          },
                          "timestamp": {
                            "type": "string",
                            "format": "date-time",
                            "description": "The timestamp when the tweet was posted"
                          },
                          "replies": {
                            "type": "integer",
                            "description": "Number of replies to the tweet"
                          },
                          "reposts": {
                            "type": "integer",
                            "description": "Number of reposts (retweets) of the tweet"
                          },
                          "likes": {
                            "type": "integer",
                            "description": "Number of likes the tweet has received"
                          },
                          "bookmarks": {
                            "type": "integer",
                            "description": "Number of bookmarks the tweet has"
                          },
                          "views": {
                            "type": "integer",
                            "description": "Number of views the tweet has received"
                          },
                          "verified": {
                            "type": "boolean",
                            "description": "Indicates if the user is verified"
                          },
                          "images": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "src": {
                                  "type": "string",
                                  "description": "Image source URL"
                                },
                                "alt": {
                                  "type": "string",
                                  "description": "Image alt text"
                                }
                              }
                            },
                            "description": "List of images in the tweet"
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
          // Mock tweets based on the limit
          const [url, { script }] = args;
          const mockTweets = [];
          for (let i = 1; i <= 25; i++) {
            mockTweets.push({
              tweet: `Test tweet ${i} with [Link](https://x.com/example${i}) ![Alt ${i}](https://pbs.twimg.com/example${i}.jpg)`,
              username: `user${i}`,
              display_name: `User ${i}`,
              tweet_id: `123456789${i}`,
              tweet_url: `https://x.com/user${i}/status/123456789${i}`,
              timestamp: "2024-10-29T12:34:56.000Z",
              replies: i,
              reposts: i * 2,
              likes: i * 10,
              bookmarks: i * 3,
              views: i * 100,
              verified: i % 2 === 0,
              images: [
                {
                  src: `https://pbs.twimg.com/example${i}.jpg`,
                  alt: `Alt ${i}`
                }
              ]
            });
          }
          return Promise.resolve({
            success: true,
            tweets: mockTweets
          });
        }
        throw new Error('Unknown channel');
      }
    };
  },
  cases: [
    {
      name: "lists tweets successfully with default limit",
      params: {
        url: "https://x.com/exampleuser/status/1234567890"
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.success, true, "Should return success");
        assert(Array.isArray(resp.tweets), "tweets should be an array");
        assert.strictEqual(resp.tweets.length, 20, "Should have 20 tweets by default");
        const tweet = resp.tweets[0];
        assert.strictEqual(tweet.username, "user1", "Username should match");
        assert.strictEqual(tweet.display_name, "User 1", "Display name should match");
        assert.strictEqual(tweet.tweet_id, "1234567891", "Tweet ID should match");
        assert.strictEqual(tweet.tweet_url, "https://x.com/user1/status/1234567891", "Tweet URL should match");
        assert.strictEqual(tweet.verified, false, "User should not be verified");
        assert.strictEqual(tweet.images.length, 1, "Should have one image");
        assert.strictEqual(tweet.images[0].alt, "Alt 1", "Image alt text should match");
      }
    },
    {
      name: "lists tweets successfully with custom limit",
      params: {
        url: "https://x.com/exampleuser/status/1234567890",
        limit: 10
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.success, true, "Should return success");
        assert(Array.isArray(resp.tweets), "tweets should be an array");
        assert.strictEqual(resp.tweets.length, 10, "Should have 10 tweets as per limit");
        const tweet = resp.tweets[9];
        assert.strictEqual(tweet.username, "user10", "Username should match the 10th tweet");
        assert.strictEqual(tweet.display_name, "User 10", "Display name should match the 10th tweet");
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
        url: "https://invalid.com/user/status/1234567890"
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.error, "url must be a valid X (Twitter) URL", "Should return error for invalid domain");
      }
    },
    {
      name: "handles invalid limit type",
      params: {
        url: "https://x.com/exampleuser/status/1234567890",
        limit: "twenty"
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.error, "limit must be a positive integer", "Should return error for non-integer limit");
      }
    },
    {
      name: "handles invalid limit value",
      params: {
        url: "https://x.com/exampleuser/status/1234567890",
        limit: -5
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.error, "limit must be a positive integer", "Should return error for negative limit");
      }
    },
    {
      name: "handles ipcRenderer error",
      params: {
        url: "https://x.com/exampleuser/status/1234567890",
        limit: 5
      },
      before: (env) => {
        // Override ipcRenderer to simulate error
        env.ipcRenderer.invoke = async () => {
          throw new Error("Failed to list tweets");
        };
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.success, false, "Should return failure");
        assert.strictEqual(resp.error, "Failed to list tweets", "Should return ipcRenderer error message");
      }
    },
    {
      name: "handles search parameter correctly",
      params: {
        search: "test query",
        limit: 5
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.success, true, "Should return success");
        assert(Array.isArray(resp.tweets), "tweets should be an array");
        assert.strictEqual(resp.tweets.length, 5, "Should have 5 tweets as per limit");
        assert.strictEqual(resp.source_url, "https://x.com/search?q=test%20query&f=live", "Should construct correct search URL");
      }
    }
  ]
};

export default list_tweets;
