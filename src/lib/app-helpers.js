export const SWIM_LEVELS = ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B', '5']
export const SESSION_STATUSES = ['scheduled', 'rescheduled', 'completed', 'cancelled']

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
