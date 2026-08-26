import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import csLogo from './assets/cs-logo-navy.png'
import schoolEagleLogo from './assets/school-eagle-logo.jpeg'
import swimEagleLogo from './assets/eagle-logo.png(1).png'
import sunglassesLogo from './assets/sunglasses.png'
import { SESSION_STATUSES, SWIM_LEVELS, formatStaffName, formatStatus, getStudentName, normalizeInviteCode, sortStaffByLastName } from './lib/app-helpers'
import './App.css'

function formatSession(session) {
  if (!session) return 'No lesson assigned'
  const date = new Date(`${session.scheduled_date}T${session.scheduled_time}`)
  if (Number.isNaN(date.getTime())) return 'Lesson time not recorded'
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function formatNoteDate(note) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(note.created_at))
}

function Notifications({ notifications, studentNames, onMarkRead }) {
  const unreadCount = notifications.filter((notification) => !notification.is_read).length

  return (
    <details className="notifications">
      <summary aria-label={`${unreadCount} unread notifications`}>
        <span className="bell-icon" aria-hidden="true"></span>
        Alerts <span className="notification-count">{unreadCount}</span>
      </summary>
      <div className="notification-list">
        {notifications.length === 0 && <p className="empty-state">No alerts yet.</p>}
        {notifications.map((notification) => (
          <div className={notification.is_read ? 'notification-item read' : 'notification-item'} key={notification.id}>
            <p>{notification.type === 'checked_in' && studentNames[notification.session_id] ? `${studentNames[notification.session_id]} has checked in.` : notification.message}</p>
            <span>{formatNoteDate(notification)}</span>
            {!notification.is_read && <button type="button" onClick={() => onMarkRead(notification.id)}>Mark read</button>}
          </div>
        ))}
      </div>
    </details>
  )
}

