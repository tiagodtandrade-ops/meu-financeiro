export function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(options)) {
    if (key === "className") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on") && typeof value === "function")
      node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value !== undefined && value !== null)
      node.setAttribute(key, value);
  }
  for (const child of children) node.append(child);
  return node;
}

export function clear(node) {
  node.replaceChildren();
}
