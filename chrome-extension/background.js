const WS_URL = "ws://localhost:9009";
let ws;

function connectWS() {
  ws = new WebSocket(WS_URL);
  ws.onopen = () => {
    console.log("[MCP Extension] Connected to MCP server!!!");
  };
  ws.onclose = () => {
    console.log("[MCP Extension] Disconnected. Retrying...");
    setTimeout(connectWS, 2000);
  };
  ws.onerror = (e) => {
    console.error("[MCP Extension] WebSocket error", e);
  };
  ws.onmessage = handleMessage;
}

async function handleMessage(event) {
  console.log("[MCP Extension] Received message", event.data);

  let msg;
  try {
    msg = JSON.parse(event.data);
  } catch (e) {
    console.error("[MCP Extension] Invalid message", event.data);
    return;
  }

  // Support legacy CallToolRequest format
  if (msg.type === "CallToolRequest") {
    const { name, arguments: args } = msg.payload;
    try {
      const result = await handleTool(name, args);
      sendResult(msg.id, result);
    } catch (err) {
      sendResult(msg.id, { error: err.message || String(err) });
    }
    return;
  }

  // Support direct tool type format (e.g., {type: 'browser_navigate', payload: {...}})
  switch (msg.type) {
    case "browser_navigate":
      try {
        console.log("Navigating to", msg.payload.url);
        const result = await navigate(msg.payload.url);
        sendResult(msg.id, result);
      } catch (err) {
        sendResult(msg.id, { error: err.message || String(err) });
      }
      break;
    case "browser_go_back":
      try {
        const result = await goBack();
        sendResult(msg.id, result);
      } catch (err) {
        sendResult(msg.id, { error: err.message || String(err) });
      }
      break;
    case "browser_go_forward":
      try {
        const result = await goForward();
        sendResult(msg.id, result);
      } catch (err) {
        sendResult(msg.id, { error: err.message || String(err) });
      }
      break;
    case "browser_wait":
      try {
        const result = await wait(msg.payload.time);
        sendResult(msg.id, result);
      } catch (err) {
        sendResult(msg.id, { error: err.message || String(err) });
      }
      break;
    case "browser_press_key":
      try {
        const result = await pressKey(msg.payload.key);
        sendResult(msg.id, result);
      } catch (err) {
        sendResult(msg.id, { error: err.message || String(err) });
      }
      break;
    case "browser_snapshot":
      try {
        const result = await snapshot();
        sendResult(msg.id, result);
      } catch (err) {
        sendResult(msg.id, { error: err.message || String(err) });
      }
      break;
    case "browser_screenshot":
      try {
        const result = await screenshot();
        sendResult(msg.id, result);
      } catch (err) {
        sendResult(msg.id, { error: err.message || String(err) });
      }
      break;
    case "browser_get_console_logs":
      try {
        const result = await getConsoleLogs();
        sendResult(msg.id, result);
      } catch (err) {
        sendResult(msg.id, { error: err.message || String(err) });
      }
      break;
    case "browser_click":
      try {
        const result = await click(msg.payload);
        sendResult(msg.id, result);
      } catch (err) {
        sendResult(msg.id, { error: err.message || String(err) });
      }
      break;
    // Add more cases as needed for other commands
    default:
      console.warn("[MCP Extension] Unknown message type:", msg.type);
      break;
  }
}

function sendResult(requestId, result) {
  ws.send(JSON.stringify({ type: "ToolResult", requestId, result }));
}

async function handleTool(name, args) {
  // Implement tool dispatching here
  switch (name) {
    case "browser_navigate":
      return navigate(args.url);
    case "browser_go_back":
      return goBack();
    case "browser_go_forward":
      return goForward();
    case "browser_wait":
      return wait(args.time);
    case "browser_press_key":
      return pressKey(args.key);
    case "browser_snapshot":
      return snapshot();
    case "browser_screenshot":
      return screenshot();
    case "browser_get_console_logs":
      return getConsoleLogs();
    case "browser_click":
      return click(args);
    case "browser_drag":
      return drag(args);
    case "browser_hover":
      return hover(args);
    case "browser_type":
      return type(args);
    case "browser_select_option":
      return selectOption(args);
    default:
      throw new Error("Unknown tool: " + name);
  }
}

// Implement each tool using chrome APIs and content scripts
// For actions requiring DOM, use message passing to content scripts

async function withActiveTab(fn) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return reject(new Error("No active tab"));
      fn(tabs[0], resolve, reject);
    });
  });
}

function navigate(url) {
  return withActiveTab((tab, resolve) => {
    console.log("Navigating to!!", url);
    chrome.tabs.update(tab.id, { url }, () =>
      resolve({ status: "navigated", url })
    );
  });
}
function goBack() {
  return withActiveTab((tab, resolve) => {
    chrome.tabs.goBack(tab.id, () => resolve({ status: "went back" }));
  });
}
function goForward() {
  return withActiveTab((tab, resolve) => {
    chrome.tabs.goForward(tab.id, () => resolve({ status: "went forward" }));
  });
}
function wait(time) {
  return new Promise((resolve) =>
    setTimeout(() => resolve({ status: "waited", time }), time * 1000)
  );
}
function pressKey(key) {
  return sendToContentScript({ action: "pressKey", key });
}
function snapshot() {
  return sendToContentScript({ action: "snapshot" });
}
function screenshot() {
  return withActiveTab((tab, resolve) => {
    chrome.tabs.captureVisibleTab(
      tab.windowId,
      { format: "png" },
      (dataUrl) => {
        resolve({ image: dataUrl });
      }
    );
  });
}
function getConsoleLogs() {
  return sendToContentScript({ action: "getConsoleLogs" });
}
function click(args) {
  return sendToContentScript({ action: "click", ...args });
}
function drag(args) {
  return sendToContentScript({ action: "drag", ...args });
}
function hover(args) {
  return sendToContentScript({ action: "hover", ...args });
}
function type(args) {
  return sendToContentScript({ action: "type", ...args });
}
function selectOption(args) {
  return sendToContentScript({ action: "selectOption", ...args });
}

function sendToContentScript(message) {
  return withActiveTab((tab, resolve, reject) => {
    chrome.tabs.sendMessage(tab.id, message, (resp) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(resp);
      }
    });
  });
}

connectWS();
