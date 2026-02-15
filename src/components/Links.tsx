import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Fuse from 'fuse.js';
import { type Link, loadLinks, saveLinks } from '../api';
import './Links.css';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function detectType(url: string): 'web' | 'folder' {
  if (/^https?:\/\//i.test(url)) return 'web';
  return 'folder';
}

export default function Links() {
  const [links, setLinks] = useState<Link[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formTags, setFormTags] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadLinks().then(setLinks);
  }, []);

  useEffect(() => {
    const handleNew = () => setShowForm(true);
    const handleEscape = () => resetForm();
    window.addEventListener('dash:new-item', handleNew);
    window.addEventListener('dash:escape', handleEscape);
    return () => {
      window.removeEventListener('dash:new-item', handleNew);
      window.removeEventListener('dash:escape', handleEscape);
    };
  });

  const persist = useCallback((updated: Link[]) => {
    setLinks(updated);
    saveLinks(updated);
  }, []);

  const fuse = useMemo(
    () =>
      new Fuse(links, {
        keys: [
          { name: 'title', weight: 0.4 },
          { name: 'tags', weight: 0.4 },
          { name: 'url', weight: 0.2 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [links]
  );

  const filtered = searchQuery.trim()
    ? fuse.search(searchQuery).map((r) => r.item)
    : links;

  function resetForm() {
    setFormTitle('');
    setFormUrl('');
    setFormTags('');
    setShowForm(false);
    setEditingId(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = formUrl.trim();
    if (!url) return;

    const linkData = {
      title: formTitle.trim() || url,
      url,
      tags: formTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      type: detectType(url),
    };

    if (editingId) {
      persist(
        links.map((l) =>
          l.id === editingId ? { ...l, ...linkData } : l
        )
      );
    } else {
      persist([
        {
          id: generateId(),
          ...linkData,
          clickCount: 0,
          createdAt: new Date().toISOString(),
        },
        ...links,
      ]);
    }
    resetForm();
  }

  function startEdit(link: Link) {
    setEditingId(link.id);
    setFormTitle(link.title);
    setFormUrl(link.url);
    setFormTags(link.tags.join(', '));
    setShowForm(true);
  }

  function deleteLink(id: string) {
    persist(links.filter((l) => l.id !== id));
    if (editingId === id) resetForm();
  }

  function incrementClick(id: string) {
    persist(
      links.map((l) =>
        l.id === id ? { ...l, clickCount: (l.clickCount || 0) + 1 } : l
      )
    );
  }

  function resetClicks(id: string) {
    persist(
      links.map((l) => (l.id === id ? { ...l, clickCount: 0 } : l))
    );
  }

  async function openFolder(folderPath: string, id: string) {
    incrementClick(id);
    await fetch('/api/open-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderPath }),
    });
  }

  function copyToClipboard(text: string, id: string) {
    incrementClick(id);
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div className="links">
      <div className="links-toolbar">
        <input
          className="links-search"
          type="text"
          placeholder="Search links by title, tag, or URL..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
        />
        <button
          className="btn btn-start"
          onClick={() => {
            if (showForm) resetForm();
            else setShowForm(true);
          }}
        >
          {showForm ? 'Cancel' : 'Add Link'}
        </button>
      </div>

      {showForm && (
        <form className="links-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Title (optional)"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
          />
          <input
            type="text"
            placeholder="URL or folder path"
            value={formUrl}
            onChange={(e) => setFormUrl(e.target.value)}
            autoFocus
          />
          <input
            type="text"
            placeholder="Tags (comma separated)"
            value={formTags}
            onChange={(e) => setFormTags(e.target.value)}
          />
          <button type="submit" className="btn btn-start">
            {editingId ? 'Update' : 'Save'}
          </button>
        </form>
      )}

      <div className="links-list">
        <AnimatePresence mode="popLayout">
          {filtered.map((link) => (
            <motion.div
              key={link.id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="link-card"
            >
              <div className="link-card-main">
                <span className="link-type-icon" title={link.type === 'web' ? 'Web URL' : 'Folder path'}>
                  {link.type === 'web' ? '\uD83C\uDF10' : '\uD83D\uDCC1'}
                </span>
                <div className="link-info">
                  <div className="link-title">
                    {link.title}
                    {(link.clickCount || 0) > 0 && (
                      <span
                        className="link-click-count"
                        title={`${link.clickCount} clicks — click to reset`}
                        onClick={() => resetClicks(link.id)}
                      >
                        {link.clickCount}
                      </span>
                    )}
                  </div>
                  <div className="link-url">{link.url}</div>
                  {link.tags.length > 0 && (
                    <div className="link-tags">
                      {link.tags.map((tag) => (
                        <span key={tag} className="link-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="link-actions">
                  {link.type === 'web' ? (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-action-btn"
                      title="Open in browser"
                      onClick={() => incrementClick(link.id)}
                    >
                      Open
                    </a>
                  ) : (
                    <button
                      className="link-action-btn"
                      onClick={() => openFolder(link.url, link.id)}
                      title="Open in file manager"
                    >
                      Open
                    </button>
                  )}
                  <button
                    className="link-action-btn"
                    onClick={() => copyToClipboard(link.url, link.id)}
                    title="Copy URL / path"
                  >
                    {copiedId === link.id ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    className="link-action-btn"
                    onClick={() => startEdit(link)}
                    title="Edit"
                  >
                    Edit
                  </button>
                  <button
                    className="link-action-btn link-action-del"
                    onClick={() => deleteLink(link.id)}
                    title="Delete"
                  >
                    Del
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="links-empty">
            {searchQuery ? 'No links match your search' : 'No links yet — add one above'}
          </div>
        )}
      </div>
    </div>
  );
}
