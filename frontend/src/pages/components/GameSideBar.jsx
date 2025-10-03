import { useEffect, useState } from "react";
import axios from "axios";
import "./GameSideBar.css";

export default function GamesSidebar({ onSelectGame, onGamesLoaded }) {
  const [games, setGames] = useState([]);
  const [activeGame, setActiveGame] = useState(null);

  useEffect(() => {
    const fetchGames = async () => {
      try {
  const res = await axios.get(
  "https://api.rawg.io/api/games?key=22f62362c5084101a5cd7cd6146f1f97&page_size=20"
  );
  setGames(res.data.results);
  if (onGamesLoaded) onGamesLoaded(res.data.results);
      } catch (err) {
        console.error("Games fetch error:", err);
      }
    };
    fetchGames();
  }, []);

  const handleSelectGame = (game) => {
    setActiveGame(game);
    if (onSelectGame) onSelectGame(game); // Dashboard'a seçilen oyunu iletir
    console.log("Selected game:", game.name);
  };

  return (
    <div className="games-sidebar">
      <h3>Games</h3>
      <div className="games-list">
        {games.map((game) => (
          <div
            key={game.id}
            className={`game-card ${activeGame?.id === game.id ? "active" : ""}`}
            onClick={() => handleSelectGame(game)}
          >
            <img src={game.background_image} alt={game.name} className="game-img" />
            <div className="game-info">
              <span className="game-name">{game.name}</span>
              <span className="game-platforms">
                {game.platforms?.map((p) => p.platform.name).join(", ")}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
