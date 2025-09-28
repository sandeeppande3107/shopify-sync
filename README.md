# Shopify Sync App

This project is a Node.js application that synchronizes data between Shopify and other services. 


## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Shopify store credentials

### Installation

```bash
git clone repo
cd shopify-sync-app
npm install
```

### Configuration

Create a `.env` file with your Shopify

```
SHOPIFY_STORE=
SHOPIFY_ACCESS_TOKEN=
API_VERSION=2025-07
PORT=3000
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
HOST_NAME=localhost:3000
```

### Running the App

```bash
npm run dev
```


## Rest Client Plugin

The **Rest Client Plugin** allows you to:

- Send HTTP requests directly from your editor (such as VS Code) to test API endpoints.
- View responses and debug API interactions quickly.
- Use `.http` or `.rest` files to organize and save your requests.

### Usage

1. Install the [Rest Client extension](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) in VS Code.
2. Create a file like `test.http` in your project, already created one for reference
3. Click "Send Request" above the request in VS Code to view the response.


## License

MIT