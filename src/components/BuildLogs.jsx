import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FaRocket, FaCopy, FaCheck, FaTrash } from 'react-icons/fa';

function BuildLogs({ 
  logs, 
  setLogs, 
  isBuilding, 
  handleBuild 
}) {
  const logEndRef = useRef(null);
  const terminalBodyRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [copyError, setCopyError] = useState(false);

  // Auto-scroll όταν υπάρχουν νέα logs
  useEffect(() => {
    if (logEndRef.current && !isClearing) {
      logEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [logs, isClearing]);

  // Handle clear logs with animation
  const handleClearLogs = useCallback(() => {
    if (!logs || isBuilding) return;
    
    setIsClearing(true);
    
    // Μικρή καθυστέρηση για το animation
    setTimeout(() => {
      setLogs('');
      setIsClearing(false);
    }, 200);
  }, [logs, isBuilding, setLogs]);

  // Handle copy to clipboard
  const handleCopyLogs = useCallback(async () => {
    if (!logs) return;
    
    try {
      await navigator.clipboard.writeText(logs);
      setCopied(true);
      setCopyError(false);
      
      // Reset το copied status μετά από 2 δευτερόλεπτα
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopyError(true);
      setTimeout(() => setCopyError(false), 2000);
    }
  }, [logs]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Αποφυγή όταν ο χρήστης γράφει σε input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Ctrl + Enter για build
      if (e.ctrlKey && e.key === 'Enter' && !isBuilding && !isClearing) {
        e.preventDefault();
        console.log('Shortcut: Ctrl+Enter pressed'); // Debug
        handleBuild();
      }
      
      // Esc για clear
      if (e.key === 'Escape' && logs && !isBuilding && !isClearing) {
        e.preventDefault();
        console.log('Shortcut: Escape pressed'); // Debug
        handleClearLogs();
      }
      
      // Ctrl + C για copy (μόνο όταν υπάρχει selection)
      if (e.ctrlKey && e.key === 'c' && logs && !isClearing) {
        // Άφησε το default copy να δουλέψει αν υπάρχει selection
        const selection = window.getSelection().toString();
        if (!selection) {
          e.preventDefault();
          console.log('Shortcut: Ctrl+C pressed (no selection)'); // Debug
          handleCopyLogs();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [logs, isBuilding, isClearing, handleBuild, handleClearLogs, handleCopyLogs]);

  // Line counter
  const lineCount = logs ? logs.split('\n').filter(line => line.trim()).length : 0;
  const charCount = logs ? logs.length : 0;

  return (
    <div className="tab-content fade-in full-height">
      <div className="tab-header">
        <div className="tab-header-content">
          <h1>Build Console</h1>
          <p className="tab-description">
            Monitor build process in real-time
          </p>
        </div>
        <div className="log-actions" style={{ display: 'flex', gap: '8px' }}>
          {/* Copy Button */}
          <button 
            className="secondary-btn" 
            onClick={handleCopyLogs}
            disabled={!logs || isClearing || isBuilding}
            style={{ 
              position: 'relative',
              overflow: 'hidden',
              minWidth: '100px',
              transition: 'all 0.2s ease'
            }}
          >
            {copied ? (
              <>
                <FaCheck size={14} style={{ marginRight: '6px' }} />
                Copied!
              </>
            ) : copyError ? (
              <>
                <FaCopy size={14} style={{ marginRight: '6px' }} />
                Failed
              </>
            ) : (
              <>
                <FaCopy size={14} style={{ marginRight: '6px' }} />
                Copy Logs
              </>
            )}
          </button>
          
          {/* Clear Button με animation */}
          <button 
            className="secondary-btn" 
            onClick={handleClearLogs}
            disabled={!logs || isBuilding || isClearing}
            style={{
              transition: 'all 0.2s ease',
              transform: isClearing ? 'scale(0.95)' : 'scale(1)',
              opacity: isClearing || !logs ? 0.5 : 1
            }}
          >
            <FaTrash size={14} style={{ marginRight: '6px' }} />
            Clear Logs
          </button>
          
          {/* Build Button */}
          <button 
            className="primary-btn" 
            onClick={handleBuild}
            disabled={isBuilding || isClearing}
            style={{
              background: isBuilding ? 'linear-gradient(135deg, #4a4a4a, #2a2a2a)' : undefined,
              cursor: isBuilding ? 'progress' : 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <FaRocket size={14} style={{ 
              marginRight: '6px',
              animation: isBuilding ? 'spin 2s linear infinite' : 'none'
            }} /> 
            {isBuilding ? 'Building...' : 'Run Build'}
          </button>
        </div>
      </div>
      
      {/* Terminal - ΧΩΡΙΣ shadow */}
      <div 
        className="terminal-container"
        style={{
          transition: 'opacity 0.2s ease, transform 0.2s ease',
          opacity: isClearing ? 0.7 : 1,
          transform: isClearing ? 'scale(0.98)' : 'scale(1)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 200px)',
          minHeight: '400px',
          boxShadow: 'none !important' // Αφαίρεση shadow
        }}
      >
        <div className="terminal-header">
          <div className="terminal-title">
            <div className="terminal-dot red"></div>
            <div className="terminal-dot yellow"></div>
            <div className="terminal-dot green"></div>
            <span>console.log</span>
          </div>
          <div className="terminal-stats">
            {isBuilding && (
              <span className="building-indicator">⚡ Building</span>
            )}
            <span className="log-count" title={`${charCount} characters`}>
              {lineCount} line{lineCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        
        <div 
          ref={terminalBodyRef}
          className="terminal-body"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            background: 'var(--bg-tertiary)',
            fontFamily: '"JetBrains Mono", "Consolas", monospace',
            fontSize: '13px',
            lineHeight: '1.6',
            transition: 'background-color 0.2s ease'
          }}
        >
          <pre className="terminal-output" style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {logs || "➜ Ready to build. Click 'Run Build' to start."}
          </pre>
          <div ref={logEndRef} />
        </div>
        
        <div className="terminal-footer" style={{
          padding: '8px 16px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          fontSize: '11px',
          color: 'var(--text-secondary)'
        }}>
          <div className="terminal-hint" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <span><kbd>Ctrl</kbd> + <kbd>Enter</kbd> Run build</span>
            <span><kbd>Esc</kbd> Clear logs</span>
            <span><kbd>Ctrl</kbd> + <kbd>C</kbd> Copy all (no selection)</span>
            <span style={{ marginLeft: 'auto' }}>
              {logs ? `${charCount} chars` : 'Ready'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BuildLogs;