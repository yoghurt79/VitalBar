import { createMockApi } from './mock'
import type { VitalBarApi } from '../../../shared/types'

export const api: VitalBarApi = window.vitalbar ?? createMockApi()
export const isElectron = Boolean(window.vitalbar)
