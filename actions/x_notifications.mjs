export async function list_notifications(params) {
  const { limit = 20 } = params;

  // Validate parameters
  if (typeof limit !== 'number' || limit <= 0) {
    return { error: "limit must be a positive integer" };
  }

  const url = 'https://x.com/notifications';

  const script = `
    (async () => {
      try {
        const NOTIFICATION_CONTAINER_SELECTOR = 'div[data-testid="cellInnerDiv"]';
        const NOTIFICATION_SELECTOR = 'article[data-testid="notification"], article[data-testid="tweet"]';
        const TIMEOUT = 10000;
        const MAX_SCROLL_ATTEMPTS = 25;
        const SCROLL_DELAY = 300;
        const NEW_NOTIFICATIONS_CHECK_INTERVAL = 200;
        const NEW_NOTIFICATIONS_CHECK_TIMEOUT = 3000;

        log("Starting Notification Listing Automation...");

        // Wait for notifications to load
        await wait_for_element(NOTIFICATION_CONTAINER_SELECTOR, TIMEOUT);

        let notifications = [];
        let processedEls = new Set();
        let scrollAttempts = 0;
        let lastNotificationCount = 0;

        const process_notification_batch = async (notificationEls) => {
          const batch_results = [];
          
          for (let i = 0; i < notificationEls.length && notifications.length < ${limit}; i++) {
            const notificationEl = notificationEls[i];
            if (processedEls.has(notificationEl)) continue;
            processedEls.add(notificationEl);

            try {
              const notificationText = notificationEl.innerText.toLowerCase();
              let type = 'other';
              
              // Detect notification type based on text
              if (notificationText.includes('replying to')) {
                type = 'reply';
              } else if (notificationText.includes('liked your')) {
                type = 'like';
              } else if (notificationText.includes('reposted your') || notificationText.includes('retweeted your')) {
                type = 'repost';
              } else if (notificationText.includes('followed you')) {
                type = 'follow';
              } else if (notificationText.includes('mentioned you')) {
                type = 'mention';
              }

              // Extract users involved in the notification
              const users = Array.from(notificationEl.querySelectorAll('div[data-testid^="UserAvatar-Container-"] a[href^="/"][role="link"]'))
                .map(userEl => ({
                  username: userEl.getAttribute('href').replace('/', ''),
                  display_name: userEl.querySelector('span')?.innerText || '',
                  avatar_url: userEl.querySelector('img')?.getAttribute('src') || ''
                }));

              // Extract tweet data if applicable
              let tweet_data = {};
              if (['like', 'repost', 'reply', 'mention', 'other'].includes(type)) {
                const tweetTextEl = notificationEl.querySelector('[data-testid="tweetText"]');
                const tweetLinkEl = notificationEl.querySelector('a[href*="/status/"]');
                const timeEl = notificationEl.querySelector('time');

                tweet_data = {
                  tweet: tweetTextEl?.innerText || '',
                  tweet_url: tweetLinkEl ? (tweetLinkEl.getAttribute('href').startsWith('http') ? 
                    tweetLinkEl.getAttribute('href') : 'https://x.com' + tweetLinkEl.getAttribute('href')) : '',
                  tweet_id: tweetLinkEl?.getAttribute('href')?.split('/').pop() || '',
                  timestamp: timeEl?.getAttribute('datetime') || '',
                  images: Array.from(notificationEl.querySelectorAll('img[src*="pbs.twimg.com/media"]'))
                    .map(imgEl => ({
                      src: imgEl.getAttribute('src'),
                      alt: imgEl.getAttribute('alt') || ''
                    }))
                };

                // Extract like and retweet status
                const likeButton = notificationEl.querySelector('button[data-testid="like"], button[data-testid="unlike"]');
                const retweetButton = notificationEl.querySelector('button[data-testid="retweet"], button[data-testid="unretweet"]');

                tweet_data.is_liked = false;
                tweet_data.is_retweeted = false;

                if (likeButton) {
                  const ariaLabel = likeButton.getAttribute('aria-label') || '';
                  tweet_data.is_liked = ariaLabel.toLowerCase().includes('liked');
                }

                if (retweetButton) {
                  const ariaLabel = retweetButton.getAttribute('aria-label') || '';
                  tweet_data.is_retweeted = ariaLabel.toLowerCase().includes('reposted');
                }
              }

              batch_results.push({
                type,
                users,
                ...tweet_data
              });
            } catch (error) {
              console.error("Failed to process notification:", error);
            }
          }
          return batch_results;
        };

        const scroll_for_new_notifications = async () => {
          const scrollHeight = Math.max(window.innerHeight * 2, 1000);
          window.scrollBy(0, scrollHeight);
          await sleep(SCROLL_DELAY);
          
          const start = Date.now();
          while (Date.now() - start < NEW_NOTIFICATIONS_CHECK_TIMEOUT) {
            const currentCount = document.querySelectorAll(NOTIFICATION_SELECTOR).length;
            if (currentCount > lastNotificationCount) return true;
            await sleep(NEW_NOTIFICATIONS_CHECK_INTERVAL);
          }
          return false;
        };

        while (notifications.length < ${limit} && scrollAttempts < MAX_SCROLL_ATTEMPTS) {
          const current_notifications = Array.from(document.querySelectorAll(NOTIFICATION_SELECTOR));
          lastNotificationCount = current_notifications.length;

          const batch_notifications = await process_notification_batch(current_notifications);
          notifications.push(...batch_notifications);

          if (notifications.length >= ${limit}) break;

          const new_notifications_loaded = await scroll_for_new_notifications();
          if (!new_notifications_loaded && scrollAttempts > 5) {
            window.scrollTo(0, document.body.scrollHeight);
            await sleep(SCROLL_DELAY);
            
            if (!await scroll_for_new_notifications()) {
              break;
            }
          }

          scrollAttempts++;
        }

        return_result({ 
          success: true, 
          notifications: notifications.slice(0, ${limit})
        });
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
    return { error: error.message || "Failed to list notifications" };
  }
}


export const openapi = {
  "openapi": "3.1.0",
  "info": {
    "title": "List Notifications",
    "description": "Retrieve notifications from X (Twitter).",
    "version": "1.0.0"
  },
  "servers": [{"url": "UNUSED"}],
  "paths": {
    "/list-notifications": {
      "post": {
        "operationId": "list_notifications",
        "summary": "List notifications",
        "description": "Retrieves a list of notifications from your X (Twitter) account",
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "limit": {
                    "type": "integer",
                    "description": "The maximum number of notifications to retrieve (default is 20)",
                    "default": 20
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "List of notifications retrieved successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "notifications": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "type": {
                            "type": "string",
                            "description": "Type of notification (e.g., like, repost, mention, follow, reply, other)"
                          },
                          "users": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "username": {
                                  "type": "string",
                                  "description": "Username of the user involved in the notification"
                                },
                                "display_name": {
                                  "type": "string",
                                  "description": "Display name of the user"
                                },
                                "avatar_url": {
                                  "type": "string",
                                  "description": "URL of the user's avatar image"
                                }
                              }
                            },
                            "description": "List of users involved in the notification"
                          },
                          "tweet": {
                            "type": "string",
                            "description": "The text content of the related tweet, if applicable"
                          },
                          "tweet_id": {
                            "type": "string",
                            "description": "The ID of the related tweet, if applicable"
                          },
                          "tweet_url": {
                            "type": "string",
                            "description": "The URL of the related tweet, if applicable"
                          },
                          "timestamp": {
                            "type": "string",
                            "format": "date-time",
                            "description": "The timestamp of the notification"
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
                            "description": "List of images in the notification"
                          },
                          "is_liked": {
                            "type": "boolean",
                            "description": "Indicates if the tweet is already liked by you"
                          },
                          "is_retweeted": {
                            "type": "boolean",
                            "description": "Indicates if the tweet is already retweeted by you"
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


export default list_notifications;