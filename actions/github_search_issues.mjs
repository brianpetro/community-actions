/**
 * @file github_search_issues.mjs
 * @description Browser action to search issues from a GitHub repository with a given query.
 */

export async function github_search_issues(params) {
  let { repo, search, limit = 20 } = params;

  if (!repo) {
    return { error: "repo parameter is required" };
  }

  if (typeof repo !== 'string') {
    return { error: "repo must be a string of the form 'owner/repo'" };
  }

  if (!search || typeof search !== 'string') {
    return { error: "search parameter must be a non-empty string" };
  }

  if (typeof limit !== 'number' || limit <= 0) {
    return { error: "limit must be a positive integer" };
  }

  // Construct the search URL
  // Example: https://github.com/{repo}/issues?q=is%3Aissue+is%3Aopen+bug
  const encoded_search = encodeURIComponent(search);
  const url = `https://github.com/${repo}/issues?q=${encoded_search}+is%3Aissue+is%3Aopen`;

  const script = `
    (async () => {
      try {
        const ISSUE_SELECTOR = 'div.js-navigation-container div.js-issue-row';
        const ISSUE_TITLE_SELECTOR = 'a.Link--primary.v-align-middle.no-underline.h4.js-navigation-open.markdown-title';
        const ISSUE_NUMBER_SELECTOR = 'span.opened-by';
        const AUTHOR_SELECTOR = 'a.Link--muted';
        const TIMESTAMP_SELECTOR = 'relative-time';
        const LABELS_SELECTOR = 'a.IssueLabel';
        const ASSIGNEES_SELECTOR = 'a.AssigneeAvatar';
        const MILESTONE_SELECTOR = 'a.js-milestone-link';
        const COMMENTS_SELECTOR = 'a.Link--muted';

        const TIMEOUT = 15000;
        const MAX_SCROLL_ATTEMPTS = 50;
        const SCROLL_DELAY = 1000;

        log("Starting GitHub Issues Search Automation...");

        // Wait for initial issues to load
        log("Waiting for issues to load...");
        await wait_for_element(ISSUE_SELECTOR, TIMEOUT);
        log("Initial issues loaded.");

        let issues = [];
        let scrollAttempts = 0;
        let lastIssueCount = 0;

        while (issues.length < ${limit} && scrollAttempts < MAX_SCROLL_ATTEMPTS) {
          log(\`Current issue count: \${issues.length}. Target: ${limit}\`);

          // Get current issues before scrolling
          const current_issues = document.querySelectorAll(ISSUE_SELECTOR);
          lastIssueCount = current_issues.length;

          // Extract issues from current view
          for (let issueEl of current_issues) {
            if (issues.length >= ${limit}) break;

            try {
              // Extract Issue Title and URL
              const titleEl = issueEl.querySelector(ISSUE_TITLE_SELECTOR);
              const title = titleEl ? titleEl.innerText.trim() : "";
              const issueURL = titleEl ? titleEl.getAttribute('href') : "";
              const fullURL = issueURL.startsWith('http') ? issueURL : 'https://github.com' + issueURL;

              // Extract Issue Number
              const numberEl = issueEl.querySelector(ISSUE_NUMBER_SELECTOR);
              const issueNumberMatch = numberEl ? numberEl.innerText.match(/#(\\d+)/) : null;
              const issue_number = issueNumberMatch ? issueNumberMatch[1] : "";

              // Extract Author Information
              const authorEl = issueEl.querySelector(AUTHOR_SELECTOR);
              const author_username = authorEl ? authorEl.getAttribute('href').split('/').pop() : "";
              const author_display_name = authorEl ? authorEl.innerText.trim() : "";

              // Extract Timestamp
              const timeEl = issueEl.querySelector(TIMESTAMP_SELECTOR);
              const timestamp = timeEl ? timeEl.getAttribute('datetime') : "";

              // Extract Labels
              const labelElements = issueEl.querySelectorAll(LABELS_SELECTOR);
              const labels = Array.from(labelElements).map(label => label.innerText.trim());

              // Extract Assignees
              const assigneeElements = issueEl.querySelectorAll(ASSIGNEES_SELECTOR);
              const assignees = Array.from(assigneeElements).map(assignee => assignee.getAttribute('aria-label').replace('Assigned to ', '').trim());

              // Extract Milestone
              const milestoneEl = issueEl.querySelector(MILESTONE_SELECTOR);
              const milestone = milestoneEl ? milestoneEl.innerText.trim() : "";

              // Extract Comment Count
              const commentsEl = issueEl.querySelector(COMMENTS_SELECTOR);
              const commentsMatch = commentsEl ? commentsEl.innerText.match(/(\\d+)/) : null;
              const comments_count = commentsMatch ? parseInt(commentsMatch[1]) : 0;

              const issue = {
                issue_number: issue_number,
                title: title,
                url: fullURL,
                author_username: author_username,
                author_display_name: author_display_name,
                timestamp: timestamp,
                labels: labels,
                assignees: assignees,
                milestone: milestone,
                comments_count: comments_count
              };

              // Avoid duplicates
              if (!issues.find(i => i.issue_number === issue.issue_number)) {
                issues.push(issue);
              }
            } catch (innerError) {
              log("Failed to extract an issue: " + innerError.message);
              continue;
            }
          }

          if (issues.length >= ${limit}) break;

          // Scroll to load more issues
          log("Scrolling down to load more issues...");
          window.scrollBy({
            top: window.innerHeight,
            behavior: 'smooth'
          });

          // Wait for scroll
          await sleep(SCROLL_DELAY);

          const newIssueCount = document.querySelectorAll(ISSUE_SELECTOR).length;
          if (newIssueCount <= lastIssueCount) {
            // No new issues after scrolling, possibly all loaded
            break;
          }

          scrollAttempts++;
        }

        log(\`Extracted \${issues.length} issues after \${scrollAttempts} scroll attempts\`);
        return_result({ success: true, issues: issues.slice(0, ${limit}) });
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
    return { error: error.message || "Failed to search GitHub issues" };
  }
}

export const openapi = {
  "openapi": "3.1.0",
  "info": {
    "title": "Search GitHub Issues",
    "description": "Search issues in a GitHub repository by a given query.",
    "version": "1.0.0"
  },
  "servers": [{"url": "UNUSED"}],
  "paths": {
    "/search-github-issues": {
      "post": {
        "operationId": "github_search_issues",
        "summary": "Search issues from a GitHub repository",
        "description": "Retrieves issues from a GitHub repository using a search query, returning a list of matching issues.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "repo": {
                    "type": "string",
                    "description": "GitHub repository in format 'owner/repo'"
                  },
                  "search": {
                    "type": "string",
                    "description": "Search query to filter issues."
                  },
                  "limit": {
                    "type": "integer", 
                    "description": "Maximum number of issues to retrieve (default is 20)",
                    "default": 20
                  }
                },
                "required": ["repo", "search"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "List of issues retrieved successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "source_url": {
                      "type": "string",
                      "description": "The URL that was used to retrieve the issues."
                    },
                    "issues": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "issue_number": {
                            "type": "string",
                            "description": "Unique issue number"
                          },
                          "title": {
                            "type": "string",
                            "description": "Issue title"
                          },
                          "url": {
                            "type": "string",
                            "description": "Issue URL"
                          },
                          "author_username": {
                            "type": "string",
                            "description": "Issue author's username"
                          },
                          "author_display_name": {
                            "type": "string",
                            "description": "Issue author's display name"
                          },
                          "timestamp": {
                            "type": "string",
                            "format": "date-time",
                            "description": "When the issue was created"
                          },
                          "labels": {
                            "type": "array",
                            "items": {
                              "type": "string"
                            },
                            "description": "Labels associated with the issue"
                          },
                          "assignees": {
                            "type": "array",
                            "items": {
                              "type": "string"
                            },
                            "description": "Users assigned to the issue"
                          },
                          "milestone": {
                            "type": "string",
                            "description": "Milestone associated with the issue"
                          },
                          "comments_count": {
                            "type": "integer",
                            "description": "Number of comments on the issue"
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
      name: "searches issues successfully",
      params: {
        repo: "brianpetro/jsbrains",
        search: "adapter",
        limit: 5
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.success, true, "Should return success");
        assert(Array.isArray(resp.issues), "issues should be an array");
        assert(resp.issues.length <= 5, "Should have at most 5 issues");
        const issue = resp.issues[0];
        assert(issue.issue_number, "Issue number should be present");
        assert(issue.title, "Issue title should be present");
        assert(issue.url.includes('https://github.com/brianpetro/jsbrains/issues/'), "URL should point to a jsbrains issue");
        assert(issue.author_username, "Author username should be present");
        assert(issue.timestamp, "Timestamp should be present");
      }
    },
    {
      name: "handles missing repo",
      params: {
        search: "enhancement"
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.error, "repo parameter is required", "Should return error for missing repo");
      }
    },
    {
      name: "handles missing search",
      params: {
        repo: "brianpetro/jsbrains"
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.error, "search parameter must be a non-empty string", "Should return error for missing search");
      }
    },
    {
      name: "handles invalid limit",
      params: {
        repo: "brianpetro/jsbrains",
        search: "bug",
        limit: "ten"
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.error, "limit must be a positive integer", "Should return error for non-integer limit");
      }
    }
  ]
};
