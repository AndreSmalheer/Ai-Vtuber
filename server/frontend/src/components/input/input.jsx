import "./input.css";

function Input({ inputmsg, setInputmsg, setChatmsg, chatRole, setChatRole, inputLocked, setInputLocked }) {
  function handleInput() {
    setChatmsg(inputmsg);
    setInputmsg("");
    setChatRole("User");
  }

  return (
    <div className={`input-container ${inputLocked ? "disabled" : ""}`}>
      <input
        type="text"
        placeholder="Type your message here..."
        value={inputmsg}
        onChange={(e) => setInputmsg(e.target.value)}
        onKeyPress={(e) => e.key === "Enter" && handleInput()}
        disabled={inputLocked}
      />
      <button disabled={inputLocked} className="send-btn" onClick={handleInput}></button>
    </div>
  );
}

export default Input;
