// github_issues_list.mjs

export async function list_github_issues(params) {
  let { url, search, limit = 20 } = params;
  console.log('list_github_issues', params);

  if (search) {
    const encoded_search = encodeURIComponent(search);
    url = `https://github.com/${params.repo}/issues?q=${encoded_search}+is%3Aissue+is%3Aopen`;
  } else if (!url) {
    url = `https://github.com/${params.repo}/issues`;
  }

  if (typeof url !== 'string') {
    return { error: "url must be a string" };
  }

  if (!url.startsWith('https://github.com')) {
    return { error: "url must be a valid GitHub repository Issues URL" };
  }

  if (typeof limit !== 'number' || limit <= 0) {
    limit = params.action_settings.default_limit || 20;
  }

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

        log("Starting GitHub Issues Listing Automation...");

        // Step 1: Wait for initial issues to load
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

              // Compile Issue Object
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

          // Wait for scroll and loading
          await sleep(SCROLL_DELAY);

          // Check if new issues have loaded
          const newIssueCount = document.querySelectorAll(ISSUE_SELECTOR).length;
          if (newIssueCount > lastIssueCount) {
            log(\`New issues loaded: \${newIssueCount - lastIssueCount}\`);
          } else {
            log("No new issues loaded after scroll, attempting retry...");
            scrollAttempts++;
          }
        }

        log(\`Extracted \${issues.length} issues after \${scrollAttempts} scroll attempts\`);
        return { success: true, issues: issues.slice(0, ${limit}) };
      } catch (error) {
        return { success: false, error: error.message };
      }
    })();
  `;

  try {
    const result = await params.browser.open(url, {
      script
    });
    return { ...result, source_url: url };
  } catch (error) {
    return { error: error.message || "Failed to list GitHub issues" };
  }
}

export const settings_config = {
  default_repo: {
    name: 'GitHub Issues: Default Repository',
    type: 'text',
    description: 'The default GitHub repository to list issues from (e.g., "owner/repo").',
  },
  default_limit: {
    name: 'GitHub Issues: Default Limit',
    type: 'number',
    description: 'The default number of issues to list.',
    default: 20,
  },
};

export const openapi = {
  "openapi": "3.1.0",
  "info": {
    "title": "List GitHub Issues",
    "description": "List issues from a GitHub repository.",
    "version": "1.0.0"
  },
  "servers": [{"url": "UNUSED"}],
  "paths": {
    "/list-github-issues": {
      "post": {
        "operationId": "list_github_issues",
        "summary": "List issues from a GitHub repository",
        "description": "Retrieves a list of issues from the specified GitHub repository with an optional search query and limit.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "repo": {
                    "type": "string",
                    "description": "The GitHub repository in the format 'owner/repo' (e.g., 'facebook/react').",
                    "example": "brianpetro/obsidian-smart-connections"
                  },
                  "url": {
                    "type": "string",
                    "description": "The GitHub Issues page URL to list issues from. If not provided, uses the default repository's Issues page."
                  },
                  "search": {
                    "type": "string",
                    "description": "Search query to filter issues. If provided, overrides the URL parameter."
                  },
                  "limit": {
                    "type": "integer", 
                    "description": "The maximum number of issues to retrieve (default is 20)",
                    "default": 20
                  }
                },
                "required": ["repo"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "List of GitHub issues retrieved successfully",
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
                            "description": "The unique number of the issue."
                          },
                          "title": {
                            "type": "string",
                            "description": "The title of the issue."
                          },
                          "url": {
                            "type": "string",
                            "description": "The URL of the issue."
                          },
                          "author_username": {
                            "type": "string",
                            "description": "The username of the issue author."
                          },
                          "author_display_name": {
                            "type": "string",
                            "description": "The display name of the issue author."
                          },
                          "timestamp": {
                            "type": "string",
                            "format": "date-time",
                            "description": "The timestamp when the issue was created."
                          },
                          "labels": {
                            "type": "array",
                            "items": {
                              "type": "string"
                            },
                            "description": "List of labels associated with the issue."
                          },
                          "assignees": {
                            "type": "array",
                            "items": {
                              "type": "string"
                            },
                            "description": "List of users assigned to the issue."
                          },
                          "milestone": {
                            "type": "string",
                            "description": "The milestone associated with the issue."
                          },
                          "comments_count": {
                            "type": "integer",
                            "description": "Number of comments on the issue."
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
      name: "lists GitHub issues successfully with default limit",
      params: {
        repo: "brianpetro/obsidian-smart-connections"
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.success, true, "Should return success");
        assert(Array.isArray(resp.issues), "issues should be an array");
        assert.strictEqual(resp.issues.length, 20, "Should have 20 issues by default");
        const issue = resp.issues[0];
        assert.strictEqual(issue.issue_number, "801", "Issue number should match");
        assert.strictEqual(issue.title, "Test Issue 1", "Issue title should match");
        assert.strictEqual(issue.author_username, "user1", "Author username should match");
        assert.strictEqual(issue.author_display_name, "User 1", "Author display name should match");
        assert.strictEqual(issue.verified, undefined, "GitHub issues do not have a verified status");
        assert.strictEqual(issue.comments_count, 1, "Comments count should match");
      }
    },
    {
      name: "lists GitHub issues successfully with custom limit",
      params: {
        repo: "brianpetro/obsidian-smart-connections",
        limit: 10
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.success, true, "Should return success");
        assert(Array.isArray(resp.issues), "issues should be an array");
        assert.strictEqual(resp.issues.length, 10, "Should have 10 issues as per limit");
        const issue = resp.issues[9];
        assert.strictEqual(issue.issue_number, "810", "Issue number should match the 10th issue");
        assert.strictEqual(issue.title, "Test Issue 10", "Issue title should match the 10th issue");
      }
    },
    {
      name: "handles missing repo parameter",
      params: {},
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.error, "repo parameter is required", "Should return error for missing repo");
      }
    },
    {
      name: "handles invalid repo format",
      params: {
        repo: "invalidrepoformat"
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.error, "url must be a valid GitHub repository Issues URL", "Should return error for invalid repo format");
      }
    },
    {
      name: "handles invalid limit type",
      params: {
        repo: "brianpetro/obsidian-smart-connections",
        limit: "twenty"
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.error, "limit must be a positive integer", "Should return error for non-integer limit");
      }
    },
    {
      name: "handles invalid limit value",
      params: {
        repo: "brianpetro/obsidian-smart-connections",
        limit: -5
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.error, "limit must be a positive integer", "Should return error for negative limit");
      }
    },
    {
      name: "handles ipcRenderer error",
      params: {
        repo: "brianpetro/obsidian-smart-connections",
        limit: 5
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.success, false, "Should return failure");
        assert.strictEqual(resp.error, "Failed to list GitHub issues", "Should return ipcRenderer error message");
      }
    },
    {
      name: "handles search parameter correctly",
      params: {
        repo: "brianpetro/obsidian-smart-connections",
        search: "bug",
        limit: 5
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.success, true, "Should return success");
        assert(Array.isArray(resp.issues), "issues should be an array");
        assert.strictEqual(resp.issues.length, 5, "Should have 5 issues as per limit");
        assert.strictEqual(resp.source_url, "https://github.com/brianpetro/obsidian-smart-connections/issues?q=bug+is%3Aissue+is%3Aopen", "Should construct correct search URL");
      }
    }
  ]
};

export default list_github_issues;
