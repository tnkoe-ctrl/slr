import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

const FILE_TYPES = [
  'all',
  'sm',
  'lor',
  'html',
  'target_test',
  'zero_kb'
]

const STATUSES = [
  'all',
  'pending',
  'processing',
  'completed',
  'failed',
  'zero_kb'
]

function typeLabel(type) {
  const labels = {
    sm: '.SM',
    lor: '.LOR',
    html: 'HTML',
    target_test: 'TARGET TEST',
    zero_kb: '0 KB'
  }

  return labels[type] || type || '-'
}

function statusLabel(status) {
  return String(status || '-').replaceAll('_', ' ').toUpperCase()
}

function formatBytes(bytes) {
  const value = Number(bytes || 0)

  if (value === 0) return '0 B'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`

  return `${(value / (1024 * 1024)).toFixed(2)} MB`
}

function formatDate(value) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString()
}

function statusStyle(status) {
  if (status === 'completed') {
    return {
      background: '#dcfce7',
      color: '#166534'
    }
  }

  if (status === 'failed') {
    return {
      background: '#fee2e2',
      color: '#991b1b'
    }
  }

  if (status === 'processing') {
    return {
      background: '#fef3c7',
      color: '#92400e'
    }
  }

  if (status === 'zero_kb') {
    return {
      background: '#e5e7eb',
      color: '#374151'
    }
  }

  return {
    background: '#dbeafe',
    color: '#1e40af'
  }
}

export default function SlrFilesPanel() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [downloading, setDownloading] = useState('')
  const [sftpPassword, setSftpPassword] = useState('')
  const [sftpActive, setSftpActive] = useState(false)
  const [sftpRemaining, setSftpRemaining] = useState(0)
  const [sftpMessage, setSftpMessage] = useState('')
  const [sftpBusy, setSftpBusy] = useState(false)
  const [filesPanelExpanded, setFilesPanelExpanded] = useState(true)

  const [lorBusy, setLorBusy] = useState(false)
  const [lorMessage, setLorMessage] = useState('')
  const [lorFiles, setLorFiles] = useState([])

  const [historyDate, setHistoryDate] = useState('2026-10-09')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [historyData, setHistoryData] = useState(null)

  const refreshLorStatus = useCallback(async () => {
    try {
      const response = await fetch('http://127.0.0.1:8766/status')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Service unavailable')
      setLorFiles(data.output_files || [])
      setLorMessage(data.combiner_exists
        ? 'Local LOR service is ready.'
        : 'Combiner script not found.')
    } catch (err) {
      setLorMessage(err?.message || 'Start the local LOR service first.')
    }
  }, [])

  const runLorCombiner = useCallback(async () => {
    if (!window.confirm('Run the local LOR combiner? Existing XFF files are protected.')) return
    setLorBusy(true)
    setLorMessage('Running combiner...')
    try {
      const response = await fetch('http://127.0.0.1:8766/combine', {
        method: 'POST'
      })
      const data = await response.json()
      if (!response.ok || !data.ok) {
        throw new Error(data.stderr || data.error || 'Combiner failed.')
      }
      setLorMessage([data.stdout, data.stderr].filter(Boolean).join('\n') || 'Combiner finished.')
      await refreshLorStatus()
    } catch (err) {
      setLorMessage((err?.message || 'Combiner failed.') +
        ' Check that the local LOR service is running.')
    } finally {
      setLorBusy(false)
    }
  }, [refreshLorStatus])


  async function loadHistory() {
    setHistoryLoading(true)
    setHistoryError('')

    try {
      const response = await fetch(
        `http://127.0.0.1:8766/history?date=${encodeURIComponent(historyDate)}`,
        { cache: 'no-store' }
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Unable to load file history.')
      }

      setHistoryData(data)
    } catch (err) {
      setHistoryData(null)
      setHistoryError(
        err?.message || 'Unable to load file history. Check the local LOR service.'
      )
    } finally {
      setHistoryLoading(false)
    }
  }

  const loadFiles = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const { data, error: queryError } = await supabase
        .from('slr_files')
        .select(`
          id,
          filename,
          file_type,
          file_size_bytes,
          source_folder,
          processing_status,
          observation_date,
          doy,
          satellite_id,
          satellite_name,
          lor_filename,
          html_filename,
          error_message,
          processed_at,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false })

      if (queryError) {
        throw queryError
      }

      setFiles(data || [])
    } catch (err) {
      console.error('SLR FILE DASHBOARD ERROR:', err)
      setError(err?.message || 'Unable to load SLR files.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  const SFTP_CONTROLLER =
    'http://127.0.0.1:8765'

  const refreshSftpStatus = useCallback(async () => {
    try {
      const response = await fetch(
        `${SFTP_CONTROLLER}/status`,
        {
          cache: 'no-store'
        }
      )

      if (!response.ok) {
        throw new Error('SFTP controller unavailable.')
      }

      const data = await response.json()

      setSftpActive(Boolean(data.active))
      setSftpRemaining(
        Number(data.remaining_seconds || 0)
      )
    } catch {
      setSftpActive(false)
      setSftpRemaining(0)
    }
  }, [])

  useEffect(() => {
    refreshSftpStatus()

    const timer = window.setInterval(
      refreshSftpStatus,
      10000
    )

    return () => window.clearInterval(timer)
  }, [refreshSftpStatus])

  function formatRemaining(seconds) {
    const total = Math.max(
      0,
      Number(seconds || 0)
    )

    const hours = Math.floor(
      total / 3600
    )

    const minutes = Math.floor(
      (total % 3600) / 60
    )

    return `${hours}h ${minutes}m`
  }

  async function startSftpCollection() {
    if (!sftpPassword) {
      setSftpMessage(
        'Enter the SFTP password.'
      )
      return
    }

    setSftpBusy(true)
    setSftpMessage('')

    try {
      const response = await fetch(
        `${SFTP_CONTROLLER}/start`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          cache: 'no-store',
          body: JSON.stringify({
            password: sftpPassword
          })
        }
      )

      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message ||
          'Unable to start SFTP collection.'
        )
      }

      setSftpMessage(
        'SFTP collection started for 24 hours.'
      )

      setSftpPassword('')

      await refreshSftpStatus()
    } catch (err) {
      setSftpMessage(
        err?.message ||
        'Unable to start SFTP collection.'
      )

      setSftpPassword('')
      await refreshSftpStatus()
    } finally {
      setSftpBusy(false)
    }
  }

  async function stopSftpCollection() {
    setSftpBusy(true)
    setSftpMessage('')

    try {
      const response = await fetch(
        `${SFTP_CONTROLLER}/stop`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          cache: 'no-store'
        }
      )

      const data = await response.json().catch(() => ({}))

      if (!response.ok || data.ok !== true) {
        throw new Error(
          data.message ||
          `Unable to stop SFTP collection (HTTP ${response.status}).`
        )
      }

      setSftpMessage(
        data.message ||
        'SFTP collection stopped.'
      )

      setSftpPassword('')
      await refreshSftpStatus()
    } catch (err) {
      setSftpMessage(
        err?.message ||
        'Unable to stop SFTP collection.'
      )
    } finally {
      setSftpBusy(false)
    }
  }

  const filteredFiles = useMemo(() => {
    const query = search.trim().toLowerCase()

    return files.filter((file) => {
      const matchesType =
        typeFilter === 'all' || file.file_type === typeFilter

      const matchesStatus =
        statusFilter === 'all' || file.processing_status === statusFilter

      const searchable = [
        file.filename,
        file.file_type,
        file.processing_status,
        file.satellite_id,
        file.satellite_name,
        file.lor_filename,
        file.html_filename,
        file.error_message
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesSearch =
        !query || searchable.includes(query)

      return matchesType && matchesStatus && matchesSearch
    })
  }, [files, search, typeFilter, statusFilter])

  const counts = useMemo(() => {
    const result = {
      total: files.length,
      sm: 0,
      lor: 0,
      html: 0,
      target_test: 0,
      zero_kb: 0,
      completed: 0,
      processing: 0,
      pending: 0,
      failed: 0
    }

    files.forEach((file) => {
      if (result[file.file_type] !== undefined) {
        result[file.file_type] += 1
      }

      if (result[file.processing_status] !== undefined) {
        result[file.processing_status] += 1
      }
    })

    return result
  }, [files])

  async function downloadFile(file) {
    setDownloading(file.id)
    setError('')

    try {
      const paths = [
        `${file.file_type}/${file.filename}`,
        file.filename
      ]

      let lastError = null

      for (const path of paths) {
        const { data, error: signedError } =
          await supabase.storage
            .from('slr-files')
            .createSignedUrl(path, 300)

        if (!signedError && data?.signedUrl) {
          window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
          setDownloading('')
          return
        }

        lastError = signedError
      }

      throw lastError || new Error('File could not be found in storage.')
    } catch (err) {
      console.error('SLR FILE DOWNLOAD ERROR:', err)
      setError(err?.message || 'Unable to download the selected file.')
    } finally {
      setDownloading('')
    }
  }

  return (
    <section
      style={{
        marginTop: '24px',
        padding: '20px',
        borderRadius: '14px',
        background: '#ffffff',
        border: '1px solid #d1d5db',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '16px'
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>SLR Files</h2>
          <p style={{ margin: '5px 0 0', color: '#6b7280' }}>
            SLR processor files, LoR reports, HTML reports and Target Tests
          </p>
        </div>

        <button
          type="button"
          onClick={() => setFilesPanelExpanded((expanded) => !expanded)}
          aria-expanded={filesPanelExpanded}
          style={{
            padding: '9px 14px',
            borderRadius: '8px',
            border: '1px solid #9ca3af',
            background: '#fff',
            cursor: 'pointer'
          }}
        >
          {filesPanelExpanded ? 'Collapse Files ▲' : 'Expand Files ▼'}
        </button>

        <button
          type="button"
          onClick={runLorCombiner}
          disabled={lorBusy}
          style={{ padding: '9px 14px', borderRadius: '8px',
            border: '1px solid #2563eb', background: '#eff6ff',
            color: '#1d4ed8', cursor: lorBusy ? 'wait' : 'pointer' }}
        >
          {lorBusy ? 'Combining LOR...' : 'Run LOR Combiner'}
        </button>
        <button
          type="button"
          onClick={refreshLorStatus}
          style={{ padding: '9px 14px', borderRadius: '8px',
            border: '1px solid #9ca3af', background: '#fff',
            cursor: 'pointer' }}
        >
          Check LOR Service
        </button>

        <button
          type="button"
          onClick={loadFiles}
          disabled={loading}
          style={{
            padding: '9px 14px',
            borderRadius: '8px',
            border: '1px solid #9ca3af',
            background: '#fff',
            cursor: loading ? 'wait' : 'pointer'
          }}
        >
          {loading ? 'Refreshing...' : 'Refresh Files'}
        </button>
      </div>


      <div style={{ margin: '12px 0', padding: '12px',
        border: '1px solid #bfdbfe', borderRadius: '8px',
        background: '#eff6ff', color: '#1e3a8a',
        whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
        <strong>Local LOR Combiner</strong>
        <p>Generated XFF files stay on this computer; they are not automatically uploaded to the shared dashboard.</p>
        <div>{lorMessage || 'Select Check LOR Service to check availability.'}</div>
        {lorFiles.length > 0 && (
          <ul>
            {lorFiles.map(file => (
              <li key={file.name}>{file.name} ({file.size} bytes)</li>
            ))}
          </ul>
        )}
      </div>

      {filesPanelExpanded && (
        <div>
      <div
        style={{
          marginBottom: '18px',
          padding: '16px',
          borderRadius: '10px',
          background: '#f9fafb',
          border: '1px solid #d1d5db'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <div>
            <strong>
              SFTP Collection
            </strong>

            <div
              style={{
                marginTop: '5px',
                fontSize: '13px',
                color: '#6b7280'
              }}
            >
              Read-only collection from the SLR
              processor.
              The password is required only for
              this 24-hour session.
            </div>
          </div>

          <div
            style={{
              fontWeight: 700,
              color: sftpActive
                ? '#166534'
                : '#6b7280'
            }}
          >
            {sftpActive
              ? `ACTIVE — ${formatRemaining(
                  sftpRemaining
                )} remaining`
              : 'NOT ACTIVE'}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            marginTop: '12px'
          }}
        >
          <input
            type="password"
            value={sftpPassword}
            onChange={(event) =>
              setSftpPassword(
                event.target.value
              )
            }
            placeholder="Enter SFTP password"
            autoComplete="off"
            spellCheck="false"
            disabled={
              sftpBusy ||
              sftpActive
            }
            style={{
              flex: '1 1 260px',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #d1d5db'
            }}
          />

          <button
            type="button"
            onClick={startSftpCollection}
            disabled={
              sftpBusy ||
              sftpActive ||
              !sftpPassword
            }
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #166534',
              background: '#166534',
              color: '#fff',
              cursor:
                sftpBusy ||
                sftpActive
                  ? 'not-allowed'
                  : 'pointer'
            }}
          >
            {sftpBusy
              ? 'Working...'
              : 'Start SFTP'}
          </button>

          <button
            type="button"
            onClick={stopSftpCollection}
            disabled={
              sftpBusy ||
              !sftpActive
            }
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #991b1b',
              background: '#fff',
              color: '#991b1b',
              cursor:
                sftpBusy ||
                !sftpActive
                  ? 'not-allowed'
                  : 'pointer'
            }}
          >
            Stop SFTP
          </button>
        </div>

        {sftpMessage && (
          <div
            style={{
              marginTop: '10px',
              fontSize: '13px',
              color: '#374151'
            }}
          >
            {sftpMessage}
          </div>
        )}
      </div>

      <section
        style={{
          marginBottom: '18px',
          padding: '16px',
          borderRadius: '10px',
          border: '1px solid #d1d5db',
          background: '#f9fafb'
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '6px' }}>
          SLR File History
        </h3>
        <p style={{ marginTop: 0, color: '#6b7280', fontSize: '13px' }}>
          Select a date to review local .lor files saved that day and the
          recorded activity. This page does not change files or run the combiner.
        </p>

        <div style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: '14px'
        }}>
          <label>
            History date{' '}
            <input
              type="date"
              value={historyDate}
              onChange={(event) => setHistoryDate(event.target.value)}
              style={{
                padding: '9px',
                borderRadius: '8px',
                border: '1px solid #9ca3af'
              }}
            />
          </label>
          <button
            type="button"
            onClick={loadHistory}
            disabled={historyLoading || !historyDate}
            style={{
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid #1d4ed8',
              background: historyLoading ? '#9ca3af' : '#1d4ed8',
              color: '#fff',
              cursor: historyLoading ? 'wait' : 'pointer'
            }}
          >
            {historyLoading ? 'Loading History...' : 'Load History'}
          </button>
        </div>

        {historyError && (
          <div style={{
            marginBottom: '12px',
            padding: '10px',
            borderRadius: '8px',
            background: '#fee2e2',
            color: '#991b1b'
          }}>
            {historyError}
          </div>
        )}

        {historyData && (
          <>
            <h4>Local .lor files saved on {historyData.date}</h4>
            <p style={{ color: '#6b7280', fontSize: '13px' }}>
              Files are listed by their local saved time. The date encoded
              in a filename may be different.
            </p>

            {historyData.source_files.length === 0 ? (
              <p>No .lor source files were found for this saved date.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  marginBottom: '18px'
                }}>
                  <thead>
                    <tr style={{ textAlign: 'left', background: '#e5e7eb' }}>
                      <th style={{ padding: '9px' }}>Filename</th>
                      <th style={{ padding: '9px' }}>Saved locally</th>
                      <th style={{ padding: '9px' }}>Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.source_files.map((file) => (
                      <tr key={file.name}>
                        <td style={{
                          padding: '9px',
                          borderBottom: '1px solid #e5e7eb',
                          overflowWrap: 'anywhere'
                        }}>{file.name}</td>
                        <td style={{
                          padding: '9px',
                          borderBottom: '1px solid #e5e7eb',
                          whiteSpace: 'nowrap'
                        }}>{formatDate(file.saved_at)}</td>
                        <td style={{
                          padding: '9px',
                          borderBottom: '1px solid #e5e7eb',
                          whiteSpace: 'nowrap'
                        }}>{formatBytes(file.size)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h4>Activity log for {historyData.date}</h4>
            <p style={{ color: '#6b7280', fontSize: '13px' }}>
              {historyData.activity_count} matching log entries.
              {historyData.activity_truncated
                ? ' The service returned the latest 5,000 entries.'
                : ''}
              {historyData.activity.length > 200
                ? ' Showing the latest 200 below.'
                : ''}
            </p>

            {historyData.activity.length === 0 ? (
              <p>No activity log entries were found for this date.</p>
            ) : (
              <div style={{
                maxHeight: '420px',
                overflowY: 'auto',
                overflowX: 'auto',
                padding: '10px',
                borderRadius: '8px',
                background: '#111827',
                color: '#e5e7eb',
                fontFamily: 'monospace',
                fontSize: '12px',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere'
              }}>
                {historyData.activity.slice(-200).map((line, index) => (
                  <div key={`${index}-${line}`}>{line}</div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {error && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            borderRadius: '8px',
            background: '#fee2e2',
            color: '#991b1b'
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '10px',
          marginBottom: '18px'
        }}
      >
        {[
          ['Total', counts.total],
          ['SM', counts.sm],
          ['LoR', counts.lor],
          ['HTML', counts.html],
          ['Target Tests', counts.target_test],
          ['0 KB', counts.zero_kb],
          ['Completed', counts.completed],
          ['Failed', counts.failed]
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              padding: '13px',
              borderRadius: '9px',
              background: '#f3f4f6',
              border: '1px solid #e5e7eb'
            }}
          >
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {label}
            </div>
            <strong style={{ fontSize: '21px' }}>
              {value}
            </strong>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(200px, 2fr) 1fr 1fr',
          gap: '10px',
          marginBottom: '18px'
        }}
      >
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search filename, satellite, status..."
          style={{
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid #d1d5db'
          }}
        />

        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          style={{
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid #d1d5db'
          }}
        >
          {FILE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type === 'all' ? 'All file types' : typeLabel(type)}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          style={{
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid #d1d5db'
          }}
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status === 'all' ? 'All statuses' : statusLabel(status)}
            </option>
          ))}
        </select>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            minWidth: '1250px'
          }}
        >
          <thead>
            <tr>
              {[
                'Filename',
                'Type',
                'Status',
                'Date',
                'DOY',
                'Satellite',
                'Size',
                'Source',
                'Processed',
                'Action'
              ].map((heading) => (
                <th
                  key={heading}
                  style={{
                    textAlign: 'left',
                    padding: '10px',
                    borderBottom: '2px solid #d1d5db',
                    background: '#f9fafb',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filteredFiles.map((file) => (
              <tr key={file.id}>
                <td
                  style={{
                    padding: '10px',
                    borderBottom: '1px solid #e5e7eb',
                    maxWidth: '300px',
                    wordBreak: 'break-all'
                  }}
                >
                  <strong>{file.filename}</strong>

                  {file.error_message && (
                    <div
                      style={{
                        marginTop: '5px',
                        color: '#b91c1c',
                        fontSize: '12px'
                      }}
                    >
                      {file.error_message}
                    </div>
                  )}
                </td>

                <td style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>
                  {typeLabel(file.file_type)}
                </td>

                <td style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '5px 8px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: 700,
                      ...statusStyle(file.processing_status)
                    }}
                  >
                    {statusLabel(file.processing_status)}
                  </span>
                </td>

                <td style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>
                  {file.observation_date || '-'}
                </td>

                <td style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>
                  {file.doy ?? '-'}
                </td>

                <td style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>
                  <div>{file.satellite_id || '-'}</div>
                  <div style={{ color: '#6b7280', fontSize: '12px' }}>
                    {file.satellite_name || ''}
                  </div>
                </td>

                <td style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>
                  {formatBytes(file.file_size_bytes)}
                </td>

                <td style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>
                  {file.source_folder || '-'}
                </td>

                <td style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>
                  {formatDate(file.processed_at)}
                </td>

                <td style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>
                  <button
                    type="button"
                    onClick={() => downloadFile(file)}
                    disabled={downloading === file.id}
                    style={{
                      padding: '7px 10px',
                      borderRadius: '7px',
                      border: '1px solid #9ca3af',
                      background: '#fff',
                      cursor: downloading === file.id ? 'wait' : 'pointer'
                    }}
                  >
                    {downloading === file.id ? 'Opening...' : 'Download'}
                  </button>
                </td>
              </tr>
            ))}

            {!loading && filteredFiles.length === 0 && (
              <tr>
                <td
                  colSpan="10"
                  style={{
                    padding: '30px',
                    textAlign: 'center',
                    color: '#6b7280'
                  }}
                >
                  No SLR files match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{
          marginTop: '12px',
          fontSize: '12px',
          color: '#6b7280'
        }}
      >
        Showing {filteredFiles.length} of {files.length} recorded files.
      </div>
        </div>
      )}
    </section>
  )
}
