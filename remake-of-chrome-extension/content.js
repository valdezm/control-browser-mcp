// Content script: implements browser actions for MCP tools

function respond(result) {
  chrome.runtime.sendMessage({ type: "ToolResultFromContent", result });
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.action) {
        case "pressKey":
          // Simulate key press on active element
          document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: message.key }));
          sendResponse({ status: "pressed", key: message.key });
          break;
        case "snapshot":
          // Return accessibility snapshot (simple DOM outline)
          sendResponse({ snapshot: document.body.outerHTML });
          break;
        case "getConsoleLogs":
          // Not possible to get browser console logs from content script
          sendResponse({ error: "Not supported in content script" });
          break;
        case "click":
          {
            const el = findElement(message);
            if (el) {
              el.click();
              sendResponse({ status: "clicked", element: message.element });
            } else {
              sendResponse({ error: "Element not found" });
            }
          }
          break;
        case "drag":
          sendResponse({ error: "Drag not implemented" });
          break;
        case "hover":
          {
            const el = findElement(message);
            if (el) {
              el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
              sendResponse({ status: "hovered", element: message.element });
            } else {
              sendResponse({ error: "Element not found" });
            }
          }
          break;
        case "type":
          {
            const el = findElement(message);
            if (el && el instanceof HTMLInputElement) {
              el.value = message.text;
              if (message.submit) el.form && el.form.submit();
              sendResponse({ status: "typed", element: message.element });
            } else {
              sendResponse({ error: "Element not found or not input" });
            }
          }
          break;
        case "selectOption":
          {
            const el = findElement(message);
            if (el && el instanceof HTMLSelectElement) {
              Array.from(el.options).forEach(option => {
                option.selected = message.values.includes(option.value);
              });
              el.dispatchEvent(new Event("change", { bubbles: true }));
              sendResponse({ status: "option selected", element: message.element });
            } else {
              sendResponse({ error: "Element not found or not select" });
            }
          }
          break;
        default:
          sendResponse({ error: "Unknown action: " + message.action });
      }
    } catch (e) {
      sendResponse({ error: e.message || String(e) });
    }
  })();
  return true; // async
});

function findElement({ element, ref }) {
  // Very basic: try querySelector, fallback to text search
  if (ref && document.querySelector(ref)) return document.querySelector(ref);
  if (element) {
    // Try to find by text content
    const all = document.querySelectorAll("*");
    for (const el of all) {
      if (el.textContent && el.textContent.trim() === element.trim()) {
        return el;
      }
    }
  }
  return null;
}
