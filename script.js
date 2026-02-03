async function createPaste() {
  const text = document.getElementById("content").value.trim();
  const ttl = document.getElementById("ttl").value;
  const views = document.getElementById("views").value;

  if (!text) {
    alert("Paste content cannot be empty");
    return;
  }

  const response = await fetch("/paste", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: text,
      ttl: ttl ? Number(ttl) : null,
      maxViews: views ? Number(views) : null
    })
  });

  const data = await response.json();
  window.open(data.url, "_blank");
}
