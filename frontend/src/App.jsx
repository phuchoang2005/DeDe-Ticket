import { useEffect, useState } from "react";
import { fetchEvents } from "./services/api";

function App() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetchEvents().then(setEvents).catch(console.error);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">🎟️ Event List</h1>
      <ul>
        {events.map((e, i) => (
          <li key={i} className="border p-2 mb-2 rounded">
            {e.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
