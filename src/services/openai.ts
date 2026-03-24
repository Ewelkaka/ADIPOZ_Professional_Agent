export async function* streamOpenAIChat(
  messages: { role: string; content: string }[],
  model: string = "gpt-4o"
) {
  try {
    const response = await fetch("/api/chat/openai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages, model }),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: "Unknown error from server" };
      }
      throw new Error(errorData.error || `OpenAI request failed with status ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Could not initialize stream reader");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") return;
          try {
            const { content } = JSON.parse(data);
            if (content) yield content;
          } catch (e) {
            console.warn("Error parsing SSE chunk:", e);
          }
        }
      }
    }
  } catch (error) {
    console.error("OpenAI Stream Error:", error);
    throw error;
  }
}
