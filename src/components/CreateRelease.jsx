import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkAlerts from 'remark-github-alerts';
import rehypeRaw from 'rehype-raw';
import { FaRocket, FaPen, FaTag, FaFileAlt, FaEye, FaEdit, FaTrash, FaMagic, FaRobot, FaTimes, FaKey, FaSave, FaShieldAlt } from 'react-icons/fa';
import '../styles/CreateRelease.css';

function CreateRelease({
  version,
  setVersion,
  title,
  setTitle,
  notes,
  setNotes,
  isPreview,
  setIsPreview,
  isReleasing,
  handleCreateRelease,
  suggestedVersion
}) {
  const textareaRef = useRef(null);
  const previewRef = useRef(null);

  // AI state
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [savedApiKey, setSavedApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  // Load saved API key on mount
  useEffect(() => {
    window.api.getApiKey().then(key => {
      if (key) setSavedApiKey(key);
    });
  }, []);

  const handleVersionFocus = () => {
    // Auto-fill version if empty and we have a suggestion
    if (!version && suggestedVersion) {
      setVersion(suggestedVersion);
    }
  };

  // Auto-resize textarea and preview
  useEffect(() => {
    const textarea = textareaRef.current;
    const preview = previewRef.current;
    
    if (textarea && !isPreview) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 120), 375);
      textarea.style.height = `${newHeight}px`;
    }
    
    // Preview χρησιμοποιεί CSS max-height + overflow-y, όχι δυναμικό ύψος
  }, [notes, isPreview]);

  const handleSaveApiKey = async () => {
    const result = await window.api.saveApiKey(apiKey);
    if (result.success) {
      setSavedApiKey(apiKey);
      setApiKey('');
      setShowKeyInput(false);
    }
  };

  const handleFormatWithAI = async () => {
    const key = savedApiKey;
    if (!key) { setShowKeyInput(true); return; }
    if (!aiText.trim()) { setAiError('Γράψε κάτι πρώτα!'); return; }

    setAiLoading(true);
    setAiError('');

    const result = await window.api.formatWithAI({ text: aiText, apiKey: key });

    setAiLoading(false);
    if (result.success) {
      setNotes(result.result);
      if (result.title) setTitle(result.title);
      setShowAiModal(false);
      setAiText('');
    } else {
      setAiError(result.error || 'Something went wrong');
    }
  };

  return (
    <div className="tab-content fade-in">
      <div className="release-form-container glass-panel">
        {/* Version & Title Row */}
        <div className="form-row">
          <div className="form-card glass-panel-light">
            <div className="form-card-header">
              <FaTag className="form-card-icon" />
              <span>Version Tag</span>
            </div>
            <div className="form-card-body">
              <input
                className="modern-input"
                value={version}
                onChange={e => setVersion(e.target.value)}
                onFocus={handleVersionFocus}
                placeholder={suggestedVersion || "v1.0.0"}
              />
            </div>
          </div>

          <div className="form-card glass-panel-light flex-2">
            <div className="form-card-header">
              <FaPen className="form-card-icon" />
              <span>Release Title</span>
            </div>
            <div className="form-card-body">
              <input
                className="modern-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Major Update: New Features & Improvements"
              />
            </div>
          </div>
        </div>

        {/* Notes Editor */}
        <div className="form-card notes-card glass-panel-light">
          <div className="form-card-header">
            <div className="header-left">
              <FaFileAlt className="form-card-icon" />
              <span>Release Notes</span>
            </div>
            <div className="editor-mode-toggle">
              <button
                className={`mode-btn ${!isPreview ? 'active' : ''}`}
                onClick={() => setIsPreview(false)}
                title="Edit Mode"
              >
                <FaEdit size={12} />
                <span>Edit</span>
              </button>
              <button
                className={`mode-btn ${isPreview ? 'active' : ''}`}
                onClick={() => setIsPreview(true)}
                title="Preview Mode"
              >
                <FaEye size={12} />
                <span>Preview</span>
              </button>
            </div>
          </div>

          <div className="notes-editor-container">
            {isPreview ? (
              <div className="markdown-preview custom-scrollbar">
                {notes ? (
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkAlerts]}
                    rehypePlugins={[rehypeRaw]}
                  >
                    {notes}
                  </ReactMarkdown>
                ) : (
                  <div className="empty-preview" id="notes-empty-state">
                    <FaFileAlt size={18} />
                    <p>No content to preview</p>
                  </div>
                )}
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                className="notes-textarea custom-scrollbar"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Write your release notes in Markdown..."
              />
            )}
          </div>

          <div className="notes-footer">
            <div className="quick-actions">
              <button
                className="quick-btn ai-btn"
                onClick={() => setShowAiModal(true)}
                title="Format with AI"
              >
                <FaRobot size={11} />
                <span>AI Format</span>
              </button>
              <button
                className="quick-btn danger"
                onClick={() => setNotes('')}
                title="Clear notes"
              >
                <FaTrash size={11} />
                <span>Clear</span>
              </button>
            </div>
            <span className="char-count">{notes.length} characters</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="release-form-actions">
          <button
            className="reset-btn glass-panel"
            onClick={() => {
              setVersion('');
              setTitle('');
              setNotes('### What\'s New\n\n- Bug fixes\n- Performance improvements\n- New features');
            }}
          >
            Reset Form
          </button>
          <button
            className="publish-btn"
            onClick={handleCreateRelease}
            disabled={!version || !title || isReleasing}
          >
            <FaRocket size={14} />
            <span>{isReleasing ? 'Publishing...' : 'Publish Release'}</span>
            {isReleasing && <div className="btn-loader"></div>}
          </button>
        </div>
      </div>
      {/* AI Modal */}
      {showAiModal && (
        <div className="modal-backdrop modal-visible" onClick={e => e.target === e.currentTarget && setShowAiModal(false)}>
          <div className="modal-card modal-card-visible ai-modal">

            <div className="modal-header">
              <div className="modal-icon ai"><FaRobot size={16} /></div>
              <div className="modal-header-text">
                <h3>AI Release Notes</h3>
                <p>Describe what you did and the AI will format it for GitHub</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowAiModal(false)}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="modal-body">

              {/* API Key section */}
              <div className="ai-key-section">
                <div className="ai-key-section-inner">
                  <div className="ai-key-label">
                    <FaShieldAlt /> API Configuration
                  </div>
                  {savedApiKey && !showKeyInput ? (
                    <div className="ai-key-saved">
                      <div className="ai-key-saved-icon">
                        <FaKey size={11} />
                      </div>
                      <div className="ai-key-saved-text">
                        <span className="ai-key-saved-title">Key secured</span>
                        <span className="ai-key-saved-hint">DeepSeek API key is saved locally</span>
                      </div>
                      <button className="ai-key-change-btn" onClick={() => setShowKeyInput(true)}>Change</button>
                    </div>
                  ) : (
                    <>
                      <div className="ai-key-row">
                        <div className="ai-key-icon">
                          <FaKey size={11} />
                        </div>
                        <div className="ai-key-input-wrapper">
                          <input
                            type="password"
                            className="ai-key-input"
                            placeholder="DeepSeek API Key (sk-...)"
                            value={apiKey}
                            onChange={e => setApiKey(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && apiKey && handleSaveApiKey()}
                          />
                        </div>
                      </div>
                      <button className="ai-key-save-btn" onClick={handleSaveApiKey} disabled={!apiKey}>
                        <FaSave size={11} />
                        <span>Save Key</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Text input */}
              <div className="ai-text-section">
                <label className="ai-label">What should I write in the release?</label>
                <textarea
                  className="ai-textarea custom-scrollbar"
                  placeholder="e.g. Fixed login bug, added dark mode, improved search performance..."
                  value={aiText}
                  ref={el => {
                    if (el) el.style.height = aiText.trim() ? '300px' : '40px';
                  }}
                  onChange={e => {
                    setAiText(e.target.value);
                    setAiError('');
                    e.target.style.height = e.target.value.trim() ? '300px' : '40px';
                  }}
                />
              </div>

              {aiError && <div className="error-message">{aiError}</div>}

            </div>

            <div className="modal-actions">
              <button className="modal-btn modal-btn-cancel" onClick={() => setShowAiModal(false)} disabled={aiLoading}>
                Cancel
              </button>
              <button className="modal-btn ai-format-btn" onClick={handleFormatWithAI} disabled={aiLoading || !aiText.trim()}>
                {aiLoading ? (
                  <><div className="btn-spinner"></div><span>Formatting...</span></>
                ) : (
                  <><FaRobot size={13} /><span>Format with AI</span></>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default CreateRelease;
