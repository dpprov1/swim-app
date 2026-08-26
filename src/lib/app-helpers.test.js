import { describe, expect, it } from 'vitest'
import {
  SESSION_STATUSES,
  SWIM_LEVELS,
  formatStatus,
  formatStaffName,
  getStudentName,
  normalizeInviteCode,
  sortStaffByLastName,
} from './app-helpers'

describe('swim level contract', () => {
  it('contains the club levels in order', () => {
    expect(SWIM_LEVELS).toEqual(['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B', '5'])
  })
})

describe('session status contract', () => {
  it('contains only statuses supported by the database', () => {
    expect(SESSION_STATUSES).toEqual(['scheduled', 'rescheduled', 'completed', 'cancelled'])
  })

  it('formats a status for display', () => {
    expect(formatStatus('rescheduled')).toBe('rescheduled')
    expect(formatStatus()).toBe('Unscheduled')
  })
})

describe('roster helpers', () => {
  it('uses the confirmed full name field', () => {
    expect(getStudentName({ full_name: 'Maya Chen' })).toBe('Maya Chen')
    expect(getStudentName({ full_name: '' })).toBe('Unnamed student')
  })

  it('normalizes invite codes before redemption', () => {
    expect(normalizeInviteCode('  ab12cd ')).toBe('AB12CD')
  })

  it('formats and sorts staff by last name', () => {
    expect(formatStaffName('Jordan Avery')).toBe('Avery, Jordan')
    expect(sortStaffByLastName([
      { full_name: 'Jordan Avery' },
      { full_name: 'Morgan Baker' },
    ]).map((member) => member.full_name)).toEqual(['Jordan Avery', 'Morgan Baker'])
  })
})
