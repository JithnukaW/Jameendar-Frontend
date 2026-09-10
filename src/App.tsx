import { useState, useEffect, useRef } from 'react';
import { apiClient } from './apiClient';

export const App = () => {
  const [activeTab, setActiveTab] = useState<'bhoomi' | 'regulatory' | 'admin' | 'analytics' | 'reports'>('bhoomi');

  // Bhoomi AI State
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Regulatory Updates State
  const [updates, setUpdates] = useState<any[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);

  // Admin Pending Drafts State
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const draftsLastFetched = useRef<number>(0); // timestamp ms — for 60s TTL cache

  // Analytics & Intelligence State
  const [prices, setPrices] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [traffic, setTraffic] = useState<any>(null);
  const [seoKeywords, setSeoKeywords] = useState<any[]>([]);
  const [locA, setLocA] = useState<string>('Kokapet');
  const [locB, setLocB] = useState<string>('Tellapur');
  const [compareData, setCompareData] = useState<any>(null);

  // Weekly Report State
  const [report, setReport] = useState<any>(null);


  // Fetch initial tab data with parallel Promise.all and caching
  useEffect(() => {
    if (activeTab === 'regulatory') {
      if (updates.length === 0) {
        setLoadingUpdates(true);
        apiClient.get('/regulatory/updates?limit=500')
          .then((res: any) => setUpdates(res))
          .catch((err) => console.error(err))
          .finally(() => setLoadingUpdates(false));
      }
    } else if (activeTab === 'admin') {
      // Re-fetch only if cache is empty or older than 60 seconds
      const cacheAge = Date.now() - draftsLastFetched.current;
      if (drafts.length === 0 || cacheAge > 60_000) {
        fetchDrafts();
      }
    } else if (activeTab === 'analytics') {
      if (prices.length === 0) {
        // Parallel concurrent fetching using Promise.all for 4x speedup
        Promise.all([
          apiClient.get('/analytics/locality-prices'),
          apiClient.get('/analytics/competitor-ads'),
          apiClient.get('/analytics/traffic/summary'),
          apiClient.get('/analytics/seo-rankings')
        ]).then(([pricesRes, adsRes, trafficRes, seoRes]: any[]) => {
          setPrices(pricesRes);
          setAds(adsRes);
          setTraffic(trafficRes);
          setSeoKeywords(seoRes);
        }).catch(err => console.error(err));
      }
    } else if (activeTab === 'reports') {
      if (!report) {
        apiClient.get('/reports/weekly/latest').then((res: any) => setReport(res)).catch(err => console.error(err));
      }
    }
  }, [activeTab]);

  // Fetch head-to-head comparison whenever locA or locB changes
  useEffect(() => {
    if (activeTab === 'analytics' && locA && locB) {
      apiClient.get(`/analytics/locality-compare?locality_a=${encodeURIComponent(locA)}&locality_b=${encodeURIComponent(locB)}`)
        .then((res: any) => setCompareData(res))
        .catch(err => console.error(err));
    }
  }, [activeTab, locA, locB]);

  const fetchDrafts = () => {
    setLoadingDrafts(true);
    apiClient.get('/drafts/pending')
      .then((res: any) => {
        setDrafts(res);
        draftsLastFetched.current = Date.now(); // update cache timestamp
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingDrafts(false));
  };

  const [editingDraftId, setEditingDraftId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  const handleSaveEditDraft = async (id: number) => {
    const draftId = Number(id);
    try {
      await apiClient.put(`/drafts/${draftId}`, { edited_content: editingText });
      // Update ONLY the edited draft in local state — no full re-fetch needed
      setDrafts(prev => prev.map(d =>
        d.id === draftId
          ? { ...d, draft_content: editingText, edited_content: editingText, was_edited: 1 }
          : d
      ));
      setEditingDraftId(null);
      alert(`Draft #${draftId} saved ✓`);
    } catch (err) {
      alert(`Failed to save draft #${draftId}`);
    }
  };

  const handleAskAI = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    try {
      const res = await apiClient.post('/knowledge/query', { query: aiQuery });
      setAiResponse(res);
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleApproveDraft = async (id: number) => {
    const draftId = Number(id);
    try {
      await apiClient.post(`/drafts/${draftId}/approve`);
      alert(`Draft #${draftId} approved successfully!`);
      fetchDrafts();
    } catch (err: any) {
      const msg = err?.detail || err?.message || 'Unknown error';
      alert(`Failed to approve draft #${draftId}: ${msg}`);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', color: '#0f172a' }}>
      {/* Header */}
      <header style={{ backgroundColor: '#1e293b', color: '#ffffff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🏰 Jameendar Intelligence Layer — Live Production Test Portal
          </h1>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
            Connected to Vercel Serverless (<code>https://jameendar-automation.vercel.app</code>) & Supabase Managed PostgreSQL
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#0f172a', padding: '6px 12px', borderRadius: '20px', border: '1px solid #334155' }}>
          <span style={{ height: '8px', width: '8px', backgroundColor: '#22c55e', borderRadius: '50%', display: 'inline-block' }}></span>
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#e2e8f0' }}>Live API Online</span>
        </div>
      </header>

      {/* Navigation Bar */}
      <nav style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '0 24px', display: 'flex', gap: '16px' }}>
        {[
          { id: 'bhoomi', label: '🤖 Bhoomi AI Assistant (Component A)' },
          { id: 'regulatory', label: '📜 Regulatory Feed' },
          { id: 'admin', label: '🛡️ Human Approval Queue' },
          { id: 'analytics', label: '📈 Analytics & Price Comparison' },
          { id: 'reports', label: '🧠 Executive Report (Component B)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '14px 16px',
              fontSize: '13px',
              fontWeight: activeTab === tab.id ? '700' : '500',
              color: activeTab === tab.id ? '#2563eb' : '#64748b',
              borderBottom: activeTab === tab.id ? '3px solid #2563eb' : '3px solid transparent',
              background: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderTop: 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Main Content Area */}
      <main style={{ maxWidth: '1200px', margin: '24px auto', padding: '0 24px' }}>

        {/* Tab 1: Bhoomi AI Assistant */}
        {activeTab === 'bhoomi' && (
          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>🤖 Bhoomi AI Assistant (Component A)</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
              Queries cataloged site inventory features with direct URL citations and zero hallucinations.
            </p>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <input
                placeholder="Ask about EMI Calculator, HMDA Plot Maps, HYDRAA Check, or title audits..."
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                style={{
                  flex: "1 1 0%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid rgb(203, 213, 225)",
                  fontSize: "14px",
                  background: "white",
                  color: "#0f172a",
                  fontWeight: "600",
                }}
              />
              <button
                onClick={handleAskAI}
                disabled={aiLoading}
                style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '14px' }}
              >
                {aiLoading ? 'Analyzing DB...' : 'Ask Bhoomi AI'}
              </button>
            </div>

            {aiResponse && (
              <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', padding: '16px', borderRadius: '8px' }}>
                <h4 style={{ fontWeight: '700', fontSize: '14px', color: '#0369a1', marginBottom: '4px' }}>Answer:</h4>
                <p style={{ fontSize: '14px', color: '#0c4a6e', lineHeight: '1.6' }}>{aiResponse.answer}</p>
                {aiResponse.cited_url && (
                  <div style={{ marginTop: '12px' }}>
                    <a
                      href={aiResponse.cited_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#0284c7', fontWeight: '600', fontSize: '13px', textDecoration: 'underline' }}
                    >
                      🔗 Open Verified Feature Tool: {aiResponse.feature_name}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Regulatory Updates Feed */}
        {activeTab === 'regulatory' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700' }}>📜 Regulatory Updates Feed</h2>
                <p style={{ fontSize: '13px', color: '#64748b' }}>Monitored across TG-RERA, HMDA, HYDRAA, DTCP, Dharani, CCLA, & HMDA Lakes</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ backgroundColor: '#dcfce7', color: '#15803d', fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '16px' }}>
                  ✓ Approved ({updates.filter(u => u.status === 'approved' || u.status === 'verified').length})
                </span>
                <span style={{ backgroundColor: '#fef3c7', color: '#b45309', fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '16px' }}>
                  ⏳ Pending ({updates.filter(u => u.status === 'pending' || u.status === 'detected' || u.status === 'needs_review').length})
                </span>
              </div>
            </div>

            {loadingUpdates ? (
              <p style={{ fontSize: '14px', color: '#64748b' }}>Loading regulatory updates from database...</p>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {updates.map((item) => {
                  const isApproved = item.status === 'approved' || item.status === 'verified';
                  return (
                    <div key={item.id} style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ backgroundColor: '#fef3c7', color: '#92400e', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>
                            {item.source_authority}
                          </span>
                          <span style={{
                            backgroundColor: isApproved ? '#dcfce7' : '#fef3c7',
                            color: isApproved ? '#166534' : '#92400e',
                            border: isApproved ? '1px solid #bbf7d0' : '1px solid #fde68a',
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '2px 8px',
                            borderRadius: '12px'
                          }}>
                            {isApproved ? '✓ APPROVED' : '⏳ PENDING REVIEW'}
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{item.effective_date}</span>
                      </div>
                      <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>{item.title}</h3>
                      <p style={{ fontSize: '13px', color: '#475569', margin: '8px 0' }}>{item.plain_language_explanation}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748b', paddingTop: '8px', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '8px' }}>
                        <span>Affects: {item.who_it_affects}</span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {item.source_document_link && (
                            <a 
                              href={item.source_document_link} 
                              target="_blank" 
                              rel="noreferrer" 
                              style={{ 
                                backgroundColor: item.is_cdn_hosted ? '#10b981' : '#2563eb', 
                                color: '#ffffff', 
                                padding: '4px 10px', 
                                borderRadius: '6px', 
                                fontWeight: '600', 
                                textDecoration: 'none', 
                                fontSize: '11px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              {item.is_cdn_hosted ? '📄 Verified PDF Guide ↗' : '🏛️ Official Source ↗'}
                            </a>
                          )}
                          {item.fallback_portal_url && item.is_cdn_hosted && (
                            <a 
                              href={item.fallback_portal_url} 
                              target="_blank" 
                              rel="noreferrer" 
                              style={{ color: '#64748b', fontWeight: '500', textDecoration: 'none', fontSize: '11px' }}
                            >
                              🏛️ Authority Portal ↗
                            </a>
                          )}
                          {item.attached_documents && (() => {
                            try {
                              const docs = typeof item.attached_documents === 'string' ? JSON.parse(item.attached_documents) : item.attached_documents;
                              const docEntries = Object.entries(docs || {});
                              if (docEntries.length === 0) return null;
                              return (
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                  {docEntries.map(([docName, docData]: [string, any], idx) => {
                                    const cdnUrl = docData?.supabase_storage_url || docData?.original_url;
                                    if (!cdnUrl) return null;
                                    return (
                                      <a
                                        key={idx}
                                        href={cdnUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        title={docName}
                                        style={{
                                          backgroundColor: '#2563eb',
                                          color: '#ffffff',
                                          padding: '3px 8px',
                                          borderRadius: '4px',
                                          fontWeight: '600',
                                          textDecoration: 'none',
                                          fontSize: '11px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}
                                      >
                                        📄 {docName.length > 22 ? docName.substring(0, 20) + '...' : docName} ↗
                                      </a>
                                    );
                                  })}
                                </div>
                              );
                            } catch (e) {
                              return null;
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Admin Approval Queue */}
        {activeTab === 'admin' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700' }}>🛡️ Human Guardrail Admin Queue</h2>
                <p style={{ fontSize: '13px', color: '#64748b' }}>Approve AI-generated multi-platform draft content for single-tap publishing.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={fetchDrafts}
                  disabled={loadingDrafts}
                  style={{ backgroundColor: '#e2e8f0', color: '#334155', padding: '6px 12px', borderRadius: '6px', border: 'none', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}
                >
                  {loadingDrafts ? '⏳ Refreshing...' : '🔄 Refresh'}
                </button>
                <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', fontWeight: '700', fontSize: '13px', padding: '4px 12px', borderRadius: '16px' }}>
                  {drafts.length} Drafts Pending
                </span>
              </div>
            </div>

            {loadingDrafts ? (
              <p>Fetching pending drafts...</p>
            ) : drafts.length === 0 ? (
              <div style={{ backgroundColor: '#ffffff', padding: '32px', textAlign: 'center', borderRadius: '8px' }}>
                <p style={{ color: '#64748b' }}>🎉 All drafts have been reviewed and approved!</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {drafts.map((draft) => (
                  <div key={draft.id} style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ backgroundColor: '#e2e8f0', color: '#334155', fontSize: '11px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                          {draft.platform}
                        </span>
                        {draft.was_edited === 1 && (
                          <span style={{ backgroundColor: '#fffbeb', color: '#b45309', fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fde68a' }}>
                            ✏️ EDITED BEFORE APPROVAL
                          </span>
                        )}
                      </div>

                      {editingDraftId === draft.id ? (
                        <div style={{ marginTop: '8px' }}>
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            rows={6}
                            style={{
                              width: '100%',
                              padding: '12px',
                              borderRadius: '8px',
                              border: '2px solid #2563eb',
                              fontSize: '13px',
                              fontFamily: 'inherit',
                              color: '#0f172a',
                              backgroundColor: '#ffffff',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                              lineHeight: '1.6'
                            }}
                          />
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <button
                              onClick={() => handleSaveEditDraft(draft.id)}
                              style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '6px 14px', borderRadius: '6px', border: 'none', fontWeight: '600', fontSize: '12px' }}
                            >
                              💾 Save Edits
                            </button>
                            <button
                              onClick={() => setEditingDraftId(null)}
                              style={{ backgroundColor: '#64748b', color: '#ffffff', padding: '6px 14px', borderRadius: '6px', border: 'none', fontWeight: '600', fontSize: '12px' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p style={{ fontSize: '13px', color: '#1e293b', marginTop: '8px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                          {draft.draft_content}
                        </p>
                      )}

                      {/* Detect and render clickable button for any embedded URLs */}
                      {(() => {
                        const urlMatch = draft.draft_content?.match(/(https?:\/\/[^\s\]\)]+)/g);
                        if (!urlMatch || urlMatch.length === 0) return null;
                        return (
                          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {urlMatch.map((link: string, idx: number) => {
                              const isUgc = link.includes('ugc_guide') || link.includes('ugc_guides');
                              return (
                                <a
                                  key={idx}
                                  href={link}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    backgroundColor: isUgc ? '#2563eb' : '#0284c7',
                                    color: '#ffffff',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    fontWeight: '700',
                                    fontSize: '12px',
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                  }}
                                >
                                  {isUgc ? '🏰 Open Jameendar Buyer Guide ↗' : '📄 Open Document Link ↗'}
                                </a>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {editingDraftId !== draft.id && (
                        <button
                          onClick={() => {
                            setEditingDraftId(draft.id);
                            setEditingText(draft.draft_content);
                          }}
                          style={{ backgroundColor: '#f1f5f9', color: '#334155', padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '600', fontSize: '12px' }}
                        >
                          ✏️ Edit Draft
                        </button>
                      )}
                      <button
                        onClick={() => handleApproveDraft(draft.id)}
                        style={{ backgroundColor: '#16a34a', color: '#ffffff', padding: '8px 16px', borderRadius: '6px', border: 'none', fontWeight: '600', fontSize: '12px' }}
                      >
                        Approve & Publish
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


        {/* Tab 4: Analytics & Locality */}
        {activeTab === 'analytics' && (
          <div style={{ display: 'grid', gap: '24px' }}>
            {/* 1. GA4 Web Traffic & Conversion Metrics */}
            <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>📈 GA4 Website Traffic & Lead Conversions (Last 30 Days)</h3>
                <span style={{ fontSize: '12px', backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: '700', padding: '4px 10px', borderRadius: '12px' }}>
                  Google Analytics 4 API Connected
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Total Monthly Sessions</p>
                  <p style={{ fontSize: '24px', fontWeight: '800', color: '#2563eb', margin: '4px 0' }}>{traffic?.sessions !== undefined ? traffic.sessions.toLocaleString() : 'Loading...'}</p>
                  <p style={{ fontSize: '11px', color: '#16a34a', fontWeight: '700' }}>↑ Live GA4 Traffic</p>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Active Users</p>
                  <p style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '4px 0' }}>{traffic?.users !== undefined ? traffic.users.toLocaleString() : 'Loading...'}</p>
                  <p style={{ fontSize: '11px', color: '#64748b' }}>{traffic?.new_users !== undefined ? traffic.new_users.toLocaleString() : 0} New Visitors</p>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Organic Search Traffic</p>
                  <p style={{ fontSize: '24px', fontWeight: '800', color: '#16a34a', margin: '4px 0' }}>{traffic?.source_organic !== undefined ? traffic.source_organic.toLocaleString() : 'Loading...'}</p>
                  <p style={{ fontSize: '11px', color: '#16a34a', fontWeight: '700' }}>Google Organic Channel</p>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Verified Lead Conversions</p>
                  <p style={{ fontSize: '24px', fontWeight: '800', color: '#7c3aed', margin: '4px 0' }}>{traffic?.conversion_leads !== undefined ? traffic.conversion_leads.toLocaleString() : 'Loading...'}</p>
                  <p style={{ fontSize: '11px', color: '#7c3aed', fontWeight: '700' }}>{traffic?.conversion_phone_verifications !== undefined ? traffic.conversion_phone_verifications : 0} Phone Verifications</p>
                </div>
              </div>
            </div>

            {/* 2. Interactive Head-to-Head Locality Price Comparator */}
            <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: '#0f172a' }}>⚔️ Head-to-Head Micro-Market Price Comparator</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Compare registered land values, appreciation velocity, and transaction volume across Hyderabad localities.</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Locality A:</label>
                  <select
                    value={locA}
                    onChange={(e) => setLocA(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '600' }}
                  >
                    {prices.map(p => <option key={p.id} value={p.locality}>{p.locality}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Locality B:</label>
                  <select
                    value={locB}
                    onChange={(e) => setLocB(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '600' }}
                  >
                    {prices.map(p => <option key={p.id} value={p.locality}>{p.locality}</option>)}
                  </select>
                </div>
              </div>

              {compareData && (
                <div style={{ backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                    <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{compareData.locality_a?.locality}</h4>
                      <p style={{ fontSize: '20px', fontWeight: '800', color: '#16a34a', margin: '4px 0' }}>{compareData.locality_a?.avg_price_sqft}</p>
                      <p style={{ fontSize: '12px', color: '#475569' }}>30d Change: <strong>{compareData.locality_a?.price_change_pct}</strong> ({compareData.locality_a?.trend_direction})</p>
                      <p style={{ fontSize: '12px', color: '#475569' }}>Registrations: <strong>{compareData.locality_a?.total_registrations}</strong> transactions</p>
                    </div>
                    <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{compareData.locality_b?.locality}</h4>
                      <p style={{ fontSize: '20px', fontWeight: '800', color: '#16a34a', margin: '4px 0' }}>{compareData.locality_b?.avg_price_sqft}</p>
                      <p style={{ fontSize: '12px', color: '#475569' }}>30d Change: <strong>{compareData.locality_b?.price_change_pct}</strong> ({compareData.locality_b?.trend_direction})</p>
                      <p style={{ fontSize: '12px', color: '#475569' }}>Registrations: <strong>{compareData.locality_b?.total_registrations}</strong> transactions</p>
                    </div>
                  </div>
                  <p style={{ fontSize: '12px', color: '#15803d', fontWeight: '600' }}>💡 {compareData.investment_insight}</p>
                </div>
              )}
            </div>

            {/* 3. 30-Day Registered Locality Prices (Hyderabad Overview) */}
            <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>📊 Registered Micro-Market Price Overview (Hyderabad)</h3>
                <span style={{ fontSize: '11px', backgroundColor: prices.some(p => p.total_registrations > 0) ? '#dcfce7' : '#fef3c7', color: prices.some(p => p.total_registrations > 0) ? '#16a34a' : '#92400e', fontWeight: '700', padding: '4px 10px', borderRadius: '12px' }}>
                  {prices.some(p => p.total_registrations > 0) ? 'Live SRO Verified Feed' : 'Awaiting SRO Live Feed'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                {prices.map((p) => (
                  <div key={p.id} style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                    <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>{p.locality}</p>
                    <p style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '4px 0' }}>{p.avg_price_sqft}</p>
                    <span style={{ fontSize: '11px', color: p.total_registrations > 0 ? '#16a34a' : '#64748b', fontWeight: '700', backgroundColor: p.total_registrations > 0 ? '#dcfce7' : '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                      {p.total_registrations > 0 ? `${p.price_change_pct} (${p.trend_direction})` : 'Awaiting Live Feed'}
                    </span>
                    <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>{p.total_registrations} transactions</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. SEO Keyword Rankings (Google Search Console) */}
            <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>🔍 Top SEO Keyword Rankings (Jameendar Organic Rankings)</h3>
                <span style={{ fontSize: '11px', backgroundColor: '#fee2e2', color: '#991b1b', fontWeight: '700', padding: '4px 10px', borderRadius: '12px' }}>
                  Awaiting Search Console API
                </span>
              </div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {seoKeywords.map((item) => (
                  <div key={item.id} style={{ backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b' }}>{item.keyword}</span>
                      <span style={{ marginLeft: '10px', fontSize: '11px', color: '#64748b' }}>({item.domain})</span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <span style={{ backgroundColor: item.position > 0 ? '#dbeafe' : '#f1f5f9', color: item.position > 0 ? '#1e40af' : '#64748b', fontWeight: '800', fontSize: '12px', padding: '2px 8px', borderRadius: '4px' }}>
                        {item.position > 0 ? `Rank #${item.position}` : 'Unlinked API'}
                      </span>
                      <span style={{ fontSize: '12px', color: '#475569' }}>👁️ {item.impressions.toLocaleString()} impressions</span>
                      <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600' }}>🖱️ {item.clicks.toLocaleString()} clicks</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Competitor PPC Ad Spying & Meta Ad Library */}
            <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>🎯 Competitor PPC Ad & Meta Ad Library Monitoring</h3>
                <span style={{ fontSize: '11px', backgroundColor: '#f3e8ff', color: '#6b21a8', fontWeight: '700', padding: '4px 10px', borderRadius: '12px' }}>
                  Awaiting Meta Ad Library API
                </span>
              </div>
              {ads.length === 0 ? (
                <div style={{ backgroundColor: '#f8fafc', padding: '20px', textAlign: 'center', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                  <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>ℹ️ 0 Active Competitor Ad Campaigns (Awaiting Meta Ad Library & Google PPC API Key Integration)</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {ads.map((ad) => (
                    <div key={ad.id} style={{ backgroundColor: '#fff7ed', padding: '14px', borderRadius: '8px', border: '1px solid #ffedd5' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <p style={{ fontSize: '12px', fontWeight: '800', color: '#c2410c', textTransform: 'uppercase' }}>{ad.competitor_name} ({ad.platform})</p>
                        <span style={{ fontSize: '11px', color: '#9a3412', backgroundColor: '#ffedd5', padding: '2px 6px', borderRadius: '4px' }}>Keywords: {ad.target_keywords}</span>
                      </div>
                      <p style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{ad.ad_headline}</p>
                      <p style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>{ad.ad_body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Executive Weekly Report */}
        {activeTab === 'reports' && (
          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>🧠 Monday Executive Briefing (Component B Master Brain)</h2>
                <p style={{ fontSize: '13px', color: '#64748b' }}>Synthesizes signals across all 6 MCP servers into ranked strategic recommendations.</p>
              </div>
              <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', fontWeight: '700', fontSize: '12px', padding: '4px 12px', borderRadius: '16px' }}>
                Delivered Weekly (Scheduled Monday)
              </span>
            </div>

            {report ? (
              <div>
                {/* Clean Analytics Document Formatting */}
                <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
                  {report.summary_markdown.split('\n\n').map((block: string, i: number) => {
                    if (block.startsWith('#')) {
                      return (
                        <h3 key={i} style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '6px', marginTop: '8px' }}>
                          {block.replace(/^[#\s]+/, '').replace(/\*\*/g, '')}
                        </h3>
                      );
                    } else if (block.includes('\n- ') || block.startsWith('- ')) {
                      const lines = block.split('\n').filter(l => l.trim().length > 0);
                      return (
                        <div key={i} style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          {lines.map((line, j) => {
                            const cleanLine = line.replace(/^[-\d\.\s]+/, '');
                            const parts = cleanLine.split('**:');
                            const label = parts.length > 1 ? parts[0].replace(/\*\*/g, '') : null;
                            const text = parts.length > 1 ? parts.slice(1).join('**:') : cleanLine.replace(/\*\*/g, '');

                            return (
                              <div key={j} style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '13px', color: '#334155' }}>
                                <span style={{ color: '#2563eb', fontWeight: '700' }}>•</span>
                                <div>
                                  {label && <strong style={{ color: '#0f172a' }}>{label}: </strong>}
                                  <span>{text}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    } else {
                      return (
                        <p key={i} style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
                          {block.replace(/\*\*/g, '')}
                        </p>
                      );
                    }
                  })}
                </div>

                <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px', color: '#0f172a' }}>📌 Ranked Strategic Recommendations (Opinionated & Data-Backed):</h3>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {Array.isArray(report.recommendations) && report.recommendations.map((rec: any, idx: number) => {
                    const isObj = typeof rec === 'object' && rec !== null;
                    return (
                      <div key={idx} style={{ backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ backgroundColor: '#16a34a', color: '#ffffff', fontWeight: '800', fontSize: '12px', padding: '2px 8px', borderRadius: '4px' }}>
                            RANK #{isObj ? rec.rank : idx + 1}
                          </span>
                          {isObj && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <span style={{ fontSize: '11px', backgroundColor: '#dcfce7', color: '#15803d', fontWeight: '700', padding: '2px 6px', borderRadius: '4px' }}>
                                Impact: {rec.impact}
                              </span>
                              <span style={{ fontSize: '11px', backgroundColor: '#e2e8f0', color: '#334155', fontWeight: '700', padding: '2px 6px', borderRadius: '4px' }}>
                                Effort: {rec.effort}
                              </span>
                            </div>
                          )}
                        </div>
                        <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
                          {isObj ? rec.title : rec}
                        </h4>
                        {isObj && (
                          <div style={{ display: 'grid', gap: '6px', fontSize: '12px', color: '#334155' }}>
                            <p><strong>🎯 What to do:</strong> {rec.what}</p>
                            <p><strong>📊 Why (Data Evidence):</strong> {rec.why}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p>Loading latest executive report...</p>
            )}
          </div>
        )}

      </main>
    </div>
  );
};

export default App;
