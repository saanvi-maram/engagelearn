import { useState, useEffect } from "react";

export default function Hero() {

  const [clicks, setClicks] = useState(0);
  const [scrollDepth, setScrollDepth] = useState(0);
  const [interactions, setInteractions] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [score, setScore] = useState(null);

  // Track time
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Track scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const height = document.body.scrollHeight - window.innerHeight;
      const scrolled = (scrollTop / height) * 100;
      setScrollDepth(Math.round(scrolled));
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Send data to backend
  const sendData = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/engagement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          timeSpent,
          clicks,
          scrollDepth,
          interactions
        })
      });

      const data = await res.json();
      setScore(data.engagementScore);

    } catch (err) {
      console.log("Backend not running");
    }
  };

  // Auto update
  useEffect(() => {
    const interval = setInterval(sendData, 5000);
    return () => clearInterval(interval);
  }, [timeSpent, clicks, scrollDepth, interactions]);

  const handleClick = () => {
    setClicks(c => c + 1);
    setInteractions(i => i + 1);
  };

  return (
    <section style={{ textAlign: "center", padding: "80px" }}>
      <h1>Learn Smarter with AI</h1>
      <button onClick={handleClick}>Start Learning</button>

      <p>Time: {timeSpent}s</p>
      <p>Clicks: {clicks}</p>
      <p>Scroll: {scrollDepth}%</p>

      {score && <h2>Engagement Score: {score}</h2>}
    </section>
  );
}