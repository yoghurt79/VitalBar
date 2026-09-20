/// <reference types="vite/client" />

import type { VitalBarApi } from '../../shared/types'

declare global {
  interface Window {
    vitalbar?: VitalBarApi
  }
}

export {}
