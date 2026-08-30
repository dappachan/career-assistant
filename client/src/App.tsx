import { useState, useEffect } from "react";

function App() {
  const [ health, setHealth] = useState<string>("checking...");
  const [ message, setMessage] = useState<string>("");
  const [ reply, setReply ] = useState<string>("");
  const [ resumeText, setResumeText] = useState<string>("");
  const [ loading, setLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string>("");

  async function handleReview(){
    setLoading(true);
    setFeedback("");
    try{
      const res = await fetch("http://localhost:3001/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify({ resumeText }),

    });
    const data = await res.json();
    setFeedback(res.ok ? data.feedback : data.error);
    } catch {
      setFeedback("Could not reach the server. ");
    } finally { 
      setLoading(false);
    }
  }
  
  async function handleSend() {
    const res = await fetch("http://localhost:3001/api/echo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({message}),
  });
  const data = await res.json();
  setReply(data.echoed);
  }
  useEffect(() => {
    fetch("http://localhost:3001/api/health")
    .then((res) => res.json())
    .then((data) => setHealth(data.status))
    .catch(() => setHealth("server unreachable"));
  }, []);

  return (
    <main>
      <h1>Career Assistant</h1>
      <p>API status: {health}</p>
      <input value={message} onChange={(e) => setMessage(e.target.value)} />
      <button onClick={handleSend}>Send</button>
      <p>{reply}</p>
      <textarea
        value={resumeText}
        onChange={(e) => setResumeText(e.target.value)}
        rows={10}
        placeholder = "Paste your resume text here"
      />
      <button onClick={handleReview} disabled={loading || resumeText.trim().length < 50}>
        {loading ? "Analyzing..." : "Review my resume"}
      </button>
      <pre style={{whiteSpace: "pre-wrap"}}>{feedback}</pre>
    </main>
  )
}

export default App;