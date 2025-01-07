import React, { useState, useEffect, useMemo, useRef } from 'react';
import { usePDF } from 'react-to-pdf';

const RangeGrid = () => {
  const { toPDF, targetRef } = usePDF({
    filename: () => `${rangeName || 'poker-range'}.pdf`,
  });
  const [grid, setGrid] = useState(() => {
    // Try to load saved grid from localStorage on initial render
    const savedGrid = localStorage.getItem('pokerRange');
    return savedGrid ? JSON.parse(savedGrid) : Array(13).fill(null).map(() => Array(13).fill(null));
  });
  const [selectedColor, setSelectedColor] = useState('green'); // Default tag color
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [rangePercent, setRangePercent] = useState(0);
  const [rangeName, setRangeName] = useState('');
  const [savedRanges, setSavedRanges] = useState(() => {
    const ranges = localStorage.getItem('rangeLibrary');
    return ranges ? JSON.parse(ranges) : {};
  });
  const [tagNames, setTagNames] = useState(() => {
    // Try to load saved tag names from localStorage
    const savedTagNames = localStorage.getItem('tagNames');
    return savedTagNames ? JSON.parse(savedTagNames) : {
      green: 'Green',
      red: 'Red',
      yellow: 'Yellow'
    };
  });

  const labels = [
    'A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2',
  ];

  // Calculate hand strength rankings (from strongest to weakest)
  const handRankings = useMemo(() => {
    const rankings = [];
    
    // 1. Pocket pairs from highest to lowest (AA to 22)
    for (let i = 0; i < labels.length; i++) {
      rankings.push({ row: i, col: i });
    }

    // 2. Non-pair hands (both suited and offsuit)
    for (let i = 0; i < labels.length - 1; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        // Add suited hands first (stronger)
        rankings.push({ row: j, col: i });
        // Then add offsuit hands (weaker)
        rankings.push({ row: i, col: j });
      }
    }

    return rankings;
  }, []);

  // Update grid based on percentage
  const updateGridByPercentage = (percent) => {
    const newGrid = Array(13).fill(null).map(() => Array(13).fill(null));
    const totalHands = handRankings.length;
    const handsToColor = Math.floor((percent / 100) * totalHands);

    // Color the top X% of hands
    for (let i = 0; i < handsToColor; i++) {
      const { row, col } = handRankings[i];
      newGrid[row][col] = selectedColor;
    }

    setGrid(newGrid);
    setRangePercent(percent);
  };

  // Handle slider change
  const handleSliderChange = (event) => {
    const newPercent = parseFloat(event.target.value);
    updateGridByPercentage(newPercent);
  };

  // Modified cell click handler to toggle color
  const handleCellClick = (row, col) => {
    const newGrid = [...grid];
    // If cell already has the selected color, remove it
    // Otherwise, apply the selected color
    newGrid[row][col] = grid[row][col] === selectedColor ? null : selectedColor;
    setGrid(newGrid);
  };

  // Helper to determine if a cell should be displayed
  const getCellContent = (row, col) => {
    const card1 = labels[row];
    const card2 = labels[col];
    
    if (row === col) {
      return `${card1}${card1}`; // Pocket pairs
    }
    if (row < col) {
      return `${card1}${card2}o`; // Offsuit hands below diagonal
    }
    return `${card1}${card2}s`; // Suited hands above diagonal
  };

  // Helper to determine if cell should be shown
  const shouldShowCell = (row, col) => {
    return row <= 12 && col <= 12; // Show all valid cells
  };

  // Modified save handler to save named ranges
  const handleSave = () => {
    if (!rangeName.trim()) {
      alert('Please enter a name for this range');
      return;
    }

    const newSavedRanges = {
      ...savedRanges,
      [rangeName]: grid
    };

    localStorage.setItem('rangeLibrary', JSON.stringify(newSavedRanges));
    setSavedRanges(newSavedRanges);
    setRangeName('');
    alert('Range saved successfully!');
  };

  // Load a range from library
  const handleLoadRange = (name) => {
    const rangeToLoad = savedRanges[name];
    if (rangeToLoad) {
      setGrid(rangeToLoad);
    }
  };

  // Delete a range from library
  const handleDeleteRange = (name) => {
    const newSavedRanges = { ...savedRanges };
    delete newSavedRanges[name];
    localStorage.setItem('rangeLibrary', JSON.stringify(newSavedRanges));
    setSavedRanges(newSavedRanges);
  };

  // Clear the current range
  const handleClear = () => {
    setGrid(Array(13).fill(null).map(() => Array(13).fill(null)));
    localStorage.removeItem('pokerRange');
  };

  // Handle mouse down event
  const handleMouseDown = (row, col) => {
    setIsMouseDown(true);
    handleCellClick(row, col);
  };

  // Handle mouse enter event (for dragging)
  const handleMouseEnter = (row, col) => {
    if (isMouseDown) {
      handleCellClick(row, col);
    }
  };

  // Handle mouse up event
  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  useEffect(() => {
    // Add global mouse up handler to stop dragging even if mouse is released outside grid
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Add this helper function for the mini grid preview
  const MiniRangePreview = ({ grid }) => {
    return (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(13, 4px)',
        gap: '1px',
        backgroundColor: '#eee',
        padding: '2px',
        borderRadius: '2px'
      }}>
        {grid.map((row, i) => (
          row.map((cell, j) => (
            <div
              key={`mini-${i}-${j}`}
              style={{
                width: '4px',
                height: '4px',
                backgroundColor: cell || 'white',
              }}
            />
          ))
        ))}
      </div>
    );
  };

  // Replace handleExportPDF with this simpler version
  const handleExportPDF = () => {
    toPDF();
  };

  // Add handler for tag name changes
  const handleTagNameChange = (color, newName) => {
    const updatedTagNames = {
      ...tagNames,
      [color]: newName
    };
    setTagNames(updatedTagNames);
    // Save to localStorage
    localStorage.setItem('tagNames', JSON.stringify(updatedTagNames));
  };

  return (
    <div style={{ display: 'flex', gap: '20px' }}>
      {/* Left side - Main grid and controls */}
      <div>
        {/* Range Name Input and Controls */}
        <div style={{ 
          marginBottom: '15px',
          display: 'flex',
          gap: '10px',
          alignItems: 'center'
        }}>
          <input
            type="text"
            value={rangeName}
            onChange={(e) => setRangeName(e.target.value)}
            placeholder="Enter range name"
            style={{ 
              padding: '8px',
              width: '200px',
              fontSize: '14px',
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}
          />
          <button 
            onClick={handleSave}
            style={{ 
              backgroundColor: '#4CAF50', 
              color: 'white', 
              padding: '8px 15px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Save Range
          </button>
          <button 
            onClick={handleClear}
            style={{ 
              backgroundColor: '#f44336', 
              color: 'white', 
              padding: '8px 15px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Clear Grid
          </button>
          <button 
            onClick={handleExportPDF}
            style={{ 
              backgroundColor: '#2196F3', 
              color: 'white', 
              padding: '8px 15px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Export PDF
          </button>
        </div>

        {/* PDF Export Section */}
        <div ref={targetRef} style={{ backgroundColor: 'white', padding: '20px' }}>
          {rangeName && <h2 style={{ marginBottom: '15px' }}>{rangeName}</h2>}
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(14, 30px)',
            gap: '1px',
            userSelect: 'none',
          }}>
            {/* Top Row Labels */}
            <div />
            {labels.map((label, index) => (
              <div key={`top-${index}`} style={{ textAlign: 'center', padding: '5px 0' }}>
                {label}
              </div>
            ))}

            {/* Grid Rows */}
            {labels.map((rowLabel, row) => (
              <React.Fragment key={`row-${row}`}>
                <div style={{ textAlign: 'center', padding: '5px 0' }}>{rowLabel}</div>
                {labels.map((_, col) => {
                  if (!shouldShowCell(row, col)) {
                    return <div key={`cell-${row}-${col}`} />;
                  }
                  
                  return (
                    <div
                      key={`cell-${row}-${col}`}
                      onMouseDown={() => handleMouseDown(row, col)}
                      onMouseEnter={() => handleMouseEnter(row, col)}
                      style={{
                        width: 30,
                        height: 30,
                        border: '1px solid black',
                        backgroundColor: grid[row][col] || 'white',
                        cursor: 'pointer',
                        fontSize: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        userSelect: 'none', // Prevent text selection while dragging
                      }}
                    >
                      {getCellContent(row, col)}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          {/* Tag Legend for PDF */}
          <div style={{ marginTop: '20px' }}>
            <h3>Tags</h3>
            <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
              {Object.entries(tagNames).map(([color, name]) => (
                <div key={color} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ 
                    width: '15px', 
                    height: '15px', 
                    backgroundColor: color,
                    border: '1px solid #ddd'
                  }} />
                  <span>{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Percentage Slider */}
        <div style={{ 
          marginTop: 20,
          padding: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={rangePercent}
            onChange={handleSliderChange}
            style={{ width: '200px' }}
          />
          <span>{rangePercent.toFixed(1)}% of hands</span>
        </div>
      </div>

      {/* Right side - Tags and Saved Ranges */}
      <div style={{ minWidth: '300px' }}>
        {/* Color Tags */}
        <div style={{ 
          marginBottom: '20px',
          padding: '15px',
          border: '1px solid #ddd',
          borderRadius: '8px'
        }}>
          <h3>Tags</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { color: 'green', defaultName: 'Green' },
              { color: 'red', defaultName: 'Red' },
              { color: 'yellow', defaultName: 'Yellow' }
            ].map(({ color, defaultName }) => (
              <div key={color} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button 
                  onClick={() => setSelectedColor(color)}
                  style={{ 
                    backgroundColor: color,
                    width: '20px',
                    height: '20px',
                    border: selectedColor === color ? '2px solid black' : '1px solid #ddd',
                    cursor: 'pointer'
                  }}
                />
                <input
                  type="text"
                  value={tagNames[color]}
                  onChange={(e) => handleTagNameChange(color, e.target.value)}
                  style={{
                    border: 'none',
                    borderBottom: '1px solid #ddd',
                    padding: '4px',
                    fontSize: '14px',
                    width: '100px'
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Saved Ranges */}
        <div style={{ 
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '15px'
        }}>
          <h3>Saved Ranges</h3>
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            maxHeight: '600px',
            overflowY: 'auto'
          }}>
            {Object.entries(savedRanges).map(([name, rangeGrid]) => (
              <div 
                key={name} 
                style={{ 
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '10px',
                  backgroundColor: 'white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px'
                }}>
                  <strong style={{ fontSize: '14px' }}>{name}</strong>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                      onClick={() => handleLoadRange(name)}
                      style={{ 
                        backgroundColor: '#2196F3',
                        color: 'white',
                        padding: '3px 8px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleDeleteRange(name)}
                      style={{ 
                        backgroundColor: '#f44336',
                        color: 'white',
                        padding: '3px 8px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <MiniRangePreview grid={rangeGrid} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RangeGrid;
