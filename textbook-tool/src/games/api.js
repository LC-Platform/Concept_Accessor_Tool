const BASE_URL = "http://10.1.88.14:8500";

function getUserId() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return user.user_id;
}

export async function getGameMetadata() {
  const res = await fetch(`${BASE_URL}/api/questions/metadata`);
  return res.json();
}

export async function getGameQuestions(gameId) {
  const res = await fetch(`${BASE_URL}/api/questions/${gameId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch questions for game: ${gameId}`);
  }
  return res.json();
}

export async function submitReport(playedGames) {
  const res = await fetch(`${BASE_URL}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: getUserId(),
      played_games: playedGames
    }),
  });
  return res.json();
}

export async function getReports() {
  const res = await fetch(`${BASE_URL}/api/reports?user_id=${getUserId()}`);
  return res.json();
}

export async function clearReports() {
  const res = await fetch(`${BASE_URL}/api/reports?user_id=${getUserId()}`, {
    method: "DELETE",
  });
  return res.json();
}