/**
 * @file template_assignment.mjs
 * @description Creates a markdown assignment file from provided properties and saves it to a specified folder.
 *              Accepts assignment details and merges them into a markdown template.
 *              Uses `params.fs.write` to create the file at the configured destination folder (default: `assignments`).
 *
 *              Workflow:
 *              1. Receive assignment details (title, what, why, measurable_criteria, itemized_outputs, quality_and_format, resources_and_tools, dependencies, testing_and_verification, approval, immediate_steps).
 *              2. Merge them into a markdown template.
 *              3. Write the resulting file to the destination folder.
 */

export async function template_assignment(params) {
  const {
    assignment_title,
    what,
    why,
    measurable_criteria,
    itemized_outputs,
    quality_and_format,
    resources_and_tools,
    dependencies,
    testing_and_verification,
    approval,
    immediate_steps,
    destination_folder
  } = params;

  // Validate parameters
  if (!assignment_title || typeof assignment_title !== 'string' || !assignment_title.trim()) {
    return { error: "assignment_title parameter must be a non-empty string" };
  }

  // Other fields can be optional, but we ensure they are strings if provided
  const fields = {
    what,
    why,
    measurable_criteria,
    itemized_outputs,
    quality_and_format,
    resources_and_tools,
    dependencies,
    testing_and_verification,
    approval,
    immediate_steps
  };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && typeof value !== 'string') {
      return { error: `${key} parameter must be a string if provided` };
    }
  }

  const folder = destination_folder && typeof destination_folder === 'string' && destination_folder.trim()
    ? destination_folder.trim()
    : (params.action_settings.default_destination_folder || 'assignments');

  // Create a filename friendly slug from the assignment title
  const slug = assignment_title
    .replace(/[^a-zA-Z0-9 ]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);

  // New function to get unique filename
  async function get_unique_filename(base_slug) {
    let counter = 0;
    let filename;
    do {
      filename = `${base_slug}${counter ? ` ${counter}` : ''}.md`;
      counter++;
    } while (await params.fs.exists(`${folder}/${filename}`));
    return filename;
  }

  const filename = await get_unique_filename(slug || 'assignment');
  const filePath = `${folder}/${filename}`;

  const template = `
# ${assignment_title}

## Desired Outcome (DO)
- **What**: ${what || ''}
- **Why**: ${why || ''}
- **Measurable Criteria**: ${measurable_criteria || ''}

## Key Deliverables
- **Itemized Outputs**: ${itemized_outputs || ''}
- **Quality & Format**: ${quality_and_format || ''}

## Constraints & Assumptions
- **Resources & Tools**: ${resources_and_tools || ''}
- **Dependencies**: ${dependencies || ''}

## Validation & Acceptance Criteria
- **Testing & Verification**: ${testing_and_verification || ''}
- **Approval**: ${approval || ''}

## Next Actions
- **Immediate Steps**: ${immediate_steps || ''}
`.trim();

  try {
    await params.fs.write(filePath, template);
    return {
      success: true,
      message: `Assignment file created successfully at ${filePath}`
    };
  } catch (error) {
    return { error: error.message || "Failed to create assignment file" };
  }
}

export const settings_config = {
  default_destination_folder: {
    name: 'Create Assignment: Default Destination Folder',
    type: 'text',
    description: 'The default folder to place newly created assignments. Relative to the current Smart Environment.',
    default: 'assignments',
  },
};

