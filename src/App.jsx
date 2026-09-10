import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function App() {
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
  const [notes, setNotes] = useState('')

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
const [performanceLogs, setPerformanceLogs] = useState([])
  const [dashboardLoading, setDashboardLoading] = useState(false)

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
        notes,
      })

    if (error) {
      console.error(error)
      setSubmitMessage(error.message)
      return
    }

    setSubmitMessage('Shift submitted successfully.')
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
    setNotes('')
  }

  async function loadDashboard() {
    if (!profile || !user) return

    if (profile.role !== 'admin') {
      setDashboardLogs([])
      return
    }

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
        notes,
        created_at,
        operator_id,
        profiles(full_name)
      `)
      .eq('date', dashboardDate)
      .order('start_time', { ascending: true })

    if (error) {
      console.error(error)
      setDashboardLogs([])
      setDashboardLoading(false)
      return
    }
async function loadPerformance() {
  if (!profile || !user || profile.role !== 'admin') return

  const { data, error } = await supabase
    .from('shift_logs')
    .select(`
      date,
      shift,
      satellites_tracked
    `)
    .gte('date', performanceStartDate)
    .lte('date', performanceEndDate)

  if (error) {
    console.error(error)
    setPerformanceLogs([])
    return
  }

  setPerformanceLogs(data || [])
}
    setDashboardLogs(data || [])
    setDashboardLoading(false)
  }

  useEffect(() => {
    if (showDashboard && profile?.role === 'admin' && user) {
      loadDashboard()
    }
  }, [showDashboard, dashboardDate, profile, user])

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
      notes: log.notes || '',
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
        notes: editingLog.notes,
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
            {profile?.role === 'admin'
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

      <main style={styles.main}>
        {!showDashboard && (
          <>
            {profile?.role === 'admin' && (
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

            <section style={styles.card}>
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

                  <div>
                    <label style={styles.label}>
                      Notes
                    </label>

                    <textarea
                      style={styles.textarea}
                      value={notes}
                      onChange={(e) =>
                        setNotes(e.target.value)
                      }
                      placeholder="Enter notes..."
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

            {profile?.role !== 'admin' && (
              <div style={styles.operatorMessage}>
                Your shift has been submitted securely.
                Submitted work is visible to Admin only.
              </div>
            )}
          </>
        )}

        {showDashboard &&
          profile?.role === 'admin' && (
            <>
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

                <div>
                  <label style={styles.label}>
                    Selected Date
                  </label>

                  <input
                    style={styles.datePicker}
                    type="date"
                    value={dashboardDate}
                    onChange={(e) =>
                      setDashboardDate(
                        e.target.value
                      )
                    }
                  />
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
<div style={{
  display: 'flex',
  gap: '15px',
  marginBottom: '20px',
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
</div>
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
</section><section style={styles.card}>
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
                      <div
                        style={styles.tableWrapper}
                      >
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              <th style={styles.th}>
                                Shift
                              </th>

                              <th style={styles.th}>
                                Operator
                              </th>

                              <th style={styles.th}>
                                Start
                              </th>

                              <th style={styles.th}>
                                End
                              </th>

                              <th style={styles.th}>
                                Satellites
                              </th>

                              <th style={styles.th}>
                                Condition
                              </th>

                              <th style={styles.th}>
                                Weather
                              </th>

                              <th style={styles.th}>
                                Submitted
                              </th>

                              <th style={styles.th}>
                                Notes
                              </th>

                              <th style={styles.th}>
                                Actions
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {dashboardLogs.map(
                              (log) => (
                                <tr key={log.id}>
                                  <td
                                    style={styles.td}
                                  >
                                    <span
                                      style={{
                                        ...styles.shiftBadge,
                                        background:
                                          log.shift ===
                                          'Morning'
                                            ? '#16a34a'
                                            : log.shift ===
                                              'Day'
                                            ? '#f97316'
                                            : '#9333ea',
                                      }}
                                    >
                                      {log.shift}
                                    </span>
                                  </td>

                                  <td
                                    style={styles.td}
                                  >
                                    <strong>
                                      {log.profiles
                                        ?.full_name ||
                                        '-'}
                                    </strong>
                                  </td>

                                  <td
                                    style={{
                                      ...styles.td,
                                      whiteSpace:
                                        'nowrap',
                                    }}
                                  >
                                    {log.start_time
                                      ? log.start_time.substring(
                                          0,
                                          5
                                        )
                                      : '-'}
                                  </td>

                                  <td
                                    style={{
                                      ...styles.td,
                                      whiteSpace:
                                        'nowrap',
                                    }}
                                  >
                                    {log.end_time
                                      ? log.end_time.substring(
                                          0,
                                          5
                                        )
                                      : '-'}
                                  </td>

                                  <td
                                    style={styles.td}
                                  >
                                    <strong>
                                      {
                                        log.satellites_tracked
                                      }
                                    </strong>
                                  </td>

                                  <td
                                    style={styles.td}
                                  >
                                    {log.station_condition ||
                                      '-'}
                                  </td>

                                  <td
                                    style={styles.td}
                                  >
                                    {log.weather || '-'}
                                  </td>

                                  <td
                                    style={{
                                      ...styles.td,
                                      whiteSpace:
                                        'nowrap',
                                    }}
                                  >
                                    {formatSubmittedTime(
                                      log.created_at
                                    )}
                                  </td>

                                  <td
                                    style={{
                                      ...styles.td,
                                      minWidth: '180px',
                                    }}
                                  >
                                    {log.notes || '-'}
                                  </td>

                                  <td
                                    style={{
                                      ...styles.td,
                                      whiteSpace:
                                        'nowrap',
                                    }}
                                  >
                                    <button
                                      style={
                                        styles.editButton
                                      }
                                      onClick={() =>
                                        startEdit(log)
                                      }
                                    >
                                      Edit
                                    </button>

                                    <button
                                      style={
                                        styles.deleteButton
                                      }
                                      onClick={() =>
                                        deleteLog(
                                          log.id
                                        )
                                      }
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                </>
              )}
            </>
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

              <label style={styles.label}>
                Notes
              </label>

              <textarea
                style={styles.textarea}
                value={editingLog.notes}
                onChange={(e) =>
                  setEditingLog({
                    ...editingLog,
                    notes: e.target.value,
                  })
                }
              />

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