function InstructorAttendance({ instructors, sessions, userId, onUpdate, savingId }) {
  const today = new Date().toISOString().slice(0, 10)
  const todaySessions = sessions.filter((session) => session.scheduled_date === today)
  const sessionByInstructor = Object.groupBy(todaySessions, (session) => session.instructor_id)

  return (
    <section className="attendance-panel" aria-labelledby="staff-attendance-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Head guard tools</p>
          <h2 id="staff-attendance-heading">Staff attendance</h2>
        </div>
        <span className="attendance-date">{today}</span>
      </div>
      <p className="panel-copy">Mark instructors present for today&apos;s lessons.</p>
      <div className="staff-list">
        {instructors.filter((instructor) => instructor.id !== userId).map((instructor) => {
          const instructorSessions = sessionByInstructor[instructor.id] || []
          const isPresent = instructorSessions.some((session) => session.instructor_checked_in_at)
          return (
            <div className="staff-row" key={instructor.id}>
              <strong>{formatStaffName(instructor.full_name)}</strong>
              <span>{instructorSessions.length ? `${instructorSessions.length} lesson${instructorSessions.length === 1 ? '' : 's'}` : 'No lesson today'}</span>
              <div>
                <button type="button" className={isPresent ? 'attendance-button checked' : 'attendance-button'} onClick={() => onUpdate(instructor.id, instructorSessions, true)} disabled={savingId === instructor.id || !instructorSessions.length}>Present</button>
                <button type="button" className={!isPresent ? 'attendance-button absent' : 'attendance-button'} onClick={() => onUpdate(instructor.id, instructorSessions, false)} disabled={savingId === instructor.id || !instructorSessions.length}>Absent</button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function InvitePanel({ invites, onCreateInvite, onRevokeInvite, isCreating, revokingId }) {
  return (
    <section className="invite-panel" aria-labelledby="invite-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Head guard tools</p>
          <h2 id="invite-heading">Invite staff</h2>
        </div>
      </div>
      <form className="invite-form" onSubmit={onCreateInvite}>
        <label>
          Staff email
          <input name="email" type="email" required placeholder="instructor@school.edu" />
        </label>
        <label>
          Role
          <select name="role" defaultValue="instructor">
            <option value="instructor">Instructor</option>
            <option value="head_guard">Head guard</option>
          </select>
        </label>
        <button type="submit" className="save-assignment" disabled={isCreating}>
          {isCreating ? 'Creating...' : 'Create invite'}
        </button>
      </form>
      <div className="invite-list">
        {invites.map((invite) => (
          <div className="invite-item" key={invite.id}>
            <div>
              <strong>{invite.email}</strong>
              <span>{invite.role === 'head_guard' ? 'Head guard' : 'Instructor'} · {invite.used ? 'Used' : 'Unused'}</span>
            </div>
              <div className="invite-code-actions">
                <code>{invite.code}</code>
                {!invite.used && <button type="button" className="revoke-invite" onClick={() => onRevokeInvite(invite)} disabled={revokingId === invite.id}>{revokingId === invite.id ? 'Revoking...' : 'Revoke'}</button>}
              </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function StudentPanel({ onCreateStudent, isCreating }) {
  return (
    <section className="student-panel" aria-labelledby="student-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Head guard tools</p>
          <h2 id="student-heading">Add a student</h2>
        </div>
      </div>
      <form className="student-form" onSubmit={onCreateStudent}>
        <label>
          Student name
          <input name="full_name" type="text" required placeholder="Student full name" />
        </label>
        <label>
          Swim level
          <select name="swim_level" defaultValue="">
            <option value="">Select level</option>
            {SWIM_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
          </select>
        </label>
        <button type="submit" className="save-assignment" disabled={isCreating}>
          {isCreating ? 'Adding...' : 'Add student'}
        </button>
      </form>
    </section>
  )
}

function StaffPanel({ staff, userId, onSetActive, savingId }) {
  return (
    <section className="staff-management" aria-labelledby="staff-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Head guard tools</p>
          <h2 id="staff-heading">Staff access</h2>
        </div>
      </div>
      <div className="staff-management-list">
        {sortStaffByLastName(staff).map((member) => (
          <div className="staff-management-row" key={member.id}>
            <div><strong>{formatStaffName(member.full_name)}</strong><span>{member.role === 'head_guard' ? 'Head guard' : 'Instructor'} · {member.active === false ? 'Deactivated' : 'Active'}</span></div>
            <button type="button" className={member.active === false ? 'attendance-button checked' : 'attendance-button absent'} onClick={() => onSetActive(member, member.active === false)} disabled={member.id === userId || savingId === member.id}>
              {member.id === userId ? 'You' : member.active === false ? 'Reactivate' : 'Deactivate'}
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

function RosterWorkspace({ role, userId, onSignOut }) {
  const [students, setStudents] = useState([])
  const [sessions, setSessions] = useState([])
  const [instructors, setInstructors] = useState([])
  const [staff, setStaff] = useState([])
  const [notes, setNotes] = useState([])
  const [notifications, setNotifications] = useState([])
  const [invites, setInvites] = useState([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [savingStudentId, setSavingStudentId] = useState(null)
  const [savingNoteStudentId, setSavingNoteStudentId] = useState(null)
  const [savingAttendanceId, setSavingAttendanceId] = useState(null)
  const [isCreatingInvite, setIsCreatingInvite] = useState(false)
  const [revokingInviteId, setRevokingInviteId] = useState(null)
  const [isCreatingStudent, setIsCreatingStudent] = useState(false)
  const [savingStudentRecordId, setSavingStudentRecordId] = useState(null)

  useEffect(() => {
    let isActive = true

    async function loadRoster() {
      const results = [
        role === 'head_guard'
          ? supabase.from('students').select('id, full_name, swim_level, special_info, parent_name, parent_contact, active')
          : supabase.from('instructor_students').select('id, full_name, swim_level, active'),
        supabase.from('sessions').select('id, student_id, instructor_id, scheduled_date, scheduled_time, status, student_checked_in_at, student_checked_in_by, instructor_checked_in_at, instructor_checked_in_by'),
        supabase.from('users').select('id, full_name, role, active'),
        supabase.from('notes').select('id, student_id, author_id, content, created_at').order('created_at', { ascending: false }),
        supabase.from('notifications').select('id, type, message, session_id, is_read, created_at').order('created_at', { ascending: false }),
      ]
      if (role === 'head_guard') results.push(supabase.from('invites').select('id, email, role, code, used, expires_at, created_at').order('created_at', { ascending: false }))
      const [studentsResult, sessionsResult, staffResult, notesResult, notificationsResult, invitesResult] = await Promise.all(results)

      if (!isActive) return
      setStudents(studentsResult.data || [])
      setSessions(sessionsResult.data || [])
      setStaff(staffResult.data || [])
      setInstructors(sortStaffByLastName((staffResult.data || []).filter((member) => member.active !== false && (member.role === 'instructor' || member.id === userId))))
      setNotes(notesResult.data || [])
      setNotifications(notificationsResult.data || [])
      setInvites(invitesResult?.data || [])
      setError(studentsResult.error || sessionsResult.error || staffResult.error || notesResult.error || notificationsResult.error || invitesResult?.error ? 'We could not load the roster.' : '')
      setIsLoading(false)
    }

    loadRoster()
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` }, (payload) => {
        if (isActive) setNotifications((currentNotifications) => [payload.new, ...currentNotifications.filter((notification) => notification.id !== payload.new.id)])
      })
      .subscribe()

    return () => {
      isActive = false
      supabase.removeChannel(channel)
    }
  }, [role, userId])

  const visibleStudents = students.filter((student) =>
    getStudentName(student).toLowerCase().includes(search.toLowerCase()),
  )
  const instructorNames = Object.fromEntries(instructors.map((instructor) => [instructor.id, instructor.full_name]))
  const staffNames = Object.fromEntries(staff.map((member) => [member.id, member.full_name]))
  const sessionsByStudent = Object.groupBy(sessions, (session) => session.student_id)
  const notesByStudent = Object.groupBy(notes, (note) => note.student_id)
  const notificationStudentNames = Object.fromEntries(notifications.map((notification) => {
    const session = sessions.find((currentSession) => currentSession.id === notification.session_id)
    return [notification.session_id, getStudentName(students.find((student) => student.id === session?.student_id) || {})]
  }))

  async function handleAssignmentSubmit(event, studentId, existingSession) {
    event.preventDefault()
    setError('')
    setSavingStudentId(studentId)
    const formData = new FormData(event.currentTarget)
    const scheduledDate = formData.get('scheduled_date')
    const scheduledDay = new Date(`${scheduledDate}T12:00:00`).getDay()
    if (scheduledDay !== 6) {
      setError('Private lessons are scheduled on Saturdays only.')
      setSavingStudentId(null)
      return
    }
    const assignment = {
      student_id: studentId,
      instructor_id: formData.get('instructor_id'),
      scheduled_date: scheduledDate,
      scheduled_time: formData.get('scheduled_time'),
      status: formData.get('status') || 'scheduled',
    }

    const result = existingSession
      ? await supabase.from('sessions').update(assignment).eq('id', existingSession.id).select().single()
      : await supabase.from('sessions').insert(assignment).select().single()

    if (result.error) {
      setError('We could not save that assignment. Check the required fields and try again.')
    } else {
      setSessions((currentSessions) => existingSession
        ? currentSessions.map((session) => session.id === existingSession.id ? result.data : session)
        : [...currentSessions, result.data])
    }
    setSavingStudentId(null)
  }

  async function handleNoteSubmit(event, studentId) {
    event.preventDefault()
    setError('')
    setSavingNoteStudentId(studentId)
    const form = event.currentTarget
    const content = new FormData(form).get('content')
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .insert({ student_id: studentId, author_id: userId, content })
      .select('id, student_id, author_id, content, created_at')
      .single()

    if (noteError) {
      setError('We could not save that note. Please try again.')
    } else {
      setNotes((currentNotes) => [note, ...currentNotes])
      form.reset()
    }
    setSavingNoteStudentId(null)
  }

  async function handleMarkRead(notificationId) {
    const { error: markReadError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    if (markReadError) {
      setError('We could not mark that alert as read.')
      return
    }
    setNotifications((currentNotifications) => currentNotifications.map((notification) => notification.id === notificationId ? { ...notification, is_read: true } : notification))
  }

  async function handleDeleteNote(noteId) {
    setError('')
    const { error: deleteError } = await supabase.from('notes').delete().eq('id', noteId)
    if (deleteError) {
      setError('We could not delete that note.')
      return
    }
    setNotes((currentNotes) => currentNotes.filter((note) => note.id !== noteId))
  }

  async function handleCreateInvite(event) {
    event.preventDefault()
    setError('')
    setIsCreatingInvite(true)
    const form = event.currentTarget
    const formData = new FormData(form)
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .insert({ email: formData.get('email'), role: formData.get('role'), created_by: userId })
      .select('id, email, role, code, used, expires_at, created_at')
      .single()

    if (inviteError) {
      setError('We could not create that invite. The email may already have an active invite.')
    } else {
      setInvites((currentInvites) => [invite, ...currentInvites])
      form.reset()
    }
    setIsCreatingInvite(false)
  }

  async function handleRevokeInvite(invite) {
    if (!window.confirm(`Revoke the invite for ${invite.email}?`)) return
    setError('')
    setRevokingInviteId(invite.id)
    const { error: revokeError } = await supabase.rpc('revoke_invite', { p_invite_id: invite.id })
    if (revokeError) setError(`We could not revoke that invite: ${revokeError.message}`)
    else setInvites((currentInvites) => currentInvites.filter((currentInvite) => currentInvite.id !== invite.id))
    setRevokingInviteId(null)
  }

  async function handleSetStaffActive(member, active) {
    setError('')
    setSavingStudentRecordId(member.id)
    const { error: staffError } = await supabase.rpc('set_staff_active', { p_user_id: member.id, p_active: active })
    if (staffError) {
      setError(`We could not update staff access: ${staffError.message}`)
    } else {
      setStaff((currentStaff) => currentStaff.map((currentMember) => currentMember.id === member.id ? { ...currentMember, active } : currentMember))
      setInstructors((currentInstructors) => sortStaffByLastName(currentInstructors.filter((currentMember) => currentMember.id !== member.id || active)))
    }
    setSavingStudentRecordId(null)
  }

  async function handleCreateStudent(event) {
    event.preventDefault()
    setError('')
    setIsCreatingStudent(true)
    const form = event.currentTarget
    const formData = new FormData(form)
    const { data: student, error: studentError } = await supabase
      .from('students')
      .insert({
        full_name: formData.get('full_name'),
        swim_level: formData.get('swim_level') || null,
        created_by: userId,
      })
      .select('id, full_name, swim_level, active')
      .single()

    if (studentError) {
      setError('We could not add that student. Please try again.')
    } else {
      setStudents((currentStudents) => [...currentStudents, student])
      form.reset()
    }
    setIsCreatingStudent(false)
  }

  async function handleStudentUpdate(event, studentId) {
    event.preventDefault()
    setError('')
    setSavingStudentRecordId(studentId)
    const formData = new FormData(event.currentTarget)
    const updates = {
      full_name: formData.get('full_name'),
      swim_level: formData.get('swim_level') || null,
      special_info: formData.get('special_info') || null,
      parent_name: formData.get('parent_name') || null,
      parent_contact: formData.get('parent_contact') || null,
      active: formData.get('active') === 'on',
    }
    const { data: updatedStudent, error: studentError } = await supabase
      .from('students')
      .update(updates)
      .eq('id', studentId)
      .select('id, full_name, swim_level, special_info, parent_name, parent_contact, active')
      .single()

    if (studentError) {
      setError('We could not update that student. Please try again.')
    } else {
      setStudents((currentStudents) => currentStudents.map((student) => student.id === studentId ? updatedStudent : student))
    }
    setSavingStudentRecordId(null)
  }

  async function handleDeleteStudent(student) {
    if (!window.confirm(`Remove ${student.full_name} and their lesson records?`)) return
    setError('')
    setSavingStudentRecordId(student.id)
    const { error: deleteError } = await supabase.rpc('delete_student', { p_student_id: student.id })

    if (deleteError) {
      setError(`We could not remove that student: ${deleteError.message}`)
    } else {
      setStudents((currentStudents) => currentStudents.filter((currentStudent) => currentStudent.id !== student.id))
      setSessions((currentSessions) => currentSessions.filter((session) => session.student_id !== student.id))
      setNotes((currentNotes) => currentNotes.filter((note) => note.student_id !== student.id))
    }
    setSavingStudentRecordId(null)
  }

  async function handleInstructorAttendance(instructorId, instructorSessions, isPresent) {
    if (!instructorSessions.length) return
    setError('')
    setSavingAttendanceId(instructorId)
    const sessionIds = instructorSessions.map((session) => session.id)
    const attendance = isPresent
      ? { instructor_checked_in_at: new Date().toISOString(), instructor_checked_in_by: userId }
      : { instructor_checked_in_at: null, instructor_checked_in_by: null }
    const { data: updatedSessions, error: attendanceError } = await supabase
      .from('sessions')
      .update(attendance)
      .in('id', sessionIds)
      .select('id, student_id, instructor_id, scheduled_date, scheduled_time, status, student_checked_in_at, student_checked_in_by, instructor_checked_in_at, instructor_checked_in_by')

    if (attendanceError) setError('We could not update staff attendance. Please try again.')
    else setSessions((currentSessions) => currentSessions.map((session) => updatedSessions.find((updatedSession) => updatedSession.id === session.id) || session))
    setSavingAttendanceId(null)
  }

  async function handleAttendance(sessionId, field) {
    setError('')
    setSavingAttendanceId(sessionId)
    const { data: updatedSession, error: attendanceError } = await supabase
      .from('sessions')
      .update({ [field]: new Date().toISOString(), [`${field.replace('_at', '_by')}`]: userId })
      .eq('id', sessionId)
      .select('id, student_id, instructor_id, scheduled_date, scheduled_time, status, student_checked_in_at, student_checked_in_by, instructor_checked_in_at, instructor_checked_in_by')
      .single()

    if (attendanceError) {
      setError('We could not record attendance. Please try again.')
    } else {
      setSessions((currentSessions) => currentSessions.map((session) => session.id === sessionId ? updatedSession : session))
      const { data: refreshedNotifications } = await supabase
        .from('notifications')
        .select('id, type, message, session_id, is_read, created_at')
        .order('created_at', { ascending: false })
      if (refreshedNotifications) setNotifications((currentNotifications) => {
        const notificationMap = new Map(currentNotifications.map((notification) => [notification.id, notification]))
        refreshedNotifications.forEach((notification) => notificationMap.set(notification.id, notification))
        return [...notificationMap.values()].sort((first, second) => new Date(second.created_at) - new Date(first.created_at))
      })
    }
    setSavingAttendanceId(null)
  }

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <div className="workspace-identity">
          <div className="roster-logo-frame">
            <img className="school-logo roster-logo" src={csLogo} alt="Carl Sandburg logo" />
          </div>
          <div>
            <p className="eyebrow">Carl Sandburg Swim Guard</p>
            <h1>{role === 'head_guard' ? 'Roster desk' : 'Your students'}</h1>
          </div>
        </div>
        <div className="header-actions">
          <Notifications notifications={notifications} studentNames={notificationStudentNames} onMarkRead={handleMarkRead} />
          <button type="button" className="text-button" onClick={onSignOut}>Sign out</button>
        </div>
      </header>
      <section className="roster-section" aria-labelledby="roster-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{role === 'head_guard' ? 'All students' : 'Assigned roster'}</p>
            <h2 id="roster-heading">Lesson roster</h2>
          </div>
          <span className="roster-count">{students.length}</span>
        </div>
        <label className="search-label" htmlFor="roster-search">Search students</label>
        <input id="roster-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name" />
        {isLoading && <p className="empty-state">Loading roster...</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {!isLoading && !error && visibleStudents.length === 0 && <p className="empty-state">No students found.</p>}
        <div className="student-list">
          {visibleStudents.map((student) => (
            <div className="student-entry" key={student.id}>
              <details className="student-record">
                <summary className="student-row">
                <div>
                  <h3>{getStudentName(student)}</h3>
                  <p>{student.swim_level || 'Level not recorded'} · {formatSession(sessionsByStudent[student.id]?.[0])}</p>
                </div>
                <span className="student-status">{instructorNames[sessionsByStudent[student.id]?.[0]?.instructor_id] || (student.active ? 'Unassigned' : 'Inactive')} · {formatStatus(sessionsByStudent[student.id]?.[0]?.status)}</span>
                </summary>
              {role === 'head_guard' && sessionsByStudent[student.id]?.[0] && (
                <div className="attendance-row">
                  <span>Student attendance</span>
                  <button
                    type="button"
                    className={sessionsByStudent[student.id][0].student_checked_in_at ? 'attendance-button checked' : 'attendance-button'}
                    onClick={() => handleAttendance(sessionsByStudent[student.id][0].id, 'student_checked_in_at')}
                    disabled={Boolean(sessionsByStudent[student.id][0].student_checked_in_at) || savingAttendanceId === sessionsByStudent[student.id][0].id}
                  >
                    {sessionsByStudent[student.id][0].student_checked_in_at ? 'Checked in' : 'Check in'}
                  </button>
                </div>
              )}
              {role === 'head_guard' && (
                <form className="assignment-form" onSubmit={(event) => handleAssignmentSubmit(event, student.id, sessionsByStudent[student.id]?.[0])}>
                  <label>
                    Instructor
                    <select name="instructor_id" defaultValue={sessionsByStudent[student.id]?.[0]?.instructor_id || ''} required>
                      <option value="">Choose instructor</option>
                      {instructors.map((instructor) => <option key={instructor.id} value={instructor.id}>{formatStaffName(instructor.full_name)}{instructor.id === userId ? ' (you)' : ''}</option>)}
                    </select>
                  </label>
                  <label>
                    Date
                    <input name="scheduled_date" type="date" defaultValue={sessionsByStudent[student.id]?.[0]?.scheduled_date || ''} required />
                  </label>
                  <label>
                    Time
                    <select name="scheduled_time" defaultValue={sessionsByStudent[student.id]?.[0]?.scheduled_time?.slice(0, 5) || ''} required>
                      <option value="">Choose time</option>
                      <option value="13:05">1:05 PM</option>
                      <option value="13:40">1:40 PM</option>
                    </select>
                  </label>
                  <label>
                    Status
                    <select name="status" defaultValue={sessionsByStudent[student.id]?.[0]?.status || 'scheduled'}>
                      {SESSION_STATUSES.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
                    </select>
                  </label>
                  <button type="submit" className="save-assignment" disabled={savingStudentId === student.id}>
                    {savingStudentId === student.id ? 'Saving...' : sessionsByStudent[student.id]?.[0] ? 'Update' : 'Assign'}
                  </button>
                </form>
              )}
              {role === 'head_guard' && (
                <details className="student-edit">
                  <summary>Edit student record</summary>
                  <form onSubmit={(event) => handleStudentUpdate(event, student.id)}>
                    <label>Student name<input name="full_name" defaultValue={student.full_name} required /></label>
                    <label>Swim level<select name="swim_level" defaultValue={student.swim_level || ''}><option value="">Select level</option>{SWIM_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}</select></label>
                    <label>Parent/guardian name<input name="parent_name" defaultValue={student.parent_name || ''} /></label>
                    <label>Parent/guardian contact<input name="parent_contact" defaultValue={student.parent_contact || ''} /></label>
                    <label className="wide-field">Special information<textarea name="special_info" rows="2" defaultValue={student.special_info || ''} /></label>
                    <label className="active-toggle"><input name="active" type="checkbox" defaultChecked={student.active !== false} /> Active student</label>
                    <button type="submit" className="save-assignment" disabled={savingStudentRecordId === student.id}>{savingStudentRecordId === student.id ? 'Saving...' : 'Save student'}</button>
                    <button type="button" className="delete-student" onClick={() => handleDeleteStudent(student)} disabled={savingStudentRecordId === student.id}>Remove student</button>
                  </form>
                </details>
              )}
              <div className="notes-panel">
                <p className="notes-heading">Notes</p>
                {(notesByStudent[student.id] || []).map((note) => (
                  <div className="note-item" key={note.id}>
                    <p>{note.content}</p>
                    <span>{staffNames[note.author_id] || 'Staff member'} · {formatNoteDate(note)}</span>
                    {(role === 'head_guard' || note.author_id === userId) && <button type="button" onClick={() => handleDeleteNote(note.id)}>Delete note</button>}
                  </div>
                ))}
                <form className="note-form" onSubmit={(event) => handleNoteSubmit(event, student.id)}>
                  <label htmlFor={`note-${student.id}`}>Add a note</label>
                  <textarea id={`note-${student.id}`} name="content" rows="2" required placeholder="Record a lesson update..." />
                  <button type="submit" className="save-assignment" disabled={savingNoteStudentId === student.id}>
                    {savingNoteStudentId === student.id ? 'Saving...' : 'Add note'}
                  </button>
                </form>
              </div>
              </details>
            </div>
          ))}
        </div>
      </section>
      {role === 'head_guard' && <InstructorAttendance instructors={instructors} sessions={sessions} userId={userId} onUpdate={handleInstructorAttendance} savingId={savingAttendanceId} />}
      {role === 'head_guard' && <StudentPanel onCreateStudent={handleCreateStudent} isCreating={isCreatingStudent} />}
      {role === 'head_guard' && <StaffPanel staff={staff} userId={userId} onSetActive={handleSetStaffActive} savingId={savingStudentRecordId} />}
      {role === 'head_guard' && <InvitePanel invites={invites} onCreateInvite={handleCreateInvite} onRevokeInvite={handleRevokeInvite} isCreating={isCreatingInvite} revokingId={revokingInviteId} />}
    </main>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [profileError, setProfileError] = useState('')
  const [isLoading, setIsLoading] = useState(() => Boolean(supabase))
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)

  useEffect(() => {
    if (!supabase) return undefined

    let isActive = true

    async function syncSession(currentSession) {
      if (!isActive) return
      setSession(currentSession)

      if (!currentSession) {
        setProfile(null)
        setProfileError('')
        setIsProfileLoading(false)
        setIsLoading(false)
        return
      }

      setIsProfileLoading(true)
      const { data: currentProfile, error: currentProfileError } = await supabase
        .from('users')
        .select('role, active')
        .eq('id', currentSession.user.id)
        .single()

      if (!isActive) return
      setProfile(currentProfile)
      setProfileError(currentProfileError ? 'We could not load your account role.' : '')
      setIsProfileLoading(false)
      setIsLoading(false)
    }

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      syncSession(currentSession)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => syncSession(nextSession),
    )

    return () => {
      isActive = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setIsSigningIn(true)

    let authError
    let createdSession

    if (authMode === 'signup') {
      const { data: inviteRole, error: inviteError } = await supabase.rpc('redeem_invite', {
        p_email: email.trim().toLowerCase(),
        p_code: normalizeInviteCode(inviteCode),
      })

      if (inviteError || !inviteRole) {
        setError('That invite code is invalid or expired.')
        setIsSigningIn(false)
        return
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { full_name: fullName.trim(), role: inviteRole } },
      })
      authError = signUpError
      createdSession = signUpData.session
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      authError = signInError
    }

    if (authError) setError(authMode === 'signup' ? 'We could not create your account. Check your details and try again.' : 'We could not sign you in. Check your email and password.')
    if (!authError && authMode === 'signup' && !createdSession) setNotice('Account created. Check your email to confirm your account, then sign in.')
    setIsSigningIn(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  if (isLoading) return <main className="auth-shell"><p>Loading Swim Club...</p></main>

  if (session && (isProfileLoading || isLoading)) {
    return <main className="auth-shell"><p>Loading your workspace...</p></main>
  }

  if (session && profileError) {
    return (
      <main className="auth-shell">
        <section className="welcome-panel" aria-labelledby="profile-error-heading">
          <p className="eyebrow">Carl Sandburg Swim Guard</p>
          <h1 id="profile-error-heading">Access unavailable.</h1>
          <p className="panel-copy">{profileError}</p>
          <button type="button" className="text-button" onClick={handleSignOut}>
            Sign out
          </button>
        </section>
      </main>
    )
  }

  if (session && (profile?.active === false || (profile?.role !== 'head_guard' && profile?.role !== 'instructor'))) {
    return (
      <main className="auth-shell">
        <section className="welcome-panel" aria-labelledby="unauthorized-heading">
          <p className="eyebrow">Carl Sandburg Swim Guard</p>
          <h1 id="unauthorized-heading">Access unavailable.</h1>
          <p className="panel-copy">Your account is inactive or does not have an active club role.</p>
          <button type="button" className="text-button" onClick={handleSignOut}>
            Sign out
          </button>
        </section>
      </main>
    )
  }

  if (session) {
    return <RosterWorkspace role={profile.role} userId={session.user.id} onSignOut={handleSignOut} />
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="auth-shell">
        <section className="welcome-panel" aria-labelledby="config-heading">
          <p className="eyebrow">Swim Club</p>
          <h1 id="config-heading">Connect your workspace.</h1>
          <p className="panel-copy">Add the Supabase values from <code>.env.example</code> to begin.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="auth-shell">
      <section className="login-panel" aria-labelledby="login-heading">
        <div className="login-logos">
          <img className="eagle-logo" src={schoolEagleLogo} alt="Carl Sandburg eagle mascot" />
        </div>
        <p className="eyebrow">Carl Sandburg Swim Guard</p>
        <h1 id="login-heading">{authMode === 'login' ? 'Welcome back.' : 'Join the guard.'}</h1>
        <p className="panel-copy">{authMode === 'login' ? "Sign in to manage today's lessons and roster." : 'Use the invite from your head guard to create your account.'}</p>
        <form onSubmit={handleSubmit}>
          {authMode === 'signup' && (
            <>
              <label htmlFor="full-name">Full name</label>
              <input id="full-name" type="text" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
              <label htmlFor="invite-code">Invite code</label>
              <input id="invite-code" type="text" inputMode="text" autoComplete="one-time-code" maxLength="6" value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} required />
            </>
          )}
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <div className="password-label-row">
            <label htmlFor="password">Password</label>
            <button type="button" className="password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-pressed={showPassword}>
              {showPassword ? 'Hide password' : 'Show password'}
            </button>
          </div>
          <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="form-notice" role="status">{notice}</p>}
          <button type="submit" className="submit-button" disabled={isSigningIn}>
            {isSigningIn ? 'Working...' : authMode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <button type="button" className="mode-button" onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setError(''); setNotice('') }}>
          {authMode === 'login' ? 'Have an invite? Create an account' : 'Already have an account? Sign in'}
        </button>
        <p className="invite-note">Accounts are created by invitation only.</p>
      </section>
      <div className="mascot-sticky trunks-sticky" aria-hidden="true">
        <img src={swimEagleLogo} alt="" />
      </div>
      <div className="mascot-sticky sunglasses-sticky" aria-hidden="true">
        <img src={sunglassesLogo} alt="" />
      </div>
    </main>
  )
}

export default App
