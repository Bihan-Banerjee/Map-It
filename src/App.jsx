import React, { useState, useEffect } from "react";
import WorldMap from "./components/WorldMap";
import Loader from "./components/Loader";

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 2000); 
  }, []);

  return (
    <>
      {loading ? <Loader /> : <WorldMap />}
    </>
  );
}

export default App;