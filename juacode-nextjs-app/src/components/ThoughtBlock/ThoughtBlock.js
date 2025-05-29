import React, { useState } from 'react';
import './ThoughtBlock.css';

function ThoughtBlock({ thought }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="thought-block">
      <div className="thought-header" onClick={() => setIsOpen(!isOpen)}>
        <span>{isOpen ? "Hide thoughts" : "Show thoughts"}</span>
        <span className={`thought-toggle ${isOpen ? "open" : ""}`}>▼</span>
      </div>
      {isOpen && <div className="thought-content">{thought}</div>}
    </div>
  );
}

export default ThoughtBlock;
