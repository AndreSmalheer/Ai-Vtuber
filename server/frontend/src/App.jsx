import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home/Home";
import Settings from "./pages/Settings/Settings"; // This is now the menu component
import GeneralSettings from "./pages/GeneralSettings/GeneralSettings"; // New settings page
import ChatHistory from "./pages/ChatHistory/ChatHistory"; // New chat history page
import Header from "./components/header/header";

function App() {
  return (
    <div className="main-content">

      <Routes>
        <Route path="/" element={<Home />} />
        {/* This route acts as the settings navigation menu */}
        <Route
          path="/settings-nav"
          element={
            <>
              <Header backBtn={true} settingsBtn={false} />
              <Settings /> {/* This component now acts as the menu */}
            </>
          }
        />
        {/* New routes for specific settings pages */}
        <Route
          path="/settings"
          element={
            <>
              <Header backBtn={true} settingsBtn={false} fixed={true} />
              <GeneralSettings />
            </>
          }
        />
        <Route
          path="/chat-history"
          element={
            <>
              <Header backBtn={true} settingsBtn={false} fixed={true} />
              <ChatHistory />
            </>
          }
        />      </Routes>
    </div>
  );
}

export default App;
