import './dashboard-theme.css'
import SlrFilesPanel from './components/SlrFilesPanel'

import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
function OperatorPerformanceGraph({ shiftName, performanceLogs }) {
  const logs = performanceLogs
    .filter((log) => log.shift === shiftName)
    .sort((a, b) => a.date.localeCompare(b.date))

  const operators = [
    ...new Set(
      logs.map(
        (log) =>
          log.profiles?.full_name || 'Unknown Operator'
      )
    ),
  ]

  const dates = [
    ...new Set(logs.map((log) => log.date)),
  ].sort()

  const width = 900
  const height = 320
  const paddingLeft = 60
  const paddingRight = 30
  const paddingTop = 30
  const paddingBottom = 55

  const chartWidth =
    width - paddingLeft - paddingRight

  const chartHeight =
    height - paddingTop - paddingBottom

  const maxValue = Math.max(
    11,
    ...logs.map((log) =>
      Number(log.satellites_tracked || 0)
    )
  )

  const getX = (index) => {
    if (dates.length <= 1) {
      return paddingLeft + chartWidth / 2
    }

    return (
      paddingLeft +
      (index / (dates.length - 1)) * chartWidth
    )
  }

  const getY = (value) => {
    return (
      paddingTop +
      chartHeight -
      (value / maxValue) * chartHeight
    )
  }

  const operatorColors = [
    '#2563eb',
    '#16a34a',
    '#dc2626',
    '#9333ea',
    '#f97316',
    '#0891b2',
  ]

  return (
    <div
      style={{
        marginTop: '20px',
        padding: '15px',
        border: '1px solid #d1d5db',
        borderRadius: '10px',
        background: '#ffffff',
      }}
    >
      <h4
        style={{
          marginTop: 0,
          marginBottom: '10px',
        }}
      >
        {shiftName.toUpperCase()} SHIFT — OPERATOR PERFORMANCE
      </h4>

      {dates.length === 0 ? (
        <div style={{ padding: '20px', color: '#6b7280' }}>
          No performance data for this shift.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            width="100%"
            style={{
              minWidth: '700px',
              display: 'block',
            }}
          >
            {/* Grid lines */}
            {[0, 5, 10, 11].map((value) => (
              <g key={value}>
                <line
                  x1={paddingLeft}
                  y1={getY(value)}
                  x2={width - paddingRight}
                  y2={getY(value)}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />

                <text
                  x={paddingLeft - 10}
                  y={getY(value) + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="#6b7280"
                >
                  {value}
                </text>
              </g>
            ))}

            {/* Target line */}
            <line
              x1={paddingLeft}
              y1={getY(11)}
              x2={width - paddingRight}
              y2={getY(11)}
              stroke="#dc2626"
              strokeWidth="2"
              strokeDasharray="6 5"
            />

            <text
              x={width - paddingRight}
              y={getY(11) - 8}
              textAnchor="end"
              fontSize="12"
              fill="#dc2626"
              fontWeight="bold"
            >
              Target 11
            </text>

            {/* Operator lines */}
            {operators.map((operator, operatorIndex) => {
              const points = dates.map((date, dateIndex) => {
                const log = logs.find(
                  (item) =>
                    item.date === date &&
                    (item.profiles?.full_name ||
                      'Unknown Operator') === operator
                )

                const value = Number(
                  log?.satellites_tracked || 0
                )

                return `${getX(dateIndex)},${getY(value)}`
              })

              return (
                <g key={operator}>
                  <polyline
                    points={points.join(' ')}
                    fill="none"
                    stroke={
                      operatorColors[
                        operatorIndex %
                          operatorColors.length
                      ]
                    }
                    strokeWidth="3"
                  />

                  {dates.map((date, dateIndex) => {
                    const log = logs.find(
                      (item) =>
                        item.date === date &&
                        (item.profiles?.full_name ||
                          'Unknown Operator') === operator
                    )

                    const value = Number(
                      log?.satellites_tracked || 0
                    )

                    return (
                      <circle
                        key={`${operator}-${date}`}
                        cx={getX(dateIndex)}
                        cy={getY(value)}
                        r="4"
                        fill={
                          operatorColors[
                            operatorIndex %
                              operatorColors.length
                          ]
                        }
                      />
                    )
                  })}
                </g>
              )
            })}

            {/* Dates */}
            {dates.map((date, index) => (
              <text
                key={date}
                x={getX(index)}
                y={height - 20}
                textAnchor="middle"
                fontSize="11"
                fill="#6b7280"
              >
                {date}
              </text>
            ))}

            {/* Axis labels */}
            <text
              x={20}
              y={height / 2}
              textAnchor="middle"
              fontSize="12"
              fill="#374151"
              transform={`rotate(-90 20 ${height / 2})`}
            >
              Satellites Tracked
            </text>

            <text
              x={width / 2}
              y={height - 2}
              textAnchor="middle"
              fontSize="12"
              fill="#374151"
            >
              Date
            </text>
          </svg>

          {/* Legend */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '15px',
              marginTop: '8px',
              justifyContent: 'center',
            }}
          >
            {operators.map((operator, index) => (
              <div
                key={operator}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                }}
              >
                <span
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background:
                      operatorColors[
                        index %
                          operatorColors.length
                      ],
                    display: 'inline-block',
                  }}
                />

                {operator}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
function ActivationCountdown() {
  const [activation, setActivation] = useState(null)
  const [now, setNow] = useState(Date.now())
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadActivation() {
      const { data, error } = await supabase
        .from('sftp_activation_status')
        .select('activated_at, expires_at, updated_at')
        .eq('id', true)
        .maybeSingle()

      if (!mounted) return

      if (error) {
        console.error('Could not load shared activation status:', error.message)
        setLoadError(true)
        return
      }

      setActivation(data)
      setLoadError(false)
    }

    loadActivation()

    const refreshTimer = setInterval(loadActivation, 30000)
    const clockTimer = setInterval(() => setNow(Date.now()), 1000)

    return () => {
      mounted = false
      clearInterval(refreshTimer)
      clearInterval(clockTimer)
    }
  }, [])

  const expiry = activation?.expires_at
    ? new Date(activation.expires_at).getTime()
    : 0

  const remaining = Math.max(0, Math.floor((expiry - now) / 1000))
  const days = Math.floor(remaining / 86400)
  const hours = Math.floor((remaining % 86400) / 3600)
  const minutes = Math.floor((remaining % 3600) / 60)
  const seconds = remaining % 60

  const countdown = [
    days > 0 ? `${days}d` : null,
    `${String(hours).padStart(2, '0')}h`,
    `${String(minutes).padStart(2, '0')}m`,
    `${String(seconds).padStart(2, '0')}s`,
  ].filter(Boolean).join(' ')

  const active = Boolean(expiry && remaining > 0)

  return (
    <section
      aria-live="polite"
      style={{
        margin: '16px 0',
        padding: '14px 18px',
        border: `1px solid ${active ? '#86efac' : '#d1d5db'}`,
        borderRadius: '10px',
        background: active ? '#f0fdf4' : '#f8fafc',
        color: '#1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      <div>
        <strong>SFTP Activation</strong>
        <div style={{ fontSize: '13px', marginTop: '4px' }}>
          {loadError
            ? 'Unable to load shared status. Retrying automatically.'
            : !activation
              ? 'Waiting for shared activation status...'
              : active
                ? 'Activation time remaining'
                : 'Activation expired — renewal required'}
        </div>
      </div>

      <strong
        style={{
          fontSize: '20px',
          fontVariantNumeric: 'tabular-nums',
          color: active ? '#166534' : '#475569',
        }}
      >
        {loadError
          ? 'Unavailable'
          : !activation
            ? 'Loading...'
            : active
              ? countdown
              : 'EXPIRED'}
      </strong>
    </section>
  )
}

function App() {
const dashboardRef = useRef(null)

async function downloadDashboardPDF() {
  try {
    const dashboard = document.querySelector(
      '[data-dashboard-report="true"]'
    )

    if (!dashboard) {
      alert('Dashboard report area not found.')
      return
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 500)
    )

    const clone = dashboard.cloneNode(true)

    const headings = clone.querySelectorAll('h3')

    headings.forEach((heading) => {
      if (
        heading.textContent
          .trim()
          .includes('ALL SUBMITTED SHIFT WORK')
      ) {
        const section = heading.closest('section')

        if (section) {
          section.remove()
        }
      }
    })

    const wrapper = document.createElement('div')

    wrapper.style.position = 'absolute'
    wrapper.style.left = '-100000px'
    wrapper.style.top = '0'
    wrapper.style.width = `${dashboard.scrollWidth}px`
    wrapper.style.background = '#ffffff'
    wrapper.style.padding = '20px'
    wrapper.style.boxSizing = 'border-box'

    wrapper.appendChild(clone)
    document.body.appendChild(wrapper)

    await new Promise((resolve) =>
      setTimeout(resolve, 300)
    )

    const canvas = await html2canvas(wrapper, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: wrapper.scrollWidth,
      height: wrapper.scrollHeight,
      windowWidth: wrapper.scrollWidth,
      windowHeight: wrapper.scrollHeight,
    })

    document.body.removeChild(wrapper)

    const imageData = canvas.toDataURL(
      'image/png',
      1.0
    )

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth =
      pdf.internal.pageSize.getWidth()

    const pageHeight =
      pdf.internal.pageSize.getHeight()

    const margin = 8

    const usableWidth =
      pageWidth - margin * 2

    const imageHeight =
      (canvas.height * usableWidth) /
      canvas.width

    let remainingHeight = imageHeight
    let position = margin

    pdf.addImage(
      imageData,
      'PNG',
      margin,
      position,
      usableWidth,
      imageHeight
    )

    remainingHeight -=
      pageHeight - margin * 2

    while (remainingHeight > 0) {
      pdf.addPage()

      position =
        margin -
        (imageHeight -
          remainingHeight)

      pdf.addImage(
        imageData,
        'PNG',
        margin,
        position,
        usableWidth,
        imageHeight
      )

      remainingHeight -=
        pageHeight - margin * 2
    }

    const startDate =
      performanceStartDate || 'start'

    const endDate =
      performanceEndDate || 'end'

    pdf.save(
      `SARAO_SLR_Dashboard_${startDate}_to_${endDate}.pdf`
    )

  } catch (error) {
    console.error(
      'Dashboard PDF generation failed:',
      error
    )

    alert(
      'PDF generation failed. Check the browser console.'
    )
  }
}
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginMessage, setLoginMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const [showDashboard, setShowDashboard] = useState(false)

  const [date, setDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  const [shift, setShift] = useState('Morning')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [satellites, setSatellites] = useState('')
  const [condition, setCondition] = useState('Good')
  const [weather, setWeather] = useState('Clear')
  const [problemsFound, setProblemsFound] = useState('')
  const [handoverNotes, setHandoverNotes] = useState('')
const [handoverAcknowledged, setHandoverAcknowledged] = useState(false)
  const [handoverHistory, setHandoverHistory] = useState([])

  const [submitMessage, setSubmitMessage] = useState('')

  const [dashboardDate, setDashboardDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [performanceStartDate, setPerformanceStartDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  const [performanceEndDate, setPerformanceEndDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [dashboardLogs, setDashboardLogs] = useState([])
  const [expandedShiftId, setExpandedShiftId] = useState(null)
const [performanceLogs, setPerformanceLogs] = useState([])
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [monthlyReport, setMonthlyReport] = useState('')

  const [editingLog, setEditingLog] = useState(null)
  const [editMessage, setEditMessage] = useState('')

  useEffect(() => {
    checkSession()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession)

        if (newSession?.user) {
          setUser(newSession.user)
          loadUser(newSession.user.id)
        } else {
          setUser(null)
          setProfile(null)
        }
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  async function checkSession() {
    const { data } = await supabase.auth.getSession()

    if (data.session) {
      setSession(data.session)
      setUser(data.session.user)
      await loadUser(data.session.user.id)
    }
  }

  async function loadUser(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', userId)
      .single()
console.log('DASHBOARD DATA:', data)
console.log('DASHBOARD ERROR:', error)
    if (error) {
      console.error(error)
      return
    }

    setProfile(data)
  }

  async function handleLogin(e) {
    e.preventDefault()

    setLoading(true)
    setLoginMessage('')
setSubmitMessage('')
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setLoginMessage(error.message)
      setLoading(false)
      return
    }

    setSession(data.session)
    setUser(data.user)

    await loadUser(data.user.id)

    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()

    setSession(null)
    setUser(null)
    setProfile(null)
    setShowDashboard(false)
    setHandoverAcknowledged(false)

    setEmail('')
    setPassword('')
  }

  async function submitShift(e) {
    e.preventDefault()

    setSubmitMessage('')

    if (!user) {
      setSubmitMessage('You are not logged in.')
      return
    }

    if (!date || !startTime || !endTime || satellites === '') {
      setSubmitMessage('Please complete all required fields.')
      return
    }

    const { error } = await supabase
      .from('shift_logs')
      .insert({
        operator_id: user.id,
        date,
        shift,
        start_time: startTime,
        end_time: endTime,
        satellites_tracked: Number(satellites),
        station_condition: condition,
        weather,
      })

    if (error) {
      console.error(error)
      setSubmitMessage(error.message)
      return
    }

    const { error: handoverError } = await supabase
      .from('station_handovers')
      .insert({
        operator_id: user.id,
        date,
        shift,
        station_status: condition,
        problems_found: problemsFound,
        handover_notes: handoverNotes,
      })

    if (handoverError) {
      console.error(handoverError)
      setSubmitMessage(handoverError.message)
      return
    }

    await loadHandoverHistory()

    setProblemsFound('')
    setHandoverNotes('')

    setSubmitMessage('Shift and handover submitted successfully.')
    const operatorName = profile?.full_name || 'Unknown Operator'

    const now = new Date()
    const submittedTime = now.toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

    const { error: notificationError } = await supabase.functions.invoke(
      'send-shift-notification',
      {
        body: {
          operatorName,
          date,
          time: submittedTime,
        },
      }
    )

    if (notificationError) {
      console.error('Notification error:', notificationError)
    }
    setStartTime('')
    setEndTime('')
    setSatellites('')
  }

  async function acknowledgeHandover(handoverId) {
    if (!user || !handoverId) return

    const { error } = await supabase.rpc(
      'acknowledge_station_handover',
      {
        handover_id: handoverId
      }
    )

    if (error) {
      console.error(error)
      return
    }

    setHandoverAcknowledged(true)
    await loadHandoverHistory()
  }

  async function acknowledgeHandover(handoverId) {
    if (!user || !handoverId) return

    const { error } = await supabase.rpc(
      'acknowledge_station_handover',
      {
        handover_id: handoverId
      }
    )

    if (error) {
      console.error(error)
      return
    }

    setHandoverAcknowledged(true)
    await loadHandoverHistory()
  }

  async function loadHandoverHistory() {
  if (!user) return

  const { data, error } = await supabase
    .from('station_handovers')
    .select(`
      id,
      date,
      shift,
      station_status,
      problems_found,
      handover_notes,
      created_at,
      acknowledged_by,
      acknowledged_at,
      profiles(full_name)
    `)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error(error)
    setHandoverHistory([])
    return
  }

  setHandoverHistory(data || [])
}

async function loadDashboard() {
  if (!profile || !user || (profile.role || '').toLowerCase() !== 'admin') return

  setDashboardLoading(true)

  const { data, error } = await supabase
    .from('shift_logs')
    .select(`
      id,
      date,
      shift,
      start_time,
      end_time,
      satellites_tracked,
      station_condition,
      weather,
      created_at,
      operator_id,
      profiles(full_name)
    `)
    .gte('date', performanceStartDate)
    .lte('date', performanceEndDate)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    console.error(error)
    setDashboardLogs([])
    setDashboardLoading(false)
    return
  }

  const { data: handovers, error: handoverError } = await supabase
    .from('station_handovers')
    .select(`
      id,
      date,
      shift,
      operator_id,
      problems_found,
      handover_notes,
      created_at
    `)
    .gte('date', performanceStartDate)
    .lte('date', performanceEndDate)
    .order('created_at', { ascending: false })

  if (handoverError) {
    console.error(handoverError)
  }

  const combinedLogs = (data || []).map((log) => {
    const matchingHandover = (handovers || []).find(
      (handover) =>
        handover.date === log.date &&
        handover.shift === log.shift &&
        handover.operator_id === log.operator_id
    )

    return {
      ...log,
      handover_notes: matchingHandover?.handover_notes || '',
      problems_found: matchingHandover?.problems_found || '',
    }
  })

  setDashboardLogs(combinedLogs)
  setDashboardLoading(false)
}

async function loadPerformance() {
  if (!profile || !user || (profile.role || '').toLowerCase() !== 'admin') return

  const { data, error } = await supabase
    .from('shift_logs')
    .select(`
      id,
      date,
      shift,
      satellites_tracked,
      operator_id,
      profiles(full_name)
    `)
    .gte('date', performanceStartDate)
    .lte('date', performanceEndDate)
    .order('date', { ascending: true })

  if (error) {
    console.error(error)
    setPerformanceLogs([])
    return
  }

  setPerformanceLogs(data || [])
}

async function runDashboard() {
  if (!profile || !user || (profile.role || '').toLowerCase() !== 'admin') return

  await loadDashboard()
  await loadPerformance()
}

useEffect(() => {
  if (showDashboard && (profile?.role || '').toLowerCase() === 'admin' && user) {
    loadDashboard()
    loadPerformance()
  }
}, [showDashboard, profile, user])

  function formatSubmittedTime(value) {
    if (!value) return '-'

    return new Date(value).toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  function getTotalSatellites() {
    return dashboardLogs.reduce(
      (total, log) =>
        total + Number(log.satellites_tracked || 0),
      0
    )
  }

  function getShiftSatellites(shiftName) {
    return dashboardLogs
      .filter((log) => log.shift === shiftName)
      .reduce(
        (total, log) =>
          total + Number(log.satellites_tracked || 0),
        0
      )
  }
  dashboardLogs
  .filter(
    (log) =>
      log.date >= performanceStartDate &&
      log.date <= performanceEndDate
  )
function getOperatorPerformanceChart(shiftName) {
  const logs = performanceLogs
    .filter((log) => log.shift === shiftName)
    .sort((a, b) => a.date.localeCompare(b.date))

  const operators = [
    ...new Set(
      logs.map(
        (log) =>
          log.profiles?.full_name || 'Unknown Operator'
      )
    ),
  ]

  const dates = [
    ...new Set(logs.map((log) => log.date)),
  ].sort()

  return {
    logs,
    operators,
    dates,
  }
}
    function getOperatorPerformance() {
    const operators = {}

    dashboardLogs
      .filter(
        (log) =>
          log.date >= performanceStartDate &&
          log.date <= performanceEndDate
      )
      .forEach((log) => {
        const name = log.profiles?.full_name || 'Unknown Operator'

        if (!operators[name]) {
          operators[name] = {
            name,
            total: 0,
            morning: 0,
            day: 0,
            night: 0,
          }
        }

        const amount = Number(log.satellites_tracked || 0)

        operators[name].total += amount

        if (log.shift === 'Morning') {
          operators[name].morning += amount
        }

        if (log.shift === 'Day') {
          operators[name].day += amount
        }

        if (log.shift === 'Night') {
          operators[name].night += amount
        }
      })

    return Object.values(operators)
  }
function getStationPerformance() {
  const total = dashboardLogs.reduce(
    (sum, log) => sum + Number(log.satellites_tracked || 0),
    0
  )

  const target = dailyTarget

  const percentage =
    target > 0
      ? Math.min(Math.round((total / target) * 100), 100)
      : 0

  return {
    total,
    target,
    percentage,
  }
}
  function isHandoverActive(handover) {
    if (!handover) return false

    const submittedAt = new Date(handover.created_at).getTime()
    const eightHours = 8 * 60 * 60 * 1000
    const eightHoursPassed =
      Date.now() - submittedAt >= eightHours

    if (!handover.acknowledged_at) {
      return true
    }

    return !eightHoursPassed
  }

  function generateMonthlyReport() {
    const logs = dashboardLogs.filter(
      (log) =>
        log.date >= performanceStartDate &&
        log.date <= performanceEndDate
    )

    const totalSatellites = logs.reduce(
      (sum, log) => sum + Number(log.satellites_tracked || 0),
      0
    )

    const totalShifts = logs.length
    const monthlyTarget = totalShifts * dailyTarget

    const targetPercentage =
      monthlyTarget > 0
        ? Math.round((totalSatellites / monthlyTarget) * 100)
        : 0

    const shiftSummary = ['Morning', 'Day', 'Night'].map((shift) => {
      const shiftLogs = logs.filter((log) => log.shift === shift)

      const total = shiftLogs.reduce(
        (sum, log) => sum + Number(log.satellites_tracked || 0),
        0
      )

      const target = shiftLogs.length * dailyTarget

      return {
        shift,
        shifts: shiftLogs.length,
        total,
        target,
        percentage:
          target > 0
            ? Math.round((total / target) * 100)
            : 0,
      }
    })

    const operators = {}

    logs.forEach((log) => {
      const name = log.profiles?.full_name || 'Unknown Operator'

      if (!operators[name]) {
        operators[name] = {
          name,
          shifts: 0,
          total: 0,
        }
      }

      operators[name].shifts += 1
      operators[name].total += Number(
        log.satellites_tracked || 0
      )
    })

    const operatorSummary = Object.values(operators)

    const conditionSummary = {}

    logs.forEach((log) => {
      const condition = log.station_condition || 'Not recorded'

      conditionSummary[condition] =
        (conditionSummary[condition] || 0) + 1
    })

    const weatherSummary = {}

    logs.forEach((log) => {
      const weather = log.weather || 'Not recorded'

      weatherSummary[weather] =
        (weatherSummary[weather] || 0) + 1
    })

    const report = [
      'SARAO SLR MONTHLY MANAGEMENT REPORT',
      '===================================',
      '',
      `Reporting period: ${performanceStartDate} to ${performanceEndDate}`,
      '',
      '1. MONTHLY SUMMARY',
      `Total shifts completed: ${totalShifts}`,
      `Total satellites tracked: ${totalSatellites}`,
      `Monthly target: ${monthlyTarget}`,
      `Target achievement: ${targetPercentage}%`,
      '',
      '2. SHIFT PERFORMANCE',
      ...shiftSummary.map(
        (item) =>
          `${item.shift}: ${item.shifts} shifts, ${item.total} satellites, target ${item.target}, achievement ${item.percentage}%`
      ),
      '',
      '3. OPERATOR ACTIVITY',
      ...(
        operatorSummary.length > 0
          ? operatorSummary.map(
              (operator) =>
                `${operator.name}: ${operator.shifts} shifts, ${operator.total} satellites, average ${(
                  operator.total / operator.shifts
                ).toFixed(1)} satellites per shift`
            )
          : ['No operator data recorded.']
      ),
      '',
      '4. STATION CONDITION',
      ...Object.entries(conditionSummary).map(
        ([condition, count]) =>
          `${condition}: ${count} shift(s)`
      ),
      '',
      '5. WEATHER CONDITIONS',
      ...Object.entries(weatherSummary).map(
        ([weather, count]) =>
          `${weather}: ${count} shift(s)`
      ),
      '',
      '6. MANAGEMENT NOTES',
      'This report is generated from the submitted SLR shift records for the selected reporting period.',
      '',
      `Report generated: ${new Date().toLocaleString('en-ZA', {
        dateStyle: 'medium',
        timeStyle: 'short',
        hour12: false,
      })}`,
    ].join('\\n')

    return report
  }

  async function deleteLog(id) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this submitted shift?'
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('shift_logs')
      .delete()
      .eq('id', id)

    if (error) {
      alert(error.message)
      return
    }

    await loadDashboard()
  }

  function startEdit(log) {
    setEditingLog({
      ...log,
      start_time: log.start_time
        ? log.start_time.substring(0, 5)
        : '',
      end_time: log.end_time
        ? log.end_time.substring(0, 5)
        : '',
      satellites_tracked: log.satellites_tracked,
      station_condition: log.station_condition || 'Good',
      weather: log.weather || 'Clear',
    })

    setEditMessage('')
  }
function getMonthlyTeamPerformance() {
  const total = performanceLogs.reduce(
    (sum, log) => sum + Number(log.satellites_tracked || 0),
    0
  )

  const morning = performanceLogs
    .filter((log) => log.shift === 'Morning')
    .reduce(
      (sum, log) => sum + Number(log.satellites_tracked || 0),
      0
    )

  const day = performanceLogs
    .filter((log) => log.shift === 'Day')
    .reduce(
      (sum, log) => sum + Number(log.satellites_tracked || 0),
      0
    )

  const night = performanceLogs
    .filter((log) => log.shift === 'Night')
    .reduce(
      (sum, log) => sum + Number(log.satellites_tracked || 0),
      0
    )

  return {
    total,
    morning,
    day,
    night,
  }
}
  async function saveEdit() {
    if (!editingLog) return

    setEditMessage('')

    const { error } = await supabase
      .from('shift_logs')
      .update({
        date: editingLog.date,
        shift: editingLog.shift,
        start_time: editingLog.start_time,
        end_time: editingLog.end_time,
        satellites_tracked: Number(
          editingLog.satellites_tracked
        ),
        station_condition:
          editingLog.station_condition,
        weather: editingLog.weather,
      })
      .eq('id', editingLog.id)

    if (error) {
      console.error(error)
      setEditMessage(error.message)
      return
    }

    setEditingLog(null)
    await loadDashboard()
  }

  const totalSatellites = getTotalSatellites()
  const morningSatellites =
    getShiftSatellites('Morning')
  const daySatellites =
    getShiftSatellites('Day')
  const nightSatellites =
    getShiftSatellites('Night')

  const dailyTarget = 11

  const achievement =
    dailyTarget > 0
      ? Math.round(
          (totalSatellites / dailyTarget) * 100
        )
      : 0

  if (!session) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginBox}>
          <h1 style={styles.loginTitle}>
            SARAO SLR Tracker
          </h1>

          <p style={styles.loginSubtitle}>
            Satellite Laser Ranging Shift System
          </p>

          <form onSubmit={handleLogin}>
            <label style={styles.label}>
              Email
            </label>

            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="Enter your email"
              required
            />

            <label style={styles.label}>
              Password
            </label>

            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Enter your password"
              required
            />

            <button
              style={styles.loginButton}
              type="submit"
              disabled={loading}
            >
              {loading
                ? 'Logging in...'
                : 'LOGIN'}
            </button>
          </form>

          {loginMessage && (
            <p style={styles.errorMessage}>
              {loginMessage}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>
            SARAO SLR Tracker
          </h1>

          <p style={styles.headerSubtitle}>
            Satellite Laser Ranging Shift System
          </p>
        </div>

        <div style={styles.userArea}>
          <div style={styles.userName}>
            Logged in as:{' '}
            {profile?.full_name || 'Loading...'}
          </div>

          <div style={styles.roleBadge}>
            {(profile?.role || '').toLowerCase() === 'admin'
              ? 'ADMIN — ALL OPERATORS'
              : 'OPERATOR'}
          </div>

          <button
            style={styles.logoutButton}
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <ActivationCountdown />

      <main style={styles.main}>
        {!showDashboard && (
          <>
            {(profile?.role || '').toLowerCase() === 'admin' && (
              <div style={styles.topButtons}>
                <button
                  style={styles.dashboardButton}
                  onClick={() =>
                    setShowDashboard(true)
                  }
                >
                  📊 OPEN DASHBOARD
                </button>
              </div>
            )}

            <section
              style={{
                ...styles.card,
                backgroundImage: "linear-gradient(rgba(255,255,255,0.82), rgba(255,255,255,0.82)), url('/images/moblas6-night.jpg')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            >
              <h2 style={styles.sectionTitle}>
                Submit Shift Work
              </h2>

              <form onSubmit={submitShift}>
                <div style={styles.formGrid}>
                  <div>
                    <label style={styles.label}>
                      Date
                    </label>

                    <input
                      style={styles.input}
                      type="date"
                      value={date}
                      onChange={(e) =>
                        setDate(e.target.value)
                      }
                      required
                    />
                  </div>

                  <div>
                    <label style={styles.label}>
                      Shift
                    </label>

                    <select
                      style={styles.input}
                      value={shift}
                      onChange={(e) =>
                        setShift(e.target.value)
                      }
                    >
                      <option>Morning</option>
                      <option>Day</option>
                      <option>Night</option>
                    </select>
                  </div>

                  <div>
                    <label style={styles.label}>
                      Start Time
                    </label>

                    <input
                      style={styles.input}
                      type="time"
                      value={startTime}
                      onChange={(e) =>
                        setStartTime(e.target.value)
                      }
                      required
                    />
                  </div>

                  <div>
                    <label style={styles.label}>
                      End Time
                    </label>

                    <input
                      style={styles.input}
                      type="time"
                      value={endTime}
                      onChange={(e) =>
                        setEndTime(e.target.value)
                      }
                      required
                    />
                  </div>

                  <div>
                    <label style={styles.label}>
                      Satellites Tracked
                    </label>

                    <input
                      style={styles.input}
                      type="number"
                      min="0"
                      value={satellites}
                      onChange={(e) =>
                        setSatellites(e.target.value)
                      }
                      required
                    />
                  </div>

                  <div>
                    <label style={styles.label}>
                      Station Condition
                    </label>

                    <select
                      style={styles.input}
                      value={condition}
                      onChange={(e) =>
                        setCondition(e.target.value)
                      }
                    >
                      <option>Good</option>
                      <option>Fair</option>
                      <option>Poor</option>
                      <option>Offline</option>
                    </select>
                  </div>

                  <div>
                    <label style={styles.label}>
                      Weather
                    </label>

                    <select
                      style={styles.input}
                      value={weather}
                      onChange={(e) =>
                        setWeather(e.target.value)
                      }
                    >
                      <option>Clear</option>
                      <option>Cloudy</option>
                      <option>Overcast</option>
                      <option>Rain</option>
                      <option>Storm</option>
                      <option>Windy</option>
                      <option>Fog</option>
                    </select>
                  </div>

                  {handoverHistory.length > 0 && isHandoverActive(handoverHistory[0]) && (
                    <div style={{
                      marginBottom: '16px',
                      padding: '16px',
                      border: '2px solid #1f6feb',
                      borderRadius: '8px',
                      background: '#f5f9ff'
                    }}>
                      <h3 style={{ marginTop: 0 }}>
                        Previous Shift Handover
                      </h3>

                      {handoverHistory.slice(0, 1).map((handover) => (
                        <div key={handover.id}>
                          <p><strong>Date:</strong> {handover.date}</p>
                          <p><strong>Shift:</strong> {handover.shift}</p>
                          <p>
                            <strong>Operator:</strong>{' '}
                            {handover.profiles?.full_name || 'Unknown Operator'}
                          </p>
                          <p>
                            <strong>Problems Found:</strong>{' '}
                            {handover.problems_found || 'None recorded'}
                          </p>
                          <p>
                            <strong>Handover Notes:</strong>{' '}
                            {handover.handover_notes || 'No notes recorded'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{
                      marginBottom: '16px',
                      padding: '14px',
                      border: '1px solid #ccc',
                      borderRadius: '8px'
                    }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          checked={handoverAcknowledged}
                          onChange={async (e) => {
                            if (e.target.checked && handoverHistory.length > 0) {
                              await acknowledgeHandover(handoverHistory[0].id)
                              setProblemsFound('')
                              setHandoverNotes('')
                            }
                          }}
                        />
                        <span>I have read and understood the previous handover</span>
                      </label>
                    </div>

                    <div>
                    <label>Problems Found</label>
                    <textarea
                      value={problemsFound}
                      onChange={(e) => setProblemsFound(e.target.value)}
                      placeholder="Enter problems found..."
                    />
                  </div>

                  <div>
                    <label>Handover Notes</label>
                    <textarea
                      value={handoverNotes}
                      onChange={(e) => setHandoverNotes(e.target.value)}
                      placeholder="Enter handover notes..."
                    />
                  </div>
                </div>

                <button
                  style={styles.submitButton}
                  type="submit"
                >
                  SUBMIT SHIFT
                </button>
              </form>

              {submitMessage && (
                <div
                  style={
                    submitMessage.includes(
                      'successfully'
                    )
                      ? styles.successMessage
                      : styles.errorMessage
                  }
                >
                  {submitMessage}
                </div>
              )}
            </section>

            {(profile?.role || '').toLowerCase() !== 'admin' && (
              <div style={styles.operatorMessage}>
                Your shift has been submitted securely.
                Submitted work is visible to Admin only.
              </div>
            )}
          </>
        )}

        {showDashboard &&
          (profile?.role || '').toLowerCase() === 'admin' && (
            <div data-dashboard-report="true">
        {/* SLR FILES ADMIN PANEL */}
        <SlrFilesPanel />

              <div style={styles.topButtons}>
                <button
                  style={styles.backButton}
                  onClick={() =>
                    setShowDashboard(false)
                  }
                >
                  ← BACK TO SHIFT ENTRY
                </button>

                <button
                  style={styles.refreshButton}
                  onClick={loadDashboard}
                >
                  🔄 REFRESH
                </button>
              </div>

              <section style={styles.dashboardHeader}>
                <div>
                  <h2 style={styles.dashboardTitle}>
                    SLR DASHBOARD
                  </h2>

                  <p style={styles.dashboardSubtitle}>
                    All operators shift performance
                  </p>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '15px',
                  alignItems: 'flex-end',
                  flexWrap: 'wrap'
                }}>
                  <div>
                    <label style={styles.label}>
                      Start Date
                    </label>

                    <input
                      style={styles.datePicker}
                      type="date"
                      value={performanceStartDate}
                      onChange={(e) =>
                        setPerformanceStartDate(e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label style={styles.label}>
                      End Date
                    </label>

                    <input
                      style={styles.datePicker}
                      type="date"
                      value={performanceEndDate}
                      onChange={(e) =>
                        setPerformanceEndDate(e.target.value)
                      }
                    />
                  </div>

                  <button
                    style={styles.refreshButton}
                    onClick={runDashboard}
                  >
                    ▶ RUN DASHBOARD
                  </button>

                  <button
                    type="button"
                    style={styles.refreshButton}
                    onClick={async (event) => {
                      event.preventDefault()
                      event.stopPropagation()

                      await loadDashboard()
                      setMonthlyReport(generateMonthlyReport())

                      setTimeout(() => {
                        downloadDashboardPDF()
                      }, 500)
                    }}
                  >
                    📄 GENERATE MONTHLY REPORT
                  </button>
                </div>
              </section>

              {dashboardLoading ? (
                <div style={styles.loadingBox}>
                  Loading dashboard...
                </div>
              ) : (
                <>
                  <div style={styles.summaryGrid}>
                    <div style={styles.summaryBoxBlue}>
                      <div style={styles.summaryLabel}>
                        TOTAL SATELLITES
                      </div>

                      <div style={styles.summaryNumber}>
                        {totalSatellites}
                      </div>
                    </div>

                    <div style={styles.summaryBoxGreen}>
                      <div style={styles.summaryLabel}>
                        MORNING
                      </div>

                      <div style={styles.summaryNumber}>
                        {morningSatellites}
                      </div>
                    </div>

                    <div style={styles.summaryBoxOrange}>
                      <div style={styles.summaryLabel}>
                        DAY
                      </div>

                      <div style={styles.summaryNumber}>
                        {daySatellites}
                      </div>
                    </div>

                    <div style={styles.summaryBoxPurple}>
                      <div style={styles.summaryLabel}>
                        NIGHT
                      </div>

                      <div style={styles.summaryNumber}>
                        {nightSatellites}
                      </div>
                    </div>
                  </div>


                   <section style={styles.card}>
                    <div style={styles.targetHeader}>
                      <div>
                        <h3 style={styles.cardTitle}>
                          DAILY TARGET
                        </h3>

                        <p style={styles.targetText}>
                          Target: {dailyTarget}{' '}
                          satellites
                        </p>
                      </div>

                      <div style={styles.achievement}>
                        {achievement}%
                      </div>
                    </div>

                    <div
                      style={styles.progressBackground}
                    >
                      <div
                        style={{
                          ...styles.progressBar,
                          width: `${Math.min(
                            achievement,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </section>

                  <section style={styles.card}>
                    <h3 style={styles.cardTitle}>
                      SATELLITES TRACKED BY SHIFT
                    </h3>

                    <div style={styles.chartArea}>
                      <div style={styles.chartColumn}>
                        <div style={styles.chartValue}>
                          {morningSatellites}
                        </div>

                        <div
                          style={{
                            ...styles.chartBar,
                            height: `${Math.max(
                              morningSatellites * 18,
                              8
                            )}px`,
                            background: '#16a34a',
                          }}
                        />

                        <div style={styles.chartLabel}>
                          Morning
                        </div>
                      </div>

                      <div style={styles.chartColumn}>
                        <div style={styles.chartValue}>
                          {daySatellites}
                        </div>

                        <div
                          style={{
                            ...styles.chartBar,
                            height: `${Math.max(
                              daySatellites * 18,
                              8
                            )}px`,
                            background: '#f97316',
                          }}
                        />

                        <div style={styles.chartLabel}>
                          Day
                        </div>
                      </div>

                      <div style={styles.chartColumn}>
                        <div style={styles.chartValue}>
                          {nightSatellites}
                        </div>

                        <div
                          style={{
                            ...styles.chartBar,
                            height: `${Math.max(
                              nightSatellites * 18,
                              8
                            )}px`,
                            background: '#9333ea',
                          }}
                        />

                        <div style={styles.chartLabel}>
                          Night
                        </div>
                      </div>
                    </div>
                  </section>
<section style={styles.card}>
  <h3 style={styles.cardTitle}>
    OPERATOR PERFORMANCE
  </h3>
  <div style={{ overflowX: 'auto' }}>
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Operator</th>
          <th style={styles.th}>Morning</th>
          <th style={styles.th}>Day</th>
          <th style={styles.th}>Night</th>
          <th style={styles.th}>Total</th>
          <th style={styles.th}>Achievement</th>
        </tr>
      </thead>

      <tbody>
        {getOperatorPerformance().map((operator) => {
          const percentage =
            dailyTarget > 0
              ? Math.round(
                  (operator.total / dailyTarget) * 100
                )
              : 0

          return (
            <tr key={operator.name}>
              <td style={styles.td}>
                <strong>{operator.name}</strong>
              </td>

              <td style={styles.td}>
                {operator.morning}
              </td>

              <td style={styles.td}>
                {operator.day}
              </td>

              <td style={styles.td}>
                {operator.night}
              </td>

              <td style={styles.td}>
                <strong>{operator.total}</strong>
              </td>

              <td style={styles.td}>
                <strong>{percentage}%</strong>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  </div>
</section>

<section style={styles.card}>
  <h3 style={styles.cardTitle}>
    OPERATOR PERFORMANCE TRENDS
  </h3>

  <p
    style={{
      marginTop: 0,
      color: '#6b7280',
      fontSize: '14px',
    }}
  >
    Performance comparison for the selected date range.
    Target: 11 satellites per shift.
  </p>

  <OperatorPerformanceGraph shiftName="Morning" performanceLogs={performanceLogs} />

  <OperatorPerformanceGraph shiftName="Day" performanceLogs={performanceLogs} />

  <OperatorPerformanceGraph shiftName="Night" performanceLogs={performanceLogs} />
</section>

<section style={styles.card}>
  <h3 style={styles.cardTitle}>
    COMBINED STATION PERFORMANCE
  </h3>

  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px'
  }}>
    <div style={styles.summaryBox}>
      <div style={styles.summaryLabel}>
        TOTAL SATELLITES
      </div>

      <div style={styles.summaryValue}>
        {getStationPerformance().total}
      </div>
    </div>

    <div style={styles.summaryBox}>
      <div style={styles.summaryLabel}>
        TARGET
      </div>

      <div style={styles.summaryValue}>
        {getStationPerformance().target}
      </div>
    </div>

    <div style={styles.summaryBox}>
      <div style={styles.summaryLabel}>
        ACHIEVEMENT
      </div>

      <div style={styles.summaryValue}>
        {getStationPerformance().percentage}%
      </div>
    </div>
  </div>
</section>
                  <section style={styles.card}>
                    <h3 style={styles.cardTitle}>
                      TOTAL SATELLITES TRACKED TODAY
                    </h3>

                    <div style={styles.totalChart}>
                      <div
                        style={styles.totalChartNumber}
                      >
                        {totalSatellites}
                      </div>

                      <div
                        style={styles.totalChartLabel}
                      >
                        Satellites
                      </div>
                    </div>
                  </section>

                  <section style={styles.card}>
                    <h3 style={styles.cardTitle}>
                      ALL SUBMITTED SHIFT WORK
                    </h3>

                    {dashboardLogs.length === 0 ? (
                      <div style={styles.noData}>
                        No submitted shift work for
                        this date.
                      </div>
                    ) : (
                      <div>
                        {dashboardLogs.map((log) => {
                          const isExpanded =
                            expandedShiftId === log.id

                          return (
                            <div
                              key={log.id}
                              style={{
                                border: '1px solid #d1d5db',
                                borderRadius: '10px',
                                marginBottom: '10px',
                                overflow: 'hidden',
                                background: '#ffffff',
                              }}
                            >
                              <div
                                onClick={() =>
                                  setExpandedShiftId(
                                    isExpanded ? null : log.id
                                  )
                                }
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '15px',
                                  padding: '14px 16px',
                                  cursor: 'pointer',
                                  background: '#f8fafc',
                                  flexWrap: 'wrap',
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '15px',
                                    flexWrap: 'wrap',
                                  }}
                                >
                                  <span
                                    style={{
                                      ...styles.shiftBadge,
                                      background:
                                        log.shift === 'Morning'
                                          ? '#16a34a'
                                          : log.shift === 'Day'
                                          ? '#f97316'
                                          : '#9333ea',
                                    }}
                                  >
                                    {log.shift}
                                  </span>

                                  <strong>
                                    {log.profiles?.full_name || '-'}
                                  </strong>

                                  <span>
                                    🛰️ <strong>{log.satellites_tracked}</strong> satellites
                                  </span>

                                  <span>
                                    {log.station_condition || '-'}
                                  </span>
                                </div>

                                <strong>
                                  {isExpanded
                                    ? '▲ MINIMIZE'
                                    : '▼ VIEW DETAILS'}
                                </strong>
                              </div>

                              {isExpanded && (
                                <div
                                  style={{
                                    padding: '16px',
                                    borderTop: '1px solid #e5e7eb',
                                  }}
                                >
                                  <div
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns:
                                        'repeat(auto-fit, minmax(180px, 1fr))',
                                      gap: '12px',
                                    }}
                                  >
                                    <div>
                                      <strong>Start</strong>
                                      <div>
                                        {log.start_time
                                          ? log.start_time.substring(0, 5)
                                          : '-'}
                                      </div>
                                    </div>

                                    <div>
                                      <strong>End</strong>
                                      <div>
                                        {log.end_time
                                          ? log.end_time.substring(0, 5)
                                          : '-'}
                                      </div>
                                    </div>

                                    <div>
                                      <strong>Weather</strong>
                                      <div>{log.weather || '-'}</div>
                                    </div>

                              <div>
  <strong>Submitted</strong>
  <div>
    {formatSubmittedTime(log.created_at)}
  </div>
</div>

<div>
  <strong>Handover Notes</strong>
  <div>
    {log.handover_notes || 'No handover notes recorded'}
  </div>
</div>

                                  </div>

                                  <div
                                    style={{
                                      marginTop: '15px',
                                      display: 'flex',
                                      gap: '10px',
                                    }}
                                  >
                                    <button
                                      style={styles.editButton}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        startEdit(log)
                                      }}
                                    >
                                      Edit
                                    </button>

                                    <button
                                      style={styles.deleteButton}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        deleteLog(log.id)
                                      }}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          )}

        {editingLog && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h2 style={styles.modalTitle}>
                Edit Submitted Shift
              </h2>

              <label style={styles.label}>
                Date
              </label>

              <input
                style={styles.input}
                type="date"
                value={editingLog.date}
                onChange={(e) =>
                  setEditingLog({
                    ...editingLog,
                    date: e.target.value,
                  })
                }
              />

              <label style={styles.label}>
                Shift
              </label>

              <select
                style={styles.input}
                value={editingLog.shift}
                onChange={(e) =>
                  setEditingLog({
                    ...editingLog,
                    shift: e.target.value,
                  })
                }
              >
                <option>Morning</option>
                <option>Day</option>
                <option>Night</option>
              </select>

              <label style={styles.label}>
                Start Time
              </label>

              <input
                style={styles.input}
                type="time"
                value={editingLog.start_time}
                onChange={(e) =>
                  setEditingLog({
                    ...editingLog,
                    start_time: e.target.value,
                  })
                }
              />

              <label style={styles.label}>
                End Time
              </label>

              <input
                style={styles.input}
                type="time"
                value={editingLog.end_time}
                onChange={(e) =>
                  setEditingLog({
                    ...editingLog,
                    end_time: e.target.value,
                  })
                }
              />

              <label style={styles.label}>
                Satellites Tracked
              </label>

              <input
                style={styles.input}
                type="number"
                min="0"
                value={editingLog.satellites_tracked}
                onChange={(e) =>
                  setEditingLog({
                    ...editingLog,
                    satellites_tracked:
                      e.target.value,
                  })
                }
              />

              <label style={styles.label}>
                Station Condition
              </label>

              <select
                style={styles.input}
                value={
                  editingLog.station_condition
                }
                onChange={(e) =>
                  setEditingLog({
                    ...editingLog,
                    station_condition:
                      e.target.value,
                  })
                }
              >
                <option>Good</option>
                <option>Fair</option>
                <option>Poor</option>
                <option>Offline</option>
              </select>

              <label style={styles.label}>
                Weather
              </label>

              <select
                style={styles.input}
                value={editingLog.weather}
                onChange={(e) =>
                  setEditingLog({
                    ...editingLog,
                    weather: e.target.value,
                  })
                }
              >
                <option>Clear</option>
                <option>Cloudy</option>
                <option>Overcast</option>
                <option>Rain</option>
                <option>Storm</option>
                <option>Windy</option>
                <option>Fog</option>
              </select>

              {editMessage && (
                <div style={styles.errorMessage}>
                  {editMessage}
                </div>
              )}

              <div style={styles.modalButtons}>
                <button
                  style={styles.cancelButton}
                  onClick={() =>
                    setEditingLog(null)
                  }
                >
                  Cancel
                </button>

                <button
                  style={styles.saveButton}
                  onClick={saveEdit}
                >
                  SAVE CHANGES
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

const styles = {
  loginPage: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background:
      'linear-gradient(135deg, #2563eb, #7c3aed)',
    padding: '20px',
  },

  loginBox: {
    width: '100%',
    maxWidth: '430px',
    background: '#ffffff',
    borderRadius: '18px',
    padding: '40px',
    boxShadow:
      '0 20px 50px rgba(0,0,0,0.25)',
  },

  loginTitle: {
    margin: 0,
    textAlign: 'center',
    color: '#1d4ed8',
    fontSize: '30px',
  },

  loginSubtitle: {
    textAlign: 'center',
    color: '#64748b',
    marginBottom: '30px',
  },

  page: {
    minHeight: '100vh',
    background: '#f1f5f9',
  },

  header: {
    background:
      'linear-gradient(90deg, #1d4ed8, #7c3aed)',
    color: '#ffffff',
    padding: '20px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '20px',
    flexWrap: 'wrap',
    boxShadow:
      '0 4px 15px rgba(0,0,0,0.15)',
  },

  headerTitle: {
    margin: 0,
    fontSize: '28px',
  },

  headerSubtitle: {
    margin: '5px 0 0',
    opacity: 0.9,
  },

  userArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },

  userName: {
    fontWeight: 'bold',
  },

  roleBadge: {
    background: '#facc15',
    color: '#111827',
    padding: '7px 12px',
    borderRadius: '20px',
    fontWeight: 'bold',
    fontSize: '12px',
  },

  logoutButton: {
    background: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '9px 15px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },

  main: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '25px',
  },

  topButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    marginBottom: '20px',
  },

  dashboardButton: {
    background: '#2563eb',
    color: '#ffffff',
    border: 'none',
    padding: '14px 22px',
    borderRadius: '10px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },

  backButton: {
    background: '#475569',
    color: '#ffffff',
    border: 'none',
    padding: '12px 18px',
    borderRadius: '9px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },

  refreshButton: {
    background: '#16a34a',
    color: '#ffffff',
    border: 'none',
    padding: '12px 18px',
    borderRadius: '9px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },

  card: {
    background: '#ffffff',
    borderRadius: '14px',
    padding: '24px',
    marginBottom: '22px',
    boxShadow:
      '0 4px 14px rgba(15,23,42,0.08)',
  },

  sectionTitle: {
    marginTop: 0,
    color: '#1e3a8a',
  },

  cardTitle: {
    color: '#1e293b',
    marginTop: 0,
  },

  label: {
    display: 'block',
    marginBottom: '7px',
    marginTop: '12px',
    fontWeight: 'bold',
    color: '#1e293b',
  },

  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px 12px',
    border: '2px solid #2563eb',
    borderRadius: '8px',
    fontSize: '15px',
    background: '#f8fafc',
    color: '#111827',
    fontWeight: '500',
  },

  textarea: {
    width: '100%',
    minHeight: '90px',
    boxSizing: 'border-box',
    padding: '11px 12px',
    border: '2px solid #2563eb',
    borderRadius: '8px',
    fontSize: '15px',
    background: '#f8fafc',
    color: '#111827',
    resize: 'vertical',
  },

  formGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '10px 18px',
  },

  submitButton: {
    marginTop: '25px',
    background: '#16a34a',
    color: '#ffffff',
    border: 'none',
    padding: '14px 25px',
    borderRadius: '9px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '15px',
  },

  loginButton: {
    width: '100%',
    marginTop: '20px',
    background: '#2563eb',
    color: '#ffffff',
    border: 'none',
    padding: '14px',
    borderRadius: '9px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '16px',
  },

  successMessage: {
    marginTop: '18px',
    padding: '12px',
    borderRadius: '8px',
    background: '#dcfce7',
    color: '#166534',
    fontWeight: 'bold',
  },

  errorMessage: {
    marginTop: '18px',
    padding: '12px',
    borderRadius: '8px',
    background: '#fee2e2',
    color: '#991b1b',
    fontWeight: 'bold',
  },

  operatorMessage: {
    background: '#dbeafe',
    color: '#1e3a8a',
    padding: '16px',
    borderRadius: '10px',
    fontWeight: 'bold',
    marginBottom: '20px',
  },

  dashboardHeader: {
    background:
      'linear-gradient(90deg, #2563eb, #7c3aed)',
    color: '#ffffff',
    padding: '22px',
    borderRadius: '14px',
    marginBottom: '22px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '20px',
    flexWrap: 'wrap',
  },

  dashboardTitle: {
    margin: 0,
    fontSize: '28px',
  },

  dashboardSubtitle: {
    marginBottom: 0,
  },

  datePicker: {
    padding: '11px',
    borderRadius: '8px',
    border: '2px solid #ffffff',
    background: '#ffffff',
    color: '#111827',
    fontWeight: 'bold',
  },

  summaryGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '18px',
    marginBottom: '22px',
  },

  summaryBoxBlue: {
    background: '#2563eb',
    color: '#ffffff',
    padding: '24px',
    borderRadius: '14px',
  },

  summaryBoxGreen: {
    background: '#16a34a',
    color: '#ffffff',
    padding: '24px',
    borderRadius: '14px',
  },

  summaryBoxOrange: {
    background: '#f97316',
    color: '#ffffff',
    padding: '24px',
    borderRadius: '14px',
  },

  summaryBoxPurple: {
    background: '#9333ea',
    color: '#ffffff',
    padding: '24px',
    borderRadius: '14px',
  },

  summaryLabel: {
    fontSize: '13px',
    fontWeight: 'bold',
  },

  summaryNumber: {
    fontSize: '42px',
    fontWeight: 'bold',
    marginTop: '8px',
  },

  targetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  targetText: {
    color: '#64748b',
  },

  achievement: {
    fontSize: '30px',
    fontWeight: 'bold',
    color: '#2563eb',
  },

  progressBackground: {
    height: '20px',
    background: '#e2e8f0',
    borderRadius: '20px',
    overflow: 'hidden',
  },

  progressBar: {
    height: '100%',
    background:
      'linear-gradient(90deg, #16a34a, #22c55e)',
    borderRadius: '20px',
  },

  chartArea: {
    height: '300px',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    borderBottom: '3px solid #cbd5e1',
    padding: '20px 30px 0',
  },

  chartColumn: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '8px',
  },

  chartValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#111827',
  },

  chartBar: {
    width: '70px',
    maxHeight: '220px',
    minHeight: '8px',
    borderRadius: '8px 8px 0 0',
  },

  chartLabel: {
    fontWeight: 'bold',
    color: '#334155',
  },

  totalChart: {
    height: '180px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },

  totalChartNumber: {
    fontSize: '72px',
    fontWeight: 'bold',
    color: '#2563eb',
  },

  totalChartLabel: {
    color: '#64748b',
    fontWeight: 'bold',
  },

  tableWrapper: {
    width: '100%',
    overflowX: 'auto',
  },

  table: {
    width: '100%',
    minWidth: '1250px',
    borderCollapse: 'collapse',
  },

  th: {
    background: '#1e3a8a',
    color: '#ffffff',
    padding: '14px 16px',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  },

  td: {
    padding: '14px 16px',
    borderBottom: '1px solid #cbd5e1',
    color: '#1e293b',
    verticalAlign: 'top',
  },

  shiftBadge: {
    color: '#ffffff',
    padding: '6px 10px',
    borderRadius: '15px',
    fontWeight: 'bold',
    display: 'inline-block',
  },

  editButton: {
    background: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '7px',
    padding: '8px 12px',
    cursor: 'pointer',
    fontWeight: 'bold',
    marginRight: '7px',
  },

  deleteButton: {
    background: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '7px',
    padding: '8px 12px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },

  loadingBox: {
    background: '#ffffff',
    padding: '30px',
    borderRadius: '12px',
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#2563eb',
  },

  noData: {
    padding: '25px',
    textAlign: 'center',
    color: '#64748b',
    fontWeight: 'bold',
  },

  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    zIndex: 1000,
  },

  modal: {
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflowY: 'auto',
    background: '#ffffff',
    borderRadius: '15px',
    padding: '28px',
    boxShadow:
      '0 20px 60px rgba(0,0,0,0.3)',
  },

  modalTitle: {
    marginTop: 0,
    color: '#1e3a8a',
  },

  modalButtons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '22px',
  },

  cancelButton: {
    background: '#64748b',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '11px 18px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },

  saveButton: {
    background: '#16a34a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '11px 18px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
}

export default App
