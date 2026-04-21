const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const fetchEvents = async () => {
  const res = await fetch(`${API_BASE_URL}/api/events`);
  return res.json();
};
