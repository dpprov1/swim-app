export const SWIM_LEVELS = ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B', '5']
export const SESSION_STATUSES = ['scheduled', 'cancelled']

export function getStudentName(student) {
  return student.full_name || 'Unnamed student'
}

export function formatStaffName(fullName) {
  const nameParts = fullName.trim().split(/\s+/).filter(Boolean)
  if (nameParts.length < 2) return fullName
  const firstName = nameParts.shift()
  return `${nameParts.join(' ')}, ${firstName}`
}

export function sortStaffByLastName(staff) {
  return [...staff].sort((firstMember, secondMember) =>
    formatStaffName(firstMember.full_name).localeCompare(formatStaffName(secondMember.full_name)),
  )
}

export function formatStatus(status) {
  return status ? status.replace('_', ' ') : 'Unscheduled'
}

export function normalizeInviteCode(code) {
  return code.trim().toUpperCase()
}

export function getAuthErrorMessage(error, mode = 'login') {
  if (!error || !error.message) {
    return mode === 'signup'
      ? 'We could not create your account. Check your details and try again.'
      : 'We could not sign you in. Check your email and password.'
  }

  const message = error.message.toLowerCase()

  if (message.includes('not confirmed') || message.includes('email not confirmed') || message.includes('confirm your email')) {
    return 'Check your email to confirm the account, then sign in.'
  }

  if (message.includes('already registered') || message.includes('user already registered') || message.includes('already exists')) {
    return 'An account already exists for that email.'
  }

  if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
    return 'We could not sign you in. Check your email and password.'
  }

  if (message.includes('invite') || message.includes('code')) {
    return 'That invite code is invalid or expired.'
  }

  return mode === 'signup'
    ? 'We could not create your account. Check your details and try again.'
    : 'We could not sign you in. Check your email and password.'
}
