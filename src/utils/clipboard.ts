/**
 * Universal clipboard copy function with fallback for insecure HTTP contexts,
 * LAN IP addresses (e.g. 192.168.x.x, 172.x.x.x), and mobile browsers where
 * `navigator.clipboard` is unavailable or blocked.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Method 1: Modern asynchronous Clipboard API (secure contexts: HTTPS or localhost)
  if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // If modern API fails or is restricted by permissions/context, proceed to fallback
    }
  }

  // Method 2: Document execCommand fallback for plain HTTP / LAN access
  if (typeof document !== "undefined") {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      // Prevent scrolling or visual flash
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "-9999px";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      textArea.style.opacity = "0";
      textArea.setAttribute("readonly", "");

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, textArea.value.length);

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      if (successful) return true;
    } catch {
      /* ignore */
    }
  }

  return false;
}
