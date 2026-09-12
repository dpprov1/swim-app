import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import csLogo from './assets/cs-logo-navy.png'
import schoolEagleLogo from './assets/school-eagle-logo.jpeg'
import { SESSION_STATUSES, SWIM_LEVELS, formatStaffName, formatStatus, getAuthErrorMessage, getStudentName, normalizeInviteCode, sortStaffByLastName } from './lib/app-helpers'
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

function getNotificationMessage(notification, studentNames) {
  const studentName = studentNames[notification.session_id]
  if (notification.type === 'checked_in' && studentName) return `${studentName} checked in for today's lesson.`
  if ((notification.type === 'cancelled' || notification.type === 'rescheduled') && studentName) return `${studentName}'s lesson was cancelled/rescheduled.`
  return notification.message || 'There is a new roster update.'
}

function Notifications({ notifications, studentNames, onMarkRead, onClear }) {
  const unreadCount = notifications.filter((notification) => !notification.is_read).length

  return (
    <details className="notifications">
      <summary aria-label={`${unreadCount} unread notifications`}>
        <span className="bell-icon" aria-hidden="true"></span>
        Alerts <span className="notification-count">{unreadCount}</span>
      </summary>
      <div className="notification-list">
        <div className="notification-list-header">
          <strong>Roster alerts</strong>
          {notifications.length > 0 && <button type="button" onClick={onClear}>Clear all</button>}
        </div>
        {notifications.length === 0 && <p className="empty-state">No alerts right now.</p>}
        {notifications.map((notification) => (
          <div className={notification.is_read ? 'notification-item read' : 'notification-item'} key={notification.id}>
            <p>{getNotificationMessage(notification, studentNames)}</p>
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

function InvitePanel({ invites, onCreateInvite, onRevokeInvite, onRemoveInvite, isCreating, revokingId, removingId }) {
  return (
    <section className="invite-panel" aria-labelledby="invite-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Head guard tools</p>
          <h2 id="invite-heading">Invite staff</h2>
        </div>
      </div>
      <p className="section-subcopy">Create a one-time staff invite. The person receives a code they use to set up their account.</p>
      <form className="invite-form" onSubmit={onCreateInvite}>
        <label>
          Staff email
          <input name="email" type="email" required placeholder="instructor@school.edu" title="Add the staff member's email address" />
        </label>
        <label>
          Role
          <select name="role" defaultValue="instructor" title="Choose the staff role tied to this invite">
            <option value="instructor">Instructor</option>
            <option value="head_guard">Head guard</option>
          </select>
        </label>
        <button type="submit" className="save-assignment" disabled={isCreating} title="Create and send a new staff invite" >
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
                {invite.used || (invite.expires_at && new Date(invite.expires_at) <= new Date())
                  ? <button type="button" className="revoke-invite" onClick={() => onRemoveInvite(invite)} disabled={removingId === invite.id} title="Remove this invite from the list">{removingId === invite.id ? 'Removing...' : 'Remove'}</button>
                  : <button type="button" className="revoke-invite" onClick={() => onRevokeInvite(invite)} disabled={revokingId === invite.id} title="Revoke this unused invite">{revokingId === invite.id ? 'Revoking...' : 'Revoke'}</button>}
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
      <p className="section-subcopy">Create the student record before assigning a lesson, level, or instructor.</p>
      <form className="student-form" onSubmit={onCreateStudent}>
        <label>
          Student name
          <input name="full_name" type="text" required placeholder="Student full name" title="Add the student's full name" />
        </label>
        <label>
          Swim level
          <select name="swim_level" defaultValue="" title="Choose a level or leave as unknown if the student has not been assessed yet">
            <option value="">Unknown / not yet assessed</option>
            {SWIM_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
          </select>
        </label>
        <button type="submit" className="save-assignment" disabled={isCreating} title="Create the student profile and save it to the roster">
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
      <p className="section-subcopy">Deactivate/reactivate staff access. Deactivated staff cannot sign in until reactivated; their existing account and email stay reserved.</p>
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
  const [notifications, setNotifications] = useState([])
  const [invites, setInvites] = useState([])
  const [search, setSearch] = useState('')
  const [studentStatusFilter, setStudentStatusFilter] = useState('active')
  const [instructorFilter, setInstructorFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('all')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [savingStudentId, setSavingStudentId] = useState(null)
  const [savingAttendanceId, setSavingAttendanceId] = useState(null)
  const [isCreatingInvite, setIsCreatingInvite] = useState(false)
  const [revokingInviteId, setRevokingInviteId] = useState(null)
  const [removingInviteId, setRemovingInviteId] = useState(null)
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
        supabase.from('notifications').select('id, type, message, session_id, is_read, created_at').order('created_at', { ascending: false }),
      ]
      if (role === 'head_guard') results.push(supabase.from('invites').select('id, email, role, code, used, expires_at, created_at').order('created_at', { ascending: false }))
      const [studentsResult, sessionsResult, staffResult, notificationsResult, invitesResult] = await Promise.all(results)

      if (!isActive) return
      setStudents(studentsResult.data || [])
      setSessions(sessionsResult.data || [])
      setStaff(staffResult.data || [])
      setInstructors(sortStaffByLastName((staffResult.data || []).filter((member) => member.active !== false && (member.role === 'instructor' || member.id === userId))))
      setNotifications(notificationsResult.data || [])
      setInvites(invitesResult?.data || [])
      setError(studentsResult.error || sessionsResult.error || staffResult.error || notificationsResult.error || invitesResult?.error ? 'We could not load the roster.' : '')
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

  const sessionsByStudent = Object.groupBy(sessions, (session) => session.student_id)
  const getCurrentSession = (studentId) => {
    const studentSessions = (sessionsByStudent[studentId] || [])
      .filter((session) => session.status === 'scheduled')
      .slice().sort((firstSession, secondSession) => {
      const firstValue = new Date(`${firstSession.scheduled_date}T${firstSession.scheduled_time || '00:00:00'}`).getTime()
      const secondValue = new Date(`${secondSession.scheduled_date}T${secondSession.scheduled_time || '00:00:00'}`).getTime()
      return secondValue - firstValue
    })

    return studentSessions[0] || null
  }
  const visibleStudents = students
    .filter((student) => role !== 'head_guard' || studentStatusFilter === 'all' || (student.active !== false) === (studentStatusFilter === 'active'))
    .filter((student) => {
      const currentSession = getCurrentSession(student.id)
      return role !== 'head_guard' || instructorFilter === 'all' || currentSession?.instructor_id === instructorFilter
    })
    .filter((student) => {
      const currentSession = getCurrentSession(student.id)
      return role !== 'head_guard' || timeFilter === 'all' || currentSession?.scheduled_time?.slice(0, 5) === timeFilter
    })
    .filter((student) => getStudentName(student).toLowerCase().includes(search.toLowerCase()))
    .sort((firstStudent, secondStudent) => getStudentName(firstStudent).localeCompare(getStudentName(secondStudent)))
  const notificationStudentNames = Object.fromEntries(notifications.map((notification) => {
    const session = sessions.find((currentSession) => currentSession.id === notification.session_id)
    return [notification.session_id, getStudentName(students.find((student) => student.id === session?.student_id) || {})]
  }))

  async function handleAssignmentSubmit(event, studentId, existingSession) {
    event.preventDefault()
    setError('')
    setSavingStudentId(studentId)
    const student = students.find((currentStudent) => currentStudent.id === studentId)
    if (student?.active === false) {
      setError('Inactive students cannot be scheduled. Reactivate the student first.')
      setSavingStudentId(null)
      return
    }
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

    const hasScheduleChanged = existingSession && (
      existingSession.instructor_id !== assignment.instructor_id
      || existingSession.scheduled_date !== assignment.scheduled_date
      || existingSession.scheduled_time?.slice(0, 5) !== assignment.scheduled_time
    )

    let result
    if (hasScheduleChanged) {
      result = await supabase.from('sessions').insert(assignment).select().single()
      if (!result.error) {
        const { error: historyError } = await supabase
          .from('sessions')
          .update({ status: 'cancelled' })
          .eq('id', existingSession.id)

        if (historyError) {
          setError('The new lesson was created, but the previous lesson could not be archived.')
          setSavingStudentId(null)
          return
        }
      }
    } else {
      result = existingSession
        ? await supabase.from('sessions').update(assignment).eq('id', existingSession.id).select().single()
        : await supabase.from('sessions').insert(assignment).select().single()
    }

    if (result.error) {
      setError('We could not save that assignment. Check the required fields and try again.')
    } else {
      setSessions((currentSessions) => {
        if (!existingSession) return [...currentSessions, result.data]
        if (!hasScheduleChanged) return currentSessions.map((session) => session.id === existingSession.id ? result.data : session)
        return [...currentSessions.map((session) => session.id === existingSession.id ? { ...session, status: 'cancelled' } : session), result.data]
      })
    }
    setSavingStudentId(null)
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

  async function handleClearNotifications() {
    setError('')
    const { error: clearError } = await supabase.rpc('clear_my_notifications')
    if (clearError) {
      setError('We could not clear the alerts. Please try again.')
      return
    }
    setNotifications([])
  }

  async function handleCreateInvite(event) {
    event.preventDefault()
    setError('')
    setIsCreatingInvite(true)
    const form = event.currentTarget
    const formData = new FormData(form)
    const email = String(formData.get('email') || '').trim().toLowerCase()
    const role = String(formData.get('role') || 'instructor')

    try {
      const { data, error: functionError } = await supabase.functions.invoke('create-invite', {
        body: { email, role, created_by: userId },
      })

      if (functionError || !data?.invite) {
        setError(data?.message || 'We could not send that invite. Check the email service configuration.')
        setIsCreatingInvite(false)
        return
      }

      setInvites((currentInvites) => [data.invite, ...currentInvites])
      form.reset()
    } catch (error) {
      console.warn('Invite creation failed:', error)
      setError('We could not create that invite. Please try again.')
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

  async function handleRemoveInvite(invite) {
    const alreadyExpired = invite.expires_at && new Date(invite.expires_at) <= new Date()
    const confirmText = alreadyExpired || invite.used
      ? `Remove the invite for ${invite.email} from the list?`
      : `Remove the invite for ${invite.email}?`

    if (!window.confirm(confirmText)) return
    setError('')
    setRemovingInviteId(invite.id)

    const { error: deleteError } = await supabase.rpc('remove_invite', { p_invite_id: invite.id })

    if (deleteError) {
      setError(`We could not remove that invite: ${deleteError.message}`)
    } else {
      setInvites((currentInvites) => currentInvites.filter((currentInvite) => currentInvite.id !== invite.id))
    }
    setRemovingInviteId(null)
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
      if (updates.active === false) {
        const { data: cancelledSessions, error: sessionError } = await supabase
          .from('sessions')
          .update({ status: 'cancelled' })
          .eq('student_id', studentId)
          .eq('status', 'scheduled')
          .select('id')

        if (sessionError) {
          setError('The student was updated, but their scheduled lessons could not be cancelled.')
        } else if (cancelledSessions?.length) {
          const cancelledIds = new Set(cancelledSessions.map((session) => session.id))
          setSessions((currentSessions) => currentSessions.map((session) => cancelledIds.has(session.id) ? { ...session, status: 'cancelled' } : session))
        }
      }
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
            <p className="workspace-helper">
              {role === 'head_guard'
                ? 'Head guard tools: manage the roster, assignments, staff access, and invitation codes.'
                : 'Instructor dashboard: review assigned students and mark attendance.'}
            </p>
          </div>
        </div>
        <div className="header-actions">
          <Notifications notifications={notifications} studentNames={notificationStudentNames} onMarkRead={handleMarkRead} onClear={handleClearNotifications} />
          <button type="button" className="text-button" onClick={onSignOut}>Sign out</button>
        </div>
      </header>
      <section className="roster-section" aria-labelledby="roster-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{role === 'head_guard' ? 'All students' : 'Assigned roster'}</p>
            <h2 id="roster-heading">Lesson roster</h2>
          </div>
          <span className="roster-count">{visibleStudents.length}</span>
        </div>
        <div className="roster-filters">
          <div className="filter-field search-field">
            <label className="search-label" htmlFor="roster-search">Search students</label>
            <input id="roster-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name" title="Filter the roster by student name" />
          </div>
          {role === 'head_guard' && (
            <>
              <div className="filter-field">
                <label htmlFor="student-status-filter">Roster</label>
                <select id="student-status-filter" value={studentStatusFilter} onChange={(event) => setStudentStatusFilter(event.target.value)}>
                  <option value="active">Active students</option>
                  <option value="inactive">Inactive students</option>
                  <option value="all">All students</option>
                </select>
              </div>
              <div className="filter-field">
                <label htmlFor="instructor-filter">Instructor</label>
                <select id="instructor-filter" value={instructorFilter} onChange={(event) => setInstructorFilter(event.target.value)}>
                  <option value="all">All instructors</option>
                  {instructors.map((instructor) => <option key={instructor.id} value={instructor.id}>{formatStaffName(instructor.full_name)}</option>)}
                </select>
              </div>
              <div className="filter-field">
                <label htmlFor="time-filter">Lesson time</label>
                <select id="time-filter" value={timeFilter} onChange={(event) => setTimeFilter(event.target.value)}>
                  <option value="all">All lesson times</option>
                  <option value="13:05">1:05 PM</option>
                  <option value="13:40">1:40 PM</option>
                </select>
              </div>
            </>
          )}
        </div>
        {isLoading && <p className="empty-state">Loading roster...</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {!isLoading && !error && visibleStudents.length === 0 && <p className="empty-state">No students found.</p>}
        <div className="student-list">
          {(['13:05', '13:40', 'unscheduled']).map((slot) => {
            const slotStudents = visibleStudents.filter((student) => {
              const currentSession = getCurrentSession(student.id)
              const studentSlot = currentSession?.scheduled_time?.slice(0, 5) || 'unscheduled'
              return studentSlot === slot
            })

            if (!slotStudents.length) return null

            return (
              <section className="time-slot-group" key={slot}>
                <div className="time-slot-heading">
                  <h3>{slot === '13:05' ? '1:05 PM' : slot === '13:40' ? '1:40 PM' : 'Unscheduled'}</h3>
                  <span>{slotStudents.length} student{slotStudents.length === 1 ? '' : 's'}</span>
                </div>
                {slotStudents.map((student) => {
            const currentSession = getCurrentSession(student.id)

            return (
              <div className="student-entry" key={student.id}>
                <details className="student-record">
                  <summary className="student-row">
                    <div>
                      <h3>{getStudentName(student)}</h3>
                      <p><span className="record-label">Student record</span> {student.swim_level || 'Unknown / not yet assessed'}</p>
                    </div>
                    <span className="student-status">{currentSession ? `${formatStatus(currentSession.status)} · ${formatSession(currentSession)}` : 'No current lesson'}</span>
                  </summary>

                  {role === 'head_guard' && student.active !== false && currentSession && currentSession.status === 'scheduled' && (
                    <div className="attendance-row">
                      <span>Current lesson attendance</span>
                      <button
                        type="button"
                        className={currentSession.student_checked_in_at ? 'attendance-button checked' : 'attendance-button'}
                        onClick={() => handleAttendance(currentSession.id, 'student_checked_in_at')}
                        disabled={Boolean(currentSession.student_checked_in_at) || savingAttendanceId === currentSession.id}
                      >
                        {currentSession.student_checked_in_at ? 'Checked in' : 'Check in'}
                      </button>
                    </div>
                  )}

                  {role === 'head_guard' && student.active !== false && (
                    <form className="assignment-form" onSubmit={(event) => handleAssignmentSubmit(event, student.id, currentSession)}>
                      <div className="assignment-heading">
                        <strong>Current lesson assignment</strong>
                        <span>{currentSession ? 'Change the date or time to create a fresh lesson and reset attendance.' : 'This temporary assignment can be changed without changing the student record.'}</span>
                      </div>
                      <label>
                        Instructor
                        <select name="instructor_id" defaultValue={currentSession?.instructor_id || ''} required>
                          <option value="">Choose instructor</option>
                          {instructors.map((instructor) => (
                            <option key={instructor.id} value={instructor.id}>
                              {formatStaffName(instructor.full_name)}{instructor.id === userId ? ' (you)' : ''}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Date
                        <input name="scheduled_date" type="date" defaultValue={currentSession?.scheduled_date || ''} required />
                      </label>
                      <label>
                        Time
                        <select name="scheduled_time" defaultValue={currentSession?.scheduled_time?.slice(0, 5) || ''} required>
                          <option value="">Choose time</option>
                          <option value="13:05">1:05 PM</option>
                          <option value="13:40">1:40 PM</option>
                        </select>
                      </label>
                      <label>
                        Status
                        <select name="status" defaultValue={currentSession?.status || 'scheduled'}>
                          {SESSION_STATUSES.map((status) => (
                            <option key={status} value={status}>{formatStatus(status)}</option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="submit"
                        className="save-assignment"
                        disabled={savingStudentId === student.id}
                        title={currentSession
                          ? "Update the student's current lesson assignment"
                          : 'Assign a student to an instructor and lesson slot'}
                      >
                        {savingStudentId === student.id ? 'Saving...' : currentSession ? 'Update' : 'Assign'}
                      </button>
                    </form>
                  )}
                  {role === 'head_guard' && student.active === false && (
                    <p className="inactive-student-message">Inactive students cannot be scheduled. Reactivate this student in the permanent record first.</p>
                  )}

                  {role === 'head_guard' && (
                    <details className="student-edit">
                      <summary>Permanent student record</summary>
                      <form onSubmit={(event) => handleStudentUpdate(event, student.id)}>
                        <label>Student name<input name="full_name" defaultValue={student.full_name} required /></label>
                        <label>Swim level<select name="swim_level" defaultValue={student.swim_level || ''} title="Use Unknown if the student has not been assessed yet"><option value="">Unknown / not yet assessed</option>{SWIM_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}</select></label>
                        <label>Parent/guardian name<input name="parent_name" defaultValue={student.parent_name || ''} /></label>
                        <label>Parent/guardian contact<input name="parent_contact" defaultValue={student.parent_contact || ''} /></label>
                        <label className="wide-field">Special information<textarea name="special_info" rows="2" defaultValue={student.special_info || ''} /></label>
                        <label className="active-toggle"><input name="active" type="checkbox" defaultChecked={student.active !== false} /> Active student</label>
                        <button type="submit" className="save-assignment" disabled={savingStudentRecordId === student.id}>{savingStudentRecordId === student.id ? 'Saving...' : 'Save student'}</button>
                        <button type="button" className="delete-student" onClick={() => handleDeleteStudent(student)} disabled={savingStudentRecordId === student.id}>Remove student</button>
                      </form>
                    </details>
                  )}

                </details>
              </div>
            )
                })}
              </section>
            )
          })}
        </div>
      </section>
      {role === 'head_guard' && <InstructorAttendance instructors={instructors} sessions={sessions} userId={userId} onUpdate={handleInstructorAttendance} savingId={savingAttendanceId} />}
      {role === 'head_guard' && <StudentPanel onCreateStudent={handleCreateStudent} isCreating={isCreatingStudent} />}
      {role === 'head_guard' && <StaffPanel staff={staff} userId={userId} onSetActive={handleSetStaffActive} savingId={savingStudentRecordId} />}
      {role === 'head_guard' && <InvitePanel invites={invites} onCreateInvite={handleCreateInvite} onRevokeInvite={handleRevokeInvite} onRemoveInvite={handleRemoveInvite} isCreating={isCreatingInvite} revokingId={revokingInviteId} removingId={removingInviteId} />}
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
      const { data: inviteRole, error: inviteError } = await supabase.rpc('check_invite', {
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

    if (authError) {
      setError(getAuthErrorMessage(authError, authMode))
    }

    if (!authError && authMode === 'signup') {
      if (createdSession) {
        setNotice('Account created. You are signed in.')
      } else {
        setNotice('Account created. Check your email to confirm your account, then sign in.')
      }
    }
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
    </main>
  )
}

export default App