export const openapi = {
  "openapi": "3.1.0",
  "info": {
    "title": "Create Assignment",
    "description": "Create a markdown assignment file from provided details.",
    "version": "1.0.1"
  },
  "servers": [
    { "url": "UNUSED" }
  ],
  "paths": {
    "/create-assignment": {
      "post": {
        "operationId": "template_assignment",
        "summary": "Create a markdown assignment",
        "description": "Creates a markdown file for an assignment given all required details.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "assignment_title": {
                    "type": "string",
                    "description": "The title of the assignment."
                  },
                  "what": {
                    "type": "string",
                    "description": "Exactly what should be achieved, focusing on the final outcome."
                  },
                  "why": {
                    "type": "string",
                    "description": "Explanation of how this DO supports broader objectives or strategic goals."
                  },
                  "measurable_criteria": {
                    "type": "string",
                    "description": "Clearly defined success indicators (metrics, standards, etc.)."
                  },
                  "itemized_outputs": {
                    "type": "string",
                    "description": "Tangible outputs (e.g., codebase, report, prototype)."
                  },
                  "quality_and_format": {
                    "type": "string",
                    "description": "Required quality standards, formatting, or documentation protocols."
                  },
                  "resources_and_tools": {
                    "type": "string",
                    "description": "Outline of available or needed resources/tools."
                  },
                  "dependencies": {
                    "type": "string",
                    "description": "Any assumptions or dependencies that may impact results."
                  },
                  "testing_and_verification": {
                    "type": "string",
                    "description": "Methods for testing or evaluating the outcome."
                  },
                  "approval": {
                    "type": "string",
                    "description": "Who must sign off for acceptance."
                  },
                  "immediate_steps": {
                    "type": "string",
                    "description": "Immediate actions to take to move toward the DO."
                  },
                  "destination_folder": {
                    "type": "string",
                    "description": "The folder to save the assignment file in (default from settings if not provided)."
                  }
                },
                "required": ["assignment_title"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Assignment file created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean" },
                    "message": { "type": "string" }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Bad request - missing or invalid parameters",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": { "type": "string" }
                  }
                }
              }
            }
          },
          "500": {
            "description": "Internal error creating the assignment file",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": { "type": "string" }
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
      name: "creates assignment successfully",
      params: {
        assignment_title: "My First Assignment",
        what: "Build a simple CLI tool.",
        why: "To ensure developers have a quick way to scaffold projects.",
        measurable_criteria: "At least one working command executed without errors.",
        itemized_outputs: "A single CLI.js file and a README.",
        quality_and_format: "Code should follow standard linting rules.",
        resources_and_tools: "No additional frameworks, just Node.js.",
        dependencies: "Assume Node.js 14+ is available.",
        testing_and_verification: "Run the CLI with `node CLI.js --help` and ensure it shows usage.",
        approval: "Tech Lead must review and approve via pull request.",
        immediate_steps: "Initialize the project and write a draft CLI."
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.success, true, "Should return success");
        assert(resp.message.includes("My First Assignment.md"), "Message should reference the assignment file");
        assert(await env.fs.exists("assignments/My First Assignment.md"), "File should exist");
        const content = await env.fs.read("assignments/My First Assignment.md");
        assert(content.includes("My First Assignment"), "Should include the title");
        assert(content.includes("Build a simple CLI tool."), "Should include the 'What'");
        assert(content.includes("To ensure developers have a quick way"), "Should include the 'Why'");
        assert(content.includes("At least one working command executed without errors."), "Should include measurable criteria");
        assert(content.includes("A single CLI.js file and a README."), "Should include itemized outputs");
        assert(content.includes("Code should follow standard linting rules."), "Should include quality & format");
        assert(content.includes("No additional frameworks"), "Should include resources & tools");
        assert(content.includes("Assume Node.js 14+ is available."), "Should include dependencies");
        assert(content.includes("Run the CLI with `node CLI.js --help`"), "Should include testing & verification");
        assert(content.includes("Tech Lead must review and approve"), "Should include approval");
        assert(content.includes("Initialize the project and write a draft CLI."), "Should include immediate steps");
      }
    },
    {
      name: "handles missing title",
      params: {
        what: "What"
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.error, "assignment_title parameter must be a non-empty string", 
          "Should return error for missing title");
      }
    },
    {
      name: "handles empty title",
      params: {
        assignment_title: ""
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.error, "assignment_title parameter must be a non-empty string", 
          "Should return error for empty title");
      }
    },
    {
      name: "handles duplicate filenames",
      params: {
        assignment_title: "My First Assignment",
        what: "Test duplicate handling"
      },
      assert: async (assert, resp, env) => {
        assert.strictEqual(resp.success, true, "Second file creation should succeed");
        assert(resp.message.includes("My First Assignment 1.md"), "Second file should have 1 appended");

        // Verify both files exist
        assert(await env.fs.exists("assignments/My First Assignment.md"), "First file should exist");
        assert(await env.fs.exists("assignments/My First Assignment 1.md"), "Second file should exist");
      }
    }
  ]
};