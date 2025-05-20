const WS_URL = "ws://localhost:9009";
let ws;
let tools = [];

function connectWS() {
  ws = new WebSocket(WS_URL);
  ws.onopen = () => {
    document.getElementById("status").textContent = "Connected to MCP server.";
    listTools();
  };
  ws.onclose = () => {
    document.getElementById("status").textContent = "Disconnected. Retrying...";
    setTimeout(connectWS, 2000);
  };
  ws.onerror = () => {
    document.getElementById("status").textContent = "WebSocket error.";
  };
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "toolsList") {
      tools = msg.payload.tools;
      renderTools();
    } else if (msg.type === "result") {
      showResult(msg.payload);
    }
  };
}

function listTools() {
  send({ type: "ListToolsRequest", payload: {} });
}

function send(msg) {
  ws.send(JSON.stringify(msg));
}

function renderTools() {
  const toolsDiv = document.getElementById("tools");
  toolsDiv.innerHTML = "";
  tools.forEach((tool) => {
    const form = document.createElement("form");
    form.className = "tool-form";
    form.innerHTML = `<strong>${tool.name}</strong>: ${tool.description}<br/>`;
    Object.entries(tool.inputSchema.properties || {}).forEach(([key, prop]) => {
      form.innerHTML += `<label>${key}: <input name="${key}" type="${
        prop.type === "number" ? "number" : "text"
      }" required></label><br/>`;
    });
    const submitBtn = document.createElement("button");
    submitBtn.type = "submit";
    submitBtn.textContent = "Run";
    form.appendChild(submitBtn);
    form.onsubmit = (e) => {
      e.preventDefault();
      const data = {};
      Array.from(form.elements).forEach((el) => {
        if (el.name)
          data[el.name] = el.type === "number" ? Number(el.value) : el.value;
      });
      send({
        type: "CallToolRequest",
        payload: { name: tool.name, arguments: data },
      });
    };
    toolsDiv.appendChild(form);
  });
}

document.getElementById("snapshotBtn").onclick = () => {
  send({
    type: "CallToolRequest",
    payload: { name: "browser_snapshot", arguments: {} },
  });
};
document.getElementById("screenshotBtn").onclick = () => {
  send({
    type: "CallToolRequest",
    payload: { name: "browser_screenshot", arguments: {} },
  });
};

function showResult(result) {
  document.getElementById("result").textContent =
    typeof result === "string" ? result : JSON.stringify(result, null, 2);
}

connectWS();

console.log("cONNECTECDX!");
