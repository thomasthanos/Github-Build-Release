import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkAlerts from 'remark-github-alerts';
import rehypeRaw from 'rehype-raw';
import { FaRocket, FaTrash, FaExclamationTriangle, FaTag, FaFileAlt, FaFolder, FaCheck, FaSpinner } from 'react-icons/fa';

function Modal({ isOpen, onClose, onConfirm, title, icon, iconClass = '', confirmText = 'Confirm', cancelText = 'Cancel', confirmClass = 'primary', isLoading = false, children }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => { setIsVisible(true); requestAnimationFrame(() => requestAnimationFrame(() => setIsAnimating(true))); });
    } else {
      requestAnimationFrame(() => setIsAnimating(false));
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible) return null;

  return (
    <div className={`modal-backdrop ${isAnimating ? 'modal-visible' : ''}`} onClick={e => e.target === e.currentTarget && !isLoading && onClose()}>
      <div className={`modal-card glass-panel ${isAnimating ? 'modal-card-visible' : ''}`}>
        {/* Header - Όλα σε μια γραμμή */}
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', borderBottom: '1px solid var(--border)' }}>
          <div className={`modal-icon ${iconClass}`} style={{ width: '30px', height: '30px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>{icon}</div>
          <div className="modal-header-text" style={{ flex: 1, minWidth: 0 }}><h3 className="modal-title" style={{ fontSize: '18px', fontWeight: '700', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h3></div>
          <button
            className="modal-close-btn"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close modal"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3L13 13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              <path d="M13 3L3 13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body - Μόνο padding left/right */}
        {children && <div className="modal-body" style={{ padding: '12px 16px 0', flex: 1, overflowY: 'auto' }}>{children}</div>}

        {/* Actions */}
        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
          <button className="modal-btn modal-btn-cancel" onClick={onClose} disabled={isLoading} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0px 20px', borderRadius: 'var(--radius-sm)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'var(--transition)', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>{cancelText}</button>
          <button className={`modal-btn modal-btn-${confirmClass}`} onClick={onConfirm} disabled={isLoading} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: 'var(--radius-sm)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'var(--transition)', border: 'transparent', background: confirmClass === 'danger' ? 'linear-gradient(135deg, #ff6b6b, #ff9e6d)' : 'linear-gradient(135deg, var(--accent), #a855f7)', color: 'white' }}>
            {isLoading ? <><FaSpinner className="btn-spinner" size={12} style={{ animation: 'spin 0.8s linear infinite' }} /><span>Working...</span></> : <><span>{confirmText}</span></>}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DeleteModal({ isOpen, pendingDelete, onClose, onConfirm, isDeleting }) {
  if (!pendingDelete) return null;
  const isTagOnly = pendingDelete.type === 'tag-only';
  return (
    <Modal isOpen={isOpen} onClose={onClose} onConfirm={onConfirm} title={`Delete ${isTagOnly ? 'Tag' : 'Release'}`} icon={<FaExclamationTriangle size={16} />} iconClass="danger" confirmText={isDeleting ? 'Deleting...' : `Delete ${pendingDelete.tagName}`} confirmClass="danger" isLoading={isDeleting}>
      <div className="delete-modal-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="delete-target" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 'var(--radius-sm)' }}>
          <FaTag className="delete-target-icon" style={{ color: '#ff6b6b', fontSize: '16px' }} />
          <span className="delete-target-name" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: '"Monaco", "Consolas", monospace' }}>{pendingDelete.tagName}</span>
        </div>
        <div className="delete-warning" style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {isTagOnly ? <p>This will <strong style={{ color: '#ff6b6b' }}>permanently delete</strong> the Git tag from both remote and local repositories.</p> : <p>This will <strong style={{ color: '#ff6b6b' }}>permanently delete</strong> the GitHub release and the Git tag from both remote and local repositories.</p>}
        </div>
        <div className="delete-note" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(255,165,2,0.1)', border: '1px solid rgba(255,165,2,0.2)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: '#ffa502' }}>
          <FaExclamationTriangle size={12} /><span>This action cannot be undone!</span>
        </div>
      </div>
    </Modal>
  );
}

export function ReleaseModal({ isOpen, onClose, onConfirm, version, title, notes, projectName, isReleasing }) {
  const [activeTab, setActiveTab] = useState('overview');
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} onConfirm={onConfirm} title="Confirm Release" icon={<FaRocket size={16} />} iconClass="release" confirmText={isReleasing ? 'Releasing...' : 'Confirm & Release'} confirmClass="primary" isLoading={isReleasing}>
      <div className="release-modal-content" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div className="release-version-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(168,85,247,0.1))', border: '1px solid rgba(108,99,255,0.3)', borderRadius: '20px', fontSize: '12px', fontWeight: 600, color: 'var(--accent)', width: 'fit-content' }}>
          <FaTag size={10} /><span>{version || 'No version'}</span>
        </div>

        {/* Info Grid - Δίπλα-δίπλα με word break */}
        <div className="release-info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', minWidth: 0 }}>
          <div className="release-info-item" style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', minWidth: 0, overflow: 'hidden' }}>
            <div className="release-info-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}><FaFileAlt size={10} /><span>Title</span></div>
            <div className="release-info-value" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', wordBreak: 'break-word', hyphens: 'auto', whiteSpace: 'normal', overflow: 'visible' }}>{title || 'Untitled'}</div>
          </div>
          <div className="release-info-item" style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', minWidth: 0, overflow: 'hidden' }}>
            <div className="release-info-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}><FaFolder size={10} /><span>Project</span></div>
            <div className="release-info-value" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', wordBreak: 'break-word', hyphens: 'auto', whiteSpace: 'normal', overflow: 'visible' }}>{projectName || 'Unknown'}</div>
          </div>
        </div>

        {/* Notes Tabs */}
        <div className="release-notes-section" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div className="release-notes-tabs" style={{ display: 'flex', gap: '4px' }}>
            <button className={`release-notes-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', color: activeTab === 'overview' ? 'var(--accent)' : 'var(--text-secondary)', cursor: 'pointer', transition: 'var(--transition)' }}>Overview</button>
            <button className={`release-notes-tab ${activeTab === 'preview' ? 'active' : ''}`} onClick={() => setActiveTab('preview')} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', color: activeTab === 'preview' ? 'var(--accent)' : 'var(--text-secondary)', cursor: 'pointer', transition: 'var(--transition)' }}>Preview</button>
          </div>
          <div className="release-notes-content" style={{ maxHeight: '120px', overflowY: 'auto', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
            {activeTab === 'overview' ? (
              <pre className="release-notes-raw" style={{ fontFamily: '"Monaco", "Consolas", monospace', fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.5 }}>
                {notes?.trim() ? notes.split('\n').slice(0, 10).join('\n') : 'No release notes'}
                {notes && notes.split('\n').length > 10 ? '\n\n...(truncated)' : ''}
              </pre>
            ) : (
              <div className="release-notes-preview" style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                {notes ? <ReactMarkdown remarkPlugins={[remarkGfm, remarkAlerts]} rehypePlugins={[rehypeRaw]}>{notes.split('\n').slice(0, 10).join('\n')}</ReactMarkdown> : <p className="no-notes" style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No release notes provided</p>}
              </div>
            )}
          </div>
        </div>

        {/* Steps - Μεγαλύτερο scale */}
        <div className="release-steps" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '10px 0 0', borderTop: '1px solid var(--border)', marginTop: '8px' }}>
          <div className="release-step" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="release-step-number" style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, rgba(108,99,255,0.2), rgba(168,85,247,0.15))', border: '1px solid rgba(108,99,255,0.4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>1</div>
            <div className="release-step-text" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Build</div>
          </div>
          <div className="release-step-divider" style={{ width: '32px', height: '1px', background: 'linear-gradient(90deg, var(--border), rgba(108,99,255,0.3), var(--border))' }} />
          <div className="release-step" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="release-step-number" style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, rgba(108,99,255,0.2), rgba(168,85,247,0.15))', border: '1px solid rgba(108,99,255,0.4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>2</div>
            <div className="release-step-text" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Create</div>
          </div>
          <div className="release-step-divider" style={{ width: '32px', height: '1px', background: 'linear-gradient(90deg, var(--border), rgba(108,99,255,0.3), var(--border))' }} />
          <div className="release-step" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="release-step-number" style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, rgba(108,99,255,0.2), rgba(168,85,247,0.15))', border: '1px solid rgba(108,99,255,0.4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>3</div>
            <div className="release-step-text" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Upload</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default Modal;