import { useEffect, useState } from "react";
import "./ChatHistory.css";

function ChatHistory() {
  const [history, setHistory] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [indexToDelete, setIndexToDelete] = useState(null);
  const [selectedDate, setSelectedDate] = useState("All");
  const [config, setConfig] = useState({
    user_name: "Andre",
    ai_name: "Mia",
  });

  const fetchHistory = () => {
    fetch("/api/history")
      .then((res) => res.json())
      .then((data) => setHistory(data))
      .catch((err) => console.error("Error fetching history:", err));
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        setConfig(data);
      })
      .catch((err) => console.error("Error fetching config:", err));
  }, []);

  const confirmDelete = (index) => {
    setIndexToDelete(index);
    setShowConfirm(true);
  };

  const handleDeleteMessage = async () => {
    if (indexToDelete === null) return;

    try {
      const response = await fetch(`/api/history/${indexToDelete}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setShowConfirm(false);
        setIndexToDelete(null);
        fetchHistory();
      }
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };

  const handleClearAll = async () => {
    try {
      const response = await fetch("/api/history", {
        method: "DELETE",
      });
      if (response.ok) {
        setShowClearAllConfirm(false);
        fetchHistory();
      }
    } catch (err) {
      console.error("Error clearing history:", err);
    }
  };

  const getAvailableDates = () => {
    const dates = new Set(["All"]);
    history.forEach((entry) => {
      if (entry.timestamp) {
        const date = new Date(entry.timestamp).toLocaleDateString();
        dates.add(date);
      }
    });
    return Array.from(dates);
  };

  const filteredHistory = history
    .map((entry, index) => ({ ...entry, originalIndex: index }))
    .filter((entry) => {
      if (selectedDate === "All") return true;
      if (!entry.timestamp) return false;
      return new Date(entry.timestamp).toLocaleDateString() === selectedDate;
    })
    .reverse();

  return (
    <div className="chatHistory">
      <section className="chatHistoryHero">
        <div className="chatHistoryHero__glow"></div>
        <img
          className="chatHistoryHero__image"
          src="/settings-img/chat-history.png"
          alt=""
        />
        <div className="chatHistoryHero__content">
          <h1 className="chatHistoryHero__title">Chat history</h1>
          <p className="chatHistoryHero__copy">
            {history.length === 0
              ? "Saved conversations will appear here."
              : `${history.length} saved conversation${history.length === 1 ? "" : "s"}.`}
          </p>
        </div>
      </section>

      <div className="historyHeader">
        <div className="dateFilters">
          {getAvailableDates().map((date) => (
            <button
              key={date}
              className={`dateTag ${selectedDate === date ? "active" : ""}`}
              onClick={() => setSelectedDate(date)}
            >
              {date}
            </button>
          ))}
        </div>
        {history.length > 0 && (
          <button
            className="clearAllBtn"
            onClick={() => setShowClearAllConfirm(true)}
          >
            Clear All
          </button>
        )}
      </div>

      {filteredHistory.length === 0 && (
        <p className="noHistory">No history available for this selection.</p>
      )}

      <div className="chatEntryList">
        {filteredHistory.map((entry) => (
          <div key={entry.originalIndex} className="chatEntry">
            <button
              className="deleteMessageBtn"
              onClick={() => confirmDelete(entry.originalIndex)}
              title="Delete message"
            ></button>

            <div className="aiMessage">
              <div className="messageHeader">
                <h1 className="aiLabel">{config.ai_name}</h1>
                {entry.timestamp && (
                  <span className="messageTimestamp">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                )}
              </div>
              <p className="aiText">{entry.ai}</p>
            </div>

            <div className="messageDivider"></div>

            <div className="userMessage">
              <div className="messageHeader">
                <h1 className="userLabel">{config.user_name}</h1>
              </div>
              <p className="userText">{entry.user}</p>
            </div>
          </div>
        ))}
      </div>

      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">Delete Message?</h2>
            <p className="modal-text">This action cannot be undone.</p>
            <div className="modal-actions">
              <button
                className="modal-btn cancel"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
              <button className="modal-btn confirm" onClick={handleDeleteMessage}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearAllConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">Clear All History?</h2>
            <p className="modal-text">
              This will delete ALL messages. This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                className="modal-btn cancel"
                onClick={() => setShowClearAllConfirm(false)}
              >
                Cancel
              </button>
              <button className="modal-btn confirm" onClick={handleClearAll}>
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatHistory;
