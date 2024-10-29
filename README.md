# Smart Connect Community Actions

## Adding Custom Actions

1. Add the `CUSTOM_ACTION.mjs` file to your Smart Connect custom actions using the "Add action" button in the Smart Connect Desktop App (Actions section)
2. Add to a Smart Connect Custom GPT
3. Update the OpenAPI schema for the Custom GPT in the ChatGPT GPT editor

## Developing Custom Actions

### Browser Methods
`params.browser` is an object that provides methods for interacting with the browser (all methods return promises).

- `open(url, opts={})` - Open a browser window to the given URL
  - `opts.url` (string): The URL to open (required)
  - `opts.script` (string): The script to execute after the page has loaded
  - `opts.ensure_url_loaded` (boolean): If true, will ensure page is on the given URL before executing the script
- `run_script(script)` - Run a script in the currently open browser window
- `get_page_url()` - Get the URL of the currently open browser window
  - Returns false if no page is open
